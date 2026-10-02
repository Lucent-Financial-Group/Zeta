/**
 * node-lan-hosts.test.ts -- falsifiers for `cluster-hygiene/node-lan-hosts.yaml`.
 *
 * MEASURED 2026-10-02: the kubelet could not pull `registry.flowdent.net/...` because the node resolved it
 * to the public IP and the router has no 443 forward. The fix is a DaemonSet that bind-mounts a hosts file
 * pinning gitlab./registry. to the Gateway's LB address. This file RUNS its `apply` script (ONCE=1, fake
 * host, `echo` for the mount) over the cases that matter, because the first live version of that script
 * mounted a hosts file holding ONLY the block -- no `localhost`, no `control-plane` -- and the node briefly
 * lost its own API-server name. The "base lost its entries" case below is that incident, pinned.
 *
 * CANNOT PROVE: the bind mount on a real NixOS node, or that the Gateway status carries the LB address.
 */

import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml, parseAllDocuments } from "yaml";

type Doc = Record<string, unknown>;
const HYGIENE = resolve(import.meta.dir, "../../../full-ai-cluster/k8s/applications/cluster-hygiene");
const docs = parseAllDocuments(readFileSync(join(HYGIENE, "node-lan-hosts.yaml"), "utf8")).map((d) => d.toJS() as Doc);
const ds = docs.find((d) => d["kind"] === "DaemonSet") as Doc;
const containers = (((ds["spec"] as Doc)["template"] as Doc)["spec"] as Doc)["containers"] as Doc[];
const scriptOf = (name: string): string =>
  ((containers.find((c) => c["name"] === name) as Doc)["args"] as string[])[0]!;

describe("render", () => {
  test("the Application applies it, and its namespace is the one privileged namespace it needs", () => {
    const app = parseYaml(readFileSync(join(HYGIENE, "Application.yaml"), "utf8")) as Doc;
    const include = (((app["spec"] as Doc)["source"] as Doc)["directory"] as Doc)["include"] as string;
    expect(include).toContain("node-lan-hosts");
    const ns = docs.find((d) => d["kind"] === "Namespace") as Doc;
    expect(((ns["metadata"] as Doc)["labels"] as Doc)["pod-security.kubernetes.io/enforce"]).toBe("privileged");
  });

  test("only gitlab./registry. are pinned -- never api.* (still Azure until the cutover)", () => {
    const discover = scriptOf("discover");
    expect(discover).toContain("(gitlab|registry)");
    expect(discover).not.toMatch(/api/);
  });

  test("RBAC is read-only on the one Gateway", () => {
    const role = docs.find((d) => d["kind"] === "Role") as Doc;
    const rule = (role["rules"] as Doc[])[0]!;
    expect(rule["verbs"]).toEqual(["get"]);
    expect(rule["resourceNames"]).toEqual(["zeta-public-gateway"]);
  });
});

const BASE = "127.0.0.1 localhost\n::1 localhost\n127.0.0.1 control-plane\n127.0.0.2 node\n";
const BLOCK = "192.168.1.240 gitlab.x.net # zeta-lan-hosts\n192.168.1.240 registry.x.net # zeta-lan-hosts\n";

describe("apply script, executed", () => {
  const withRun = (hosts: string, block: string) => {
    const dir = mkdtempSync(join(tmpdir(), "nlh-")).replace(/\\/g, "/");
    mkdirSync(`${dir}/run`);
    writeFileSync(`${dir}/hosts`, hosts);
    writeFileSync(`${dir}/block`, block);
    writeFileSync(
      `${dir}/fakemount`,
      `#!/bin/sh
echo "$@" > ${dir}/mounts
`,
    );
    chmodSync(`${dir}/fakemount`, 0o755);
    const r = Bun.spawnSync(["sh", "-c", scriptOf("apply")], {
      env: {
        ...process.env,
        ONCE: "1",
        HOST: dir,
        SHARED: dir,
        WORK: dir,
        HREAD: `cat ${dir}/hosts`,
        MOUNT: `${dir}/fakemount`,
      },
    });
    expect(r.exitCode).toBe(0);
    const f = `${dir}/run/zeta-lan-hosts`;
    // One syscall, one answer: read and interpret ENOENT, rather than existsSync-then-read
    // (a check-then-use race the hygiene lint rejects, CWE-367).
    let state: string | null;
    try {
      state = readFileSync(f, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") state = null;
      else throw e;
    }
    return { state, mounted: existsSync(`${dir}/mounts`) };
  };

  test("fresh host: base lines AND the block are mounted", () => {
    const r = withRun(BASE, BLOCK);
    expect(r.state).toBe(BASE + BLOCK);
    expect(r.mounted).toBe(true);
  });

  test("already mounted, block changed: rewritten in place, NOT mounted again", () => {
    const r = withRun(BASE + BLOCK, BLOCK.replace(/240/g, "241"));
    expect(r.state).toBe(BASE + BLOCK.replace(/240/g, "241"));
    expect(r.mounted).toBe(false);
  });

  test("the incident: a base that lost localhost is NEVER mounted", () => {
    const r = withRun("# nothing readable\n", BLOCK);
    expect(r.state).toBeNull();
    expect(r.mounted).toBe(false);
  });

  test("no block yet (discover has not answered): nothing happens", () => {
    const r = withRun(BASE, "");
    expect(r.state).toBeNull();
    expect(r.mounted).toBe(false);
  });
});
