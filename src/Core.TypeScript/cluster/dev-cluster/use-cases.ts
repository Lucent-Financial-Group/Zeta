import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ciliumK3dValues, readCiliumValueSurfaces, renderValuesYaml } from "../cilium-kind-lane.ts";
import type { DevClusterPorts } from "../ports.ts";
import {
  buildDevAdminSecretManifest,
  buildDevRegistryPullSecretManifest,
  DEV_BOOTSTRAP_SECRETS,
  DEV_GHCR_PULL_SECRET,
  devStorageAliasManifestPath,
  resolveRegistryToken,
} from "./lib.ts";

/**
 * Apply the dev/CI alias StorageClasses, BEFORE the app-of-apps root syncs.
 *
 * Order is load-bearing: a PVC created by a synced Application before its class
 * exists sits `Pending` and only a `WaitForFirstConsumer` retry saves it. Both
 * aliases bind to `rancher.io/local-path`, the provisioner kind and k3s already
 * run -- this declares NAMES, never a second provisioner Deployment.
 *
 * Shared by the kind and k3d bring-ups on purpose. `isExcludedFromIncludedProof`
 * is provider-independent, so if only one provider created the `longhorn` alias
 * the harness would assert longhorn-backed Applications on a substrate that
 * cannot bind them, and they would hang `Pending` instead of failing.
 *
 * EXPORTED because `apply-root-app.ts` is a THIRD entrypoint that applies the
 * root catalogue without going through either bring-up. Left alone it would
 * sync longhorn-backed Applications into a cluster with no such class -- the
 * same hazard, reached by a door the bring-up falsifiers do not watch.
 */
export function applyDevStorageClassAliases(ports: DevClusterPorts): void {
  console.log("Ensuring dev/CI alias StorageClasses (zeta-local-path, longhorn) ...");
  ports.controlPlane.applyFileManifest(devStorageAliasManifestPath("zetaLocalPath"));
  ports.controlPlane.applyFileManifest(devStorageAliasManifestPath("longhorn"));
}

/**
 * Mint the dev/CI credentials that Applications expect to find ALREADY PRESENT,
 * BEFORE the app-of-apps root syncs.
 *
 * TWO Secrets today, both listed in `DEV_BOOTSTRAP_SECRETS`, both for the same
 * structural reason: the Application deliberately does not let its chart invent
 * an admin password (so none is committed here), and nothing in the dev lane
 * ever supplied one.
 *
 *   `monitoring/grafana-admin-credentials` -- kube-prometheus-stack points
 *      Grafana at `grafana.admin.existingSecret`. Without it Grafana sat in
 *      `CreateContainerConfigError` (`secret "grafana-admin-credentials" not
 *      found`) while the rest of the Application -- prometheus and
 *      alertmanager, both on bound PVCs -- ran 2/2.
 *   `openziti/ziti-admin-credentials` -- ziti-controller reads `admin-user` /
 *      `admin-password` by `secretKeyRef` because the Application sets
 *      `useCustomAdminSecret: true`. Its chart's generated fallback is guarded
 *      off by that same value, and turning the fallback back on is NOT the
 *      cheaper fix: it renders a fresh random password on every `helm template`
 *      (ArgoCD's repo-server has no cluster for the chart's `lookup` to hit),
 *      which under `selfHeal: true` rotates the credential forever. See
 *      `DEV_ZITI_ADMIN_SECRET` for the measurement.
 *
 * ORDER IS LOAD-BEARING for the same reason the StorageClass aliases are:
 * kubelet resolves `envFrom`/`env.valueFrom` at container-create time and a
 * missing Secret is a hard config error, so the Secret has to exist before the
 * Application that consumes it syncs.
 *
 * `ensureNamespace` IS NOT INCIDENTAL for `openziti`. trust-manager's trust
 * namespace is now that namespace, and its Role over Secrets is created there
 * at sync-wave -45 -- forty-five waves before `oz` would have created it with
 * `CreateNamespace=true`. So this call is also what keeps trust-manager's own
 * sync from failing in the dev lane. On metal the same job is done declaratively
 * by `k8s/bootstrap/openziti-namespace.yaml`.
 *
 * THE PASSWORDS ARE DRAWN FRESH PER CLUSTER, never committed and never printed.
 * A well-known constant would also have worked and would have been simpler; a
 * drawn one cannot be promoted to a real deployment by anybody copying it,
 * because there is nothing to copy. This is the ONLY place entropy enters --
 * `buildDevAdminSecretManifest` is pure and takes the value.
 *
 * AND IT IS IDEMPOTENT BY ASKING FIRST, PER SECRET. Re-running a bring-up
 * against a cluster that already exists is a supported path (both bring-ups say
 * so), and a bare apply would rotate an admin password every time.
 * `resourceExists` makes the second run a no-op for each Secret independently,
 * so a cluster holding one and missing the other converges rather than
 * re-rolling the one it already had.
 *
 * EXPORTED for the same reason `applyDevStorageClassAliases` is: `apply-root-app.ts`
 * is a third door into the root catalogue that neither bring-up guards.
 */
export function applyDevBootstrapSecrets(ports: DevClusterPorts): void {
  for (const spec of DEV_BOOTSTRAP_SECRETS) {
    const { namespace, name } = spec;
    const ref = `secret/${name}`;
    ports.controlPlane.ensureNamespace(namespace);
    if (ports.controlPlane.resourceExists(ref, namespace)) {
      console.log(`Dev/CI credential ${namespace}/${name} already present; leaving it alone.`);
      continue;
    }
    console.log(`Minting dev/CI credential ${namespace}/${name} (value is per-cluster and never logged) ...`);
    ports.controlPlane.applyInlineManifest(buildDevAdminSecretManifest(spec, randomBytes(24).toString("base64url")));
  }
}

/**
 * Mint the dev/CI registry pull credential, IF this environment has a token to
 * mint it from.
 *
 * SEPARATE FROM `applyDevBootstrapSecrets` BECAUSE IT CAN LEGITIMATELY DO
 * NOTHING, and that difference is the whole design. The admin credentials are
 * drawn from entropy, so their mint always succeeds and a skip would be a bug.
 * This one needs a token GHCR will honour, and a bring-up on a laptop that has
 * no such token is a normal, supported state -- so the honest outcomes are
 * MINTED or SKIPPED-AND-SAID-SO, never "minted something that will not work".
 *
 * THE THIRD OUTCOME IS THE ONE THIS EXISTS TO REFUSE. A Secret containing an
 * empty or whitespace token is strictly worse than no Secret at all: the
 * kubelet finds it, uses it, GHCR rejects it, and the pod lands in
 * ImagePullBackOff -- the SAME symptom as no credential, with an object sitting
 * in the namespace that makes it look like the credential half is done.
 * `resolveRegistryToken` treats whitespace-only as absent for exactly that
 * reason, and this function skips rather than mints when it returns null.
 *
 * WHAT MAKES THE SKIP SAFE RATHER THAN SILENT: `platform` is currently in
 * `DEFAULT_ROOT_DEV_CATALOG.excludeGlob`, so a cluster without this Secret
 * simply never syncs the Application that needs it. When that deferral lifts,
 * `assertDevRegistryPullSecretPresent` in `argocd-health-test.ts` refuses the
 * run in seconds and NAMES this Secret -- so the skip becomes a loud failure at
 * the moment, and only at the moment, it starts to matter.
 *
 * IDEMPOTENT BY ASKING FIRST, like the admin mint. Re-running a bring-up must
 * not churn a working credential.
 */
export function applyDevRegistryPullSecret(
  ports: DevClusterPorts,
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const spec = DEV_GHCR_PULL_SECRET;
  const { namespace, name, registry, tokenEnvVars } = spec;
  const token = resolveRegistryToken(spec, env);
  if (token === null) {
    console.log(
      `No ${registry} token in this environment (looked at ${tokenEnvVars.join(", ")}); ` +
        `NOT minting ${namespace}/${name}. A Secret holding an empty token is indistinguishable ` +
        `in-cluster from a real one that lacks permission, so none is created. Applications whose ` +
        `images live in ${registry} will not start in this cluster.`,
    );
    return;
  }
  const ref = `secret/${name}`;
  ports.controlPlane.ensureNamespace(namespace);
  if (ports.controlPlane.resourceExists(ref, namespace)) {
    console.log(`Dev/CI registry credential ${namespace}/${name} already present; leaving it alone.`);
    return;
  }
  const username = env[spec.userEnvVar]?.trim() || spec.defaultUser;
  console.log(`Minting dev/CI registry credential ${namespace}/${name} (token is never logged) ...`);
  ports.controlPlane.applyInlineManifest(buildDevRegistryPullSecretManifest(spec, username, token));
}

export interface KindCiBringUpOptions {
  readonly configPath: string;
  readonly clusterName: string;
  readonly gitRef: string;
  readonly gitRepoUrl: string;
  /**
   * The environment the registry pull credential is sourced from.
   *
   * DECLARED rather than ambient (manifesto §13 noninterference): this value
   * decides whether `applyDevRegistryPullSecret` MINTS OR SKIPS, so a bring-up
   * reading `process.env` directly would take a different code path depending on
   * whether the host happened to export `GITHUB_TOKEN` -- and the falsifiers in
   * `use-cases.test.ts` would pass or fail on the same commit for the same
   * reason. Entropy for the admin passwords is still drawn ambiently, and that
   * is not the same thing: a drawn value changes what is IN a manifest, this
   * changes WHETHER THERE IS ONE.
   */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface K3dDevBringUpOptions {
  readonly configPath: string;
  readonly clusterName: string;
  readonly agentCount: number;
  readonly kubeApiHost: string;
  readonly gitRef: string;
  readonly gitRepoUrl: string;
  /**
   * The environment the registry pull credential is sourced from.
   *
   * DECLARED rather than ambient (manifesto §13 noninterference): this value
   * decides whether `applyDevRegistryPullSecret` MINTS OR SKIPS, so a bring-up
   * reading `process.env` directly would take a different code path depending on
   * whether the host happened to export `GITHUB_TOKEN` -- and the falsifiers in
   * `use-cases.test.ts` would pass or fail on the same commit for the same
   * reason. Entropy for the admin passwords is still drawn ambiently, and that
   * is not the same thing: a drawn value changes what is IN a manifest, this
   * changes WHETHER THERE IS ONE.
   */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export function bringUpKindCiCluster(ports: DevClusterPorts, options: KindCiBringUpOptions): void {
  const { localCluster, controlPlane, packages, appCatalog } = ports;
  const context = localCluster.contextName(options.clusterName);

  if (localCluster.list().includes(options.clusterName)) {
    console.log(
      `Cluster ${options.clusterName} already exists. Use bun src/Core.TypeScript/cluster/dev-cluster/kind-down.ts --cluster-name ${options.clusterName} to recreate.`,
    );
  } else {
    console.log(`Creating kind cluster ${options.clusterName} ...`);
    localCluster.create({ name: options.clusterName, configPath: options.configPath, waitForReady: true, waitTimeoutSec: 180 });
  }

  controlPlane.selectContext(context);
  controlPlane.waitForAllNodesReady(180);

  console.log("Installing Gateway API CRDs (cert-manager enableGatewayAPI on kind/k3d) ...");
  controlPlane.applyRemoteManifest(
    "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml",
    true,
  );

  applyDevStorageClassAliases(ports);
  applyDevBootstrapSecrets(ports);
  applyDevRegistryPullSecret(ports, options.env ?? process.env);

  if (!packages.releaseInstalled("argocd", "argocd")) {
    console.log("Installing ArgoCD ...");
    controlPlane.ensureNamespace("argocd");
    packages.addRepo("argo", "https://argoproj.github.io/argo-helm");
    packages.updateRepo("argo");
    packages.install({
      release: "argocd",
      chart: "argo/argo-cd",
      version: "7.7.10",
      namespace: "argocd",
      setValues: ["server.service.type=ClusterIP"],
      wait: true,
    });
  }

  controlPlane.waitForCrdEstablished("applications.argoproj.io", 120);
  appCatalog.applyRootDevCatalog(options.gitRef, options.gitRepoUrl);
}

export function tearDownKindCluster(ports: DevClusterPorts, clusterName: string): void {
  if (ports.localCluster.list().includes(clusterName)) {
    console.log(`Deleting kind cluster ${clusterName} ...`);
    ports.localCluster.delete(clusterName);
  } else {
    console.log(`Kind cluster ${clusterName} not present.`);
  }
}

/**
 * Point k3d's CoreDNS at a REACHABLE upstream resolver.
 *
 * MEASURED 2026-08-31, and this is the whole reason the k3d lane could not
 * reconcile an App-of-Apps. `argocd-repo-server` failed every fetch with:
 *
 *     fatal: unable to access 'https://github.com/.../Zeta.git/':
 *     Could not resolve host: github.com
 *
 * so ArgoCD could never render, produced ZERO child Applications, and the
 * harness timed out waiting for one. The root Application sat `sync=Unknown`
 * (a ComparisonError) while reporting `health=Healthy`, which is why this took
 * three runs to see.
 *
 * THE MECHANISM, read off the cluster rather than guessed. k3s's shipped
 * Corefile ends with:
 *
 *     import /etc/coredns/custom/*.override
 *     forward . /etc/resolv.conf
 *
 * A k3d "node" is a Docker container, so that /etc/resolv.conf names Docker's
 * embedded resolver, `127.0.0.11`. CoreDNS runs as a POD on the cluster overlay,
 * where 127.0.0.11 is its OWN loopback and nothing is listening. Cluster names
 * still resolve (the `kubernetes` plugin answers them locally, which is exactly
 * why the cluster looks healthy); every external name fails.
 *
 * WHY KIND DOES NOT HAVE THIS, and why that matters: kind's node image
 * substitutes the host's real resolvers into the node resolv.conf for this
 * precise reason. k3s leaves 127.0.0.11 in place. So the kind/k3d asymmetry is
 * explained WITHOUT invoking Cilium -- the CNI was never the cause, and this is
 * a k3d substrate gap, NOT a defect in anything metal runs. On metal
 * /etc/resolv.conf names a routable nameserver and this override is unnecessary.
 *
 * The fix uses k3s's own documented extension point (`coredns-custom`, imported
 * by the shipped Corefile above) rather than rewriting the Corefile, so it
 * survives a k3s upgrade that regenerates it.
 *
 * SCOPE: k3d bring-up only. `bringUpKindCiCluster` does not call this, and
 * neither does anything on the metal path.
 */
export function applyK3dCoreDnsUpstreamOverride(ports: DevClusterPorts): void {
  console.log("Pointing k3d CoreDNS at a reachable upstream (127.0.0.11 is unreachable from a pod netns) ...");
  ports.controlPlane.applyInlineManifest(
    [
      "apiVersion: v1",
      "kind: ConfigMap",
      "metadata:",
      "  name: coredns-custom",
      "  namespace: kube-system",
      "data:",
      "  upstream.override: |",
      "    forward . 1.1.1.1 8.8.8.8 {",
      "      policy sequential",
      "    }",
      "",
    ].join("\n"),
  );
  // CoreDNS reloads on its own (`reload` is in the shipped Corefile), but the
  // interval is not instant and the very next thing this bring-up does is install
  // ArgoCD, whose repo-server resolves github.com immediately. Restart rather than
  // race it -- a flake here would look exactly like the bug this override fixes,
  // which is the worst possible thing to be ambiguous about.
  //
  // `process.run`, NOT an optional method on the control-plane port. The first
  // draft called `controlPlane.restartDeployment?.(...)` -- a method that DOES
  // NOT EXIST on that interface, so the optional-call would have compiled, run,
  // and done NOTHING. A silent no-op inside the fix for a silent no-op.
  ports.process.run("kubectl", ["-n", "kube-system", "rollout", "restart", "deployment/coredns"], { timeoutMs: 60_000 });
  ports.process.run("kubectl", ["-n", "kube-system", "rollout", "status", "deployment/coredns", "--timeout=90s"], { timeoutMs: 120_000 });
}

export function bringUpK3dDevCluster(ports: DevClusterPorts, options: K3dDevBringUpOptions): void {
  const { localCluster, controlPlane, packages, appCatalog } = ports;
  const context = localCluster.contextName(options.clusterName);

  if (localCluster.list().includes(options.clusterName)) {
    console.log(
      `Cluster ${options.clusterName} already exists. Use bun src/Core.TypeScript/cluster/dev-cluster/k3d-down.ts --config ${options.configPath} to recreate.`,
    );
  } else {
    console.log(`Creating k3d cluster ${options.clusterName} ...`);
    localCluster.create({ name: options.clusterName, configPath: options.configPath, waitForReady: false });
  }

  localCluster.mergeCredentials?.(options.clusterName);
  controlPlane.selectContext(context);
  console.log("Waiting for Kubernetes API readiness ...");
  controlPlane.waitForApiReady(60, 3000);

  applyK3dCoreDnsUpstreamOverride(ports);

  if (!packages.releaseInstalled("kube-system", "cilium")) {
    // INSTALL THE SHIPPED VALUE SURFACE, never a hand-written --set list.
    //
    // This block used to hardcode five --set values, one of which was
    // `ipam.mode=kubernetes` against a shipped surface that says
    // `cluster-pool`. See `ciliumK3dValues` for the measurement that found it:
    // the CNI closest to metal was configured furthest from metal, so a green
    // run here would have proven nothing about what hardware boots.
    //
    // REFUSE rather than fall back. A missing surface must not silently become
    // "install the chart defaults" — that is the same class of defect as the
    // --set list, reached by a different door. `cilium-kind-up.ts` takes the
    // identical stance and prints the identical refusal.
    const surfaces = readCiliumValueSurfaces();
    const shipped = surfaces.find((surface) => surface.path.includes("applications/cilium/"))?.values;
    if (shipped === undefined) {
      throw new Error(
        "the ArgoCD Cilium value surface was not found in the roster; refusing to invent values for the k3d cluster",
      );
    }
    const { values, deltas } = ciliumK3dValues(shipped, options.kubeApiHost);

    console.log(`Installing Cilium from ${surfaces.map((s) => s.path).join(", ")}`);
    console.log(`Value deltas for the k3d substrate (${deltas.length}):`);
    for (const delta of deltas) console.log(`  ${delta.path}: ${delta.shipped} -> ${delta.kind} (${delta.reason})`);

    // writeFileSync, not Bun.write: helm reads this file in the very next
    // statement and Bun.write is async, so an unawaited call is a race that
    // would hand helm an EMPTY values file — i.e. the chart defaults, silently.
    const valuesPath = join(process.env["RUNNER_TEMP"] ?? "/tmp", `cilium-k3d-values-${options.clusterName}.json`);
    writeFileSync(valuesPath, renderValuesYaml(values));
    console.log(`Rendered Cilium values to ${valuesPath}`);

    packages.addRepo("cilium", "https://helm.cilium.io");
    packages.updateRepo("cilium");
    packages.install({
      release: "cilium",
      chart: "cilium/cilium",
      version: "1.16.5",
      namespace: "kube-system",
      setValues: [],
      valuesFiles: [valuesPath],
      wait: true,
    });
  }

  if (!packages.releaseInstalled("argocd", "argocd")) {
    console.log("Installing ArgoCD ...");
    controlPlane.ensureNamespace("argocd");
    packages.addRepo("argo", "https://argoproj.github.io/argo-helm");
    packages.updateRepo("argo");
    packages.install({
      release: "argocd",
      chart: "argo/argo-cd",
      version: "7.7.10",
      namespace: "argocd",
      // ClusterIP, NOT LoadBalancer -- and this line is downstream of installing
      // the shipped Cilium surface above.
      //
      // MEASURED 2026-08-31, the run after the CNI was fixed. k3s ships klipper
      // (`svclb`), so a `type: LoadBalancer` Service materialises a DaemonSet
      // that binds the service's ports on the HOST. The shipped Cilium values
      // enable `ingressController`, which creates its own LoadBalancer Service;
      // its `svclb-cilium-ingress` pod took 80/443 first and came up 2/2, and
      // `svclb-argocd-server` then sat Pending for the rest of the run:
      //
      //   0/1 nodes are available: 1 node(s) didn't have free ports
      //   for the requested pod ports.
      //
      // On one node there is exactly one host port 80 and one 443. The previous
      // `--set` list did not enable Cilium's ingress controller, so nothing
      // competed and LoadBalancer appeared to work -- it was only ever viable
      // while the CNI config diverged from metal.
      //
      // The kind bring-up above already installs ArgoCD as ClusterIP for its own
      // reasons, and the harness reaches ArgoCD through kubectl in both cases, so
      // no lane needs an externally-routable ArgoCD. Matching kind removes a
      // difference rather than adding one.
      setValues: ["server.service.type=ClusterIP"],
      wait: true,
    });
  }

  controlPlane.waitForCrdEstablished("applications.argoproj.io", 120, true);

  applyDevStorageClassAliases(ports);
  applyDevBootstrapSecrets(ports);
  applyDevRegistryPullSecret(ports, options.env ?? process.env);

  appCatalog.applyRootDevCatalog(options.gitRef, options.gitRepoUrl);
}

export function tearDownK3dDevCluster(ports: DevClusterPorts, clusterName: string): void {
  const context = ports.localCluster.contextName(clusterName);
  if (ports.localCluster.list().includes(clusterName)) {
    console.log(`Deleting k3d cluster ${clusterName} ...`);
    ports.localCluster.delete(clusterName);
  }
  const registryName = ports.localCluster.registryName?.(clusterName);
  if (registryName !== undefined && registryName !== null) {
    ports.localCluster.deleteRegistry?.(registryName);
  }
  ports.controlPlane.clearContextIfCurrent(context);
  console.log("Dev cluster torn down.");
}
