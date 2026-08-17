// src/Core.TypeScript/zflash/injection-rail.test.ts
//
// 081KTWFYC9108QG0R001C8RDPK — constitutional rail + workload identity, pure-core tests.
//
// No ISO, no QEMU, no filesystem, no hardware. Everything under test is a
// total function from a value to a value or a typed refusal, so the whole
// policy replays byte-identically (§7 DST).
//
// Run: bun test src/Core.TypeScript/zflash/injection-rail.test.ts

import { describe, expect, test } from "bun:test";
import {
  deriveNodeWorkloadSpiffeId,
  describeEspWriteVerdict,
  ESP_DESTINATION_CONTENT_CLASS,
  ESP_RAIL_EXCEPTIONS,
  evaluateEspWrite,
  evaluateRail,
  planWorkloadIdentityFlashInjection,
  railFindingsForEspWrites,
  RAIL_DIVERGENCES,
  WORKLOAD_IDENTITY_ARTIFACT_CONTENT_CLASS,
  WORKLOAD_IDENTITY_CUSTODY_DECISIONS,
  type EspDestination,
} from "./injection-rail.ts";
import { planFileBackedZflashImage } from "./lib.ts";
import { runFileBackedZflashCli } from "./file-backed.ts";
import { parseSpiffe } from "../identity/actor-ref.ts";

describe("the rail is exhaustive over the destinations lib.ts can actually plan", () => {
  // The `satisfies` clause enforces this at compile time. This test enforces
  // the other direction at runtime: that the classification has no entries for
  // destinations that do not exist, and that the destinations the PLANNER
  // emits are all classified. A compile-time-only guard would pass against a
  // hand-maintained union that had drifted from the planner.
  test("every destination the planner emits carries a content class", () => {
    const planned = planFileBackedZflashImage({
      isoPath: "/tmp/installer.iso",
      outputImagePath: "/tmp/out.img",
      espOffsetBytes: 141_312,
      authorizedKeysContent: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyMaterialHere operator@zeta",
      hostname: "node-a",
      credentialBlobPath: "/tmp/zeta-creds.enc",
      wifiCredentials: { ssid: "zeta-net", password: "correct-horse" },
      firstbootRole: { kind: "joiner", serverUrl: "https://control-plane.local:6443", tokenEspPath: "/zeta-join-token" },
      joinTokenSourcePath: "/tmp/node-token",
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const emitted = planned.value.espWrites.map((write) => write.destination);
    // All six destinations exercised, so the classification is total over what ships.
    expect(new Set(emitted).size).toBe(6);
    for (const destination of emitted) {
      expect(ESP_DESTINATION_CONTENT_CLASS[destination]).toBeDefined();
    }
  });

  test("the classification names no destination the planner cannot produce", () => {
    const classified = Object.keys(ESP_DESTINATION_CONTENT_CLASS).sort();
    expect(classified).toEqual([
      "/zeta-authorized-keys.pub",
      "/zeta-creds.enc",
      "/zeta-firstboot.conf",
      "/zeta-hostname.txt",
      "/zeta-join-token",
      "/zeta-wifi-credentials.json",
    ]);
  });
});

describe("evaluateRail — the class decides, not the filename", () => {
  test("secret material is refused on the USB ESP", () => {
    const verdict = evaluateRail("secret-material", "usb-esp");
    expect(verdict.permitted).toBe(false);
    if (verdict.permitted !== false) return;
    expect(verdict.why).toContain("unencrypted USB ESP");
  });

  test("secret material is permitted at the operator-typed console", () => {
    expect(evaluateRail("secret-material", "cluster-console-operator-typed").permitted).toBe("by-class");
  });

  test("secret material is permitted into post-install secrets management", () => {
    expect(evaluateRail("secret-material", "post-install-secrets-manager").permitted).toBe("by-class");
  });

  test("public identifiers ride the ESP", () => {
    expect(evaluateRail("public-identifier", "usb-esp").permitted).toBe("by-class");
  });

  test("an encrypted envelope rides the ESP — the class is DECLARED, not measured", () => {
    expect(evaluateRail("encrypted-envelope", "usb-esp").permitted).toBe("by-class");
  });
});

describe("evaluateEspWrite — per-destination verdicts", () => {
  test("the three public identifiers pass by class", () => {
    for (const destination of [
      "/zeta-authorized-keys.pub",
      "/zeta-hostname.txt",
      "/zeta-firstboot.conf",
    ] satisfies EspDestination[]) {
      expect(evaluateEspWrite(destination).permitted).toBe("by-class");
    }
  });

  test("the credential blob passes as an encrypted envelope, not as a public identifier", () => {
    const verdict = evaluateEspWrite("/zeta-creds.enc");
    expect(verdict.permitted).toBe("by-class");
    if (verdict.permitted !== "by-class") return;
    expect(verdict.contentClass).toBe("encrypted-envelope");
  });

  test("the join token passes ONLY through its recorded exception", () => {
    const verdict = evaluateEspWrite("/zeta-join-token");
    expect(verdict.permitted).toBe("by-recorded-exception");
    if (verdict.permitted !== "by-recorded-exception") return;
    expect(verdict.exception.neverImplicit).toBe(true);
    expect(verdict.exception.recordedIn).toContain("INJECTION-POINTS.md");
  });

  test("the wifi PSK is REFUSED — no exception is on file for it", () => {
    // This is the finding this module exists to surface. If someone later adds
    // /zeta-wifi-credentials.json to ESP_RAIL_EXCEPTIONS, this test fails and
    // the addition has to be argued for rather than slipped in.
    const verdict = evaluateEspWrite("/zeta-wifi-credentials.json");
    expect(verdict.permitted).toBe(false);
    if (verdict.permitted !== false) return;
    expect(verdict.contentClass).toBe("secret-material");
    expect(ESP_RAIL_EXCEPTIONS).not.toHaveProperty("/zeta-wifi-credentials.json");
  });

  test("the divergence roster records the wifi path and calls it unresolved", () => {
    const divergence = RAIL_DIVERGENCES["/zeta-wifi-credentials.json"];
    expect(divergence.disposition).toContain("UNRESOLVED");
    expect(divergence.catalogSays).toContain("NEVER on USB ESP");
  });
});

describe("describeEspWriteVerdict / railFindingsForEspWrites — what a human sees", () => {
  test("a refusal leads with REFUSED", () => {
    expect(describeEspWriteVerdict("/zeta-wifi-credentials.json")).toContain("REFUSED BY THE RAIL");
  });

  test("an exception still says the words 'SECRET MATERIAL IN PLAINTEXT'", () => {
    // A recorded exception is not a clean bill of health; the disclosure has to
    // read as loudly as the refusal or the roster becomes a laundering step.
    expect(describeEspWriteVerdict("/zeta-join-token")).toContain("SECRET MATERIAL IN PLAINTEXT");
  });

  test("findings cover exactly the secret-class writes, and nothing else", () => {
    const findings = railFindingsForEspWrites([
      "/zeta-authorized-keys.pub",
      "/zeta-hostname.txt",
      "/zeta-creds.enc",
      "/zeta-firstboot.conf",
      "/zeta-wifi-credentials.json",
      "/zeta-join-token",
    ]);
    expect(findings).toHaveLength(2);
    expect(findings.join("\n")).toContain("/zeta-wifi-credentials.json");
    expect(findings.join("\n")).toContain("/zeta-join-token");
    expect(findings.join("\n")).not.toContain("/zeta-hostname.txt");
  });

  test("a plan with no secrets produces no findings", () => {
    expect(railFindingsForEspWrites(["/zeta-hostname.txt", "/zeta-firstboot.conf"])).toEqual([]);
  });
});

describe("deriveNodeWorkloadSpiffeId — the flash-time hostname is the node coordinate", () => {
  test("derives the treaty-canonical form and it round-trips", () => {
    const result = deriveNodeWorkloadSpiffeId({ persona: "otto", surface: "cli", nodeHostname: "node-a" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spiffeId).toBe("spiffe://zeta/persona/otto/cell/cli@node-a");
    expect(parseSpiffe(result.spiffeId).cell.node).toBe("node-a");
  });

  test("carries an instance when one is given", () => {
    const result = deriveNodeWorkloadSpiffeId({
      persona: "otto",
      surface: "cli",
      instance: "fg",
      nodeHostname: "node-a",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spiffeId).toBe("spiffe://zeta/persona/otto/cell/cli/fg@node-a");
  });

  test("REFUSES an uppercase hostname — RFC1123-valid, not a valid node segment", () => {
    // The forcing case. `--host Node-A` flashes cleanly today (VALID_HOSTNAME_REGEX
    // allows uppercase) and would produce a SPIFFE ID this repo's own parser
    // rejects. Without the round-trip check the derivation would emit it happily.
    const result = deriveNodeWorkloadSpiffeId({ persona: "otto", surface: "cli", nodeHostname: "Node-A" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("round-trip");
  });

  test("refuses a hostname that is not RFC1123-valid at all", () => {
    const result = deriveNodeWorkloadSpiffeId({ persona: "otto", surface: "cli", nodeHostname: "node_a!" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("RFC1123");
  });

  test("refuses an empty hostname", () => {
    const result = deriveNodeWorkloadSpiffeId({ persona: "otto", surface: "cli", nodeHostname: "   " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("node hostname is required");
  });

  test("refuses a node coordinate with no surface — the grammar forbids it", () => {
    const result = deriveNodeWorkloadSpiffeId({ persona: "otto", surface: "", nodeHostname: "node-a" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("surface is required");
  });
});

describe("planWorkloadIdentityFlashInjection — what may ride the medium", () => {
  test("the SPIFFE ID and trust bundle are permitted; the private key is not", () => {
    const planned = planWorkloadIdentityFlashInjection({
      persona: "otto",
      surface: "cli",
      nodeHostname: "node-a",
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.value.espPermittedArtifacts).toEqual(["spiffe-id", "trust-bundle"]);
    expect(planned.value.espRefusedArtifacts).toHaveLength(1);
    expect(planned.value.espRefusedArtifacts[0]?.artifact).toBe("svid-private-key");
  });

  test("the refusal gives BOTH independent reasons", () => {
    const planned = planWorkloadIdentityFlashInjection({
      persona: "otto",
      surface: "cli",
      nodeHostname: "node-a",
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const why = planned.value.espRefusedArtifacts[0]?.why ?? "";
    expect(why).toContain("unencrypted USB ESP");
    expect(why).toContain("CSR");
  });

  test("the artifact classification puts exactly one artifact in the secret class", () => {
    const secrets = Object.entries(WORKLOAD_IDENTITY_ARTIFACT_CONTENT_CLASS)
      .filter(([, contentClass]) => contentClass === "secret-material")
      .map(([artifact]) => artifact);
    expect(secrets).toEqual(["svid-private-key"]);
  });

  test("a bad hostname refuses the whole plan rather than planning around it", () => {
    const planned = planWorkloadIdentityFlashInjection({
      persona: "otto",
      surface: "cli",
      nodeHostname: "Node-A",
    });
    expect(planned.ok).toBe(false);
  });
});

describe("the flash path READS the rail — a disclosure nobody sees is vacuous", () => {
  const mockExecutor = {
    runCommand: () => ({ exitCode: 0, stderr: "", stdout: "" }),
    writeFile: () => {},
  };

  test("flashing wifi credentials discloses the plaintext PSK on the ESP", () => {
    const warnings: string[] = [];
    const result = runFileBackedZflashCli(
      {
        espOffsetBytes: 1_048_576,
        isoPath: "artifacts/zeta-installer.iso",
        outputImagePath: "artifacts/zflash-baked.img",
        hostname: "node-a",
        wifiSsid: "Homelab",
        wifiPassword: "super-secret",
      },
      {
        createInlineStagingDirectory: () => "/private/tmp/zflash-inline-test",
        executor: mockExecutor,
        warn: (line) => warnings.push(line),
      },
    );
    expect(result.ok).toBe(true);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("/zeta-wifi-credentials.json");
    expect(warnings[0]).toContain("REFUSED BY THE RAIL");
    // The disclosure must not echo the secret it is warning about.
    expect(warnings.join("\n")).not.toContain("super-secret");
  });

  test("a flash carrying only public identifiers discloses nothing", () => {
    const warnings: string[] = [];
    const result = runFileBackedZflashCli(
      {
        espOffsetBytes: 1_048_576,
        isoPath: "artifacts/zeta-installer.iso",
        outputImagePath: "artifacts/zflash-baked.img",
        hostname: "node-a",
        firstbootRole: { kind: "first-control-plane" },
      },
      {
        createInlineStagingDirectory: () => "/private/tmp/zflash-inline-test",
        executor: mockExecutor,
        warn: (line) => warnings.push(line),
      },
    );
    expect(result.ok).toBe(true);
    expect(warnings).toEqual([]);
  });
});

describe("custody decisions are surfaced, never answered", () => {
  test("every custody question is still open", () => {
    expect(WORKLOAD_IDENTITY_CUSTODY_DECISIONS.length).toBeGreaterThan(0);
    for (const decision of WORKLOAD_IDENTITY_CUSTODY_DECISIONS) {
      expect(decision.decided).toBe(false);
      expect(decision.whoDecides).toContain("maintainer");
    }
  });

  test("sealing, TPM binding, and issuance authority are each named", () => {
    const questions = WORKLOAD_IDENTITY_CUSTODY_DECISIONS.map((d) => d.question).join(" ");
    expect(questions).toContain("sealed at rest");
    expect(questions).toContain("TPM-bound");
    expect(questions).toContain("authorizes issuance");
  });

  test("the plan carries them to its caller", () => {
    const planned = planWorkloadIdentityFlashInjection({
      persona: "otto",
      surface: "cli",
      nodeHostname: "node-a",
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.value.custodyDecisions).toHaveLength(WORKLOAD_IDENTITY_CUSTODY_DECISIONS.length);
  });
});
