// Pins the pure half of kubevirt-vm-live-test.ts. The live half needs a cluster with KubeVirt
// and CDI installed and runs in the `live-kind-virt` job of k8s-argocd-health-test.yml.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { blankDataVolumeManifest, CIRROS_IMAGE, cirrosVmiManifest, templateKinds, WINDOWS_TEMPLATE_PATH } from "./kubevirt-vm-live-test.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

describe("manifests the lane applies", () => {
  test("the cirros VMI boots from a containerDisk and asks for nothing the runner cannot give", () => {
    const vmi = parseYaml(cirrosVmiManifest("ns")) as any;
    expect(vmi.kind).toBe("VirtualMachineInstance");
    expect(vmi.metadata.namespace).toBe("ns");
    expect(vmi.spec.volumes[0].containerDisk.image).toBe(CIRROS_IMAGE);
    // a VM that asks for hundreds of MiB would not schedule beside two operators on a 4-vCPU runner
    expect(vmi.spec.domain.resources.requests.memory).toBe("128Mi");
    // `Running` is only reachable without /dev/kvm if the request is not pinned to hardware
    expect(JSON.stringify(vmi)).not.toContain("devices.kubevirt.io/kvm");
  });

  test("the cirros image tag follows the vendored KubeVirt pin, so the guest and the operator move together", () => {
    const operator = readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/applications/kubevirt/kubevirt-operator.yaml"), "utf8");
    const pin = /virt-operator:(v\d+\.\d+\.\d+)/.exec(operator)?.[1];
    expect(pin).toBeDefined();
    expect(CIRROS_IMAGE.endsWith(`:${pin}`)).toBe(true);
  });

  test("the CDI check uses the storage capability cdi-cr.yaml names for scratch space", () => {
    const cr = readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/applications/cdi/cdi-cr.yaml"), "utf8");
    const scratch = /scratchSpaceStorageClass:\s*(\S+)/.exec(cr)?.[1];
    expect(scratch).toBe("zeta-block-local");
    const dv = parseYaml(blankDataVolumeManifest("ns", scratch!)) as any;
    expect(dv.spec.storage.storageClassName).toBe(scratch);
    expect(dv.spec.source).toEqual({ blank: {} });
  });
});

describe("the Windows template the dry-run is judged against", () => {
  test("declares a VirtualMachine and a DataVolume, so the dry-run exercises both webhooks", () => {
    const kinds = templateKinds(readFileSync(join(REPO_ROOT, WINDOWS_TEMPLATE_PATH), "utf8"));
    expect(kinds).toContain("VirtualMachine");
    expect(kinds).toContain("DataVolume");
    expect(kinds.length).toBeGreaterThanOrEqual(3);
  });

  test("an empty or kindless document yields no kinds rather than a crash", () => {
    expect(templateKinds("")).toEqual([]);
    expect(templateKinds("a: 1\n---\nkind: Foo\n")).toEqual(["Foo"]);
  });
});
