// src/Core.TypeScript/cluster/bootstrap-preload-blackhole.test.ts
//
// Falsifiers for the falsifier. OFFLINE: nothing here starts a container.
//
// The tests that matter most are the ones on `pairVerdict`, because that
// function IS the harness's integrity. A blackhole test whose negative control
// also passes has proved nothing, and the temptation to report the green half
// anyway is exactly the failure this whole work item is about. These pin the
// refusal so it cannot be softened by accident.

import { describe, expect, test } from "bun:test";

import {
  ALREADY_PRESENT,
  classifyProbes,
  dockerRunArgs,
  IMAGES_DIR,
  outcomeFromProbes,
  pairVerdict,
  parseEventMessages,
  parsePodImageStates,
  PROBE_COMMAND,
  probeManifest,
  type RunOutcome,
} from "./bootstrap-preload-blackhole.ts";

const outcome = (verdict: RunOutcome["verdict"], blocked: readonly string[] = []): RunOutcome => ({
  verdict,
  blockedImages: blocked,
  localImages: [],
  undecidedImages: [],
  detail: "test",
});

describe("pairVerdict — the harness's integrity, and the reason it exists", () => {
  test("PROVEN requires BOTH halves: positive CARRIED and negative BLOCKED", () => {
    expect(pairVerdict(outcome("CARRIED"), outcome("BLOCKED")).verdict).toBe("PROVEN");
  });

  test("a negative control that PASSED voids the positive result rather than weakening it", () => {
    // If the images were obtainable with an empty archive, the blackhole did
    // not hold, and the positive run cannot distinguish "the preload worked"
    // from "the blackhole did not". Reporting the green half would be the
    // check-that-cannot-fail wearing a success story.
    const pair = pairVerdict(outcome("CARRIED"), outcome("CARRIED"));
    expect(pair.verdict).toBe("BLACKHOLE_INEFFECTIVE");
    expect(pair.verdict).not.toBe("PROVEN");
    expect(pair.reason).toContain("discarded");
  });

  test("an INCONCLUSIVE negative control is NOT_PROVEN — absence of evidence is not evidence", () => {
    expect(pairVerdict(outcome("CARRIED"), outcome("INCONCLUSIVE")).verdict).toBe("NOT_PROVEN");
  });

  test("a positive run that did not carry is NOT_PROVEN even with a red negative control", () => {
    const pair = pairVerdict(outcome("BLOCKED", ["quay.io/cilium/cilium:v1.20.1"]), outcome("BLOCKED"));
    expect(pair.verdict).toBe("NOT_PROVEN");
    expect(pair.reason).toContain("quay.io/cilium/cilium:v1.20.1");
  });

  test("an INCONCLUSIVE positive run never reads as a pass", () => {
    expect(pairVerdict(outcome("INCONCLUSIVE"), outcome("BLOCKED")).verdict).toBe("NOT_PROVEN");
  });
});

describe("classifyProbes — reading the kubelet's own words", () => {
  const image = "quay.io/cilium/cilium:v1.20.1@sha256:aa";

  test("'already present on machine' is the ONLY signal that no pull happened", () => {
    const observations = classifyProbes(
      [image],
      [`Container image "${image}" ${ALREADY_PRESENT} and can be accessed by the pod`],
      new Map(),
      new Set(),
    );
    expect(observations[0]?.outcome).toBe("local");
  });

  test("a pull failure is `blocked`", () => {
    const observations = classifyProbes([image], [], new Map([[image, ["ImagePullBackOff"]]]), new Set());
    expect(observations[0]?.outcome).toBe("blocked");
  });

  test("blocked WINS over a later local hit — a flake may not launder a real failure", () => {
    const observations = classifyProbes(
      [image],
      [`Container image "${image}" ${ALREADY_PRESENT}`],
      new Map([[image, ["ErrImagePull"]]]),
      new Set(),
    );
    expect(observations[0]?.outcome).toBe("blocked");
  });

  test("runc refusing the probe command is positive evidence the image was obtained", () => {
    // The probe runs a binary that cannot exist. runc can only get far enough
    // to complain about it AFTER the image is on the machine — so this survives
    // the event ageing out of the API server's window.
    const observations = classifyProbes([image], [], new Map(), new Set([image]));
    expect(observations[0]?.outcome).toBe("local");
  });

  test("silence is `undecided`, never a pass", () => {
    expect(classifyProbes([image], [], new Map(), new Set())[0]?.outcome).toBe("undecided");
  });

  test("an event about a DIFFERENT image does not credit this one", () => {
    const observations = classifyProbes(
      [image],
      [`Container image "quay.io/other/thing:v1" ${ALREADY_PRESENT}`],
      new Map(),
      new Set(),
    );
    expect(observations[0]?.outcome).toBe("undecided");
  });
});

describe("outcomeFromProbes", () => {
  test("any blocked image makes the whole run BLOCKED", () => {
    const result = outcomeFromProbes([
      { image: "a", outcome: "local" },
      { image: "b", outcome: "blocked" },
    ]);
    expect(result.verdict).toBe("BLOCKED");
    expect(result.blockedImages).toEqual(["b"]);
  });

  test("any undecided image blocks a CARRIED verdict — partial coverage is not coverage", () => {
    const result = outcomeFromProbes([
      { image: "a", outcome: "local" },
      { image: "b", outcome: "undecided" },
    ]);
    expect(result.verdict).toBe("INCONCLUSIVE");
  });

  test("CARRIED needs every probed image local", () => {
    const result = outcomeFromProbes([
      { image: "a", outcome: "local" },
      { image: "b", outcome: "local" },
    ]);
    expect(result.verdict).toBe("CARRIED");
  });

  test("an EMPTY probe set is CARRIED with zero images — which is why the runner refuses to get here", () => {
    // Documented rather than defended in this function: `runHalf` returns
    // INCONCLUSIVE when the probe manifest never applied, so an empty set never
    // reaches the classifier in a real run. Pinned so that if someone changes
    // the runner, the vacuous path is visible in a diff rather than in a green.
    expect(outcomeFromProbes([]).verdict).toBe("CARRIED");
    expect(outcomeFromProbes([]).localImages).toEqual([]);
  });
});

describe("parsePodImageStates — the SPEC image, not the resolved one", () => {
  test("keys on the spec's image string, which is what the manifest wrote", () => {
    const json = JSON.stringify({
      items: [
        {
          spec: { containers: [{ image: "quay.io/cilium/cilium:v1.20.1@sha256:aa" }] },
          status: { containerStatuses: [{ state: { waiting: { reason: "ImagePullBackOff" } } }] },
        },
      ],
    });
    const { waitingReasonsByImage } = parsePodImageStates(json);
    expect([...waitingReasonsByImage.keys()]).toEqual(["quay.io/cilium/cilium:v1.20.1@sha256:aa"]);
  });

  test("a runc complaint about the probe command marks the image as obtained", () => {
    const json = JSON.stringify({
      items: [
        {
          spec: { containers: [{ image: "quay.io/a/b:v1" }] },
          status: {
            containerStatuses: [
              { state: { terminated: { message: `exec: "${PROBE_COMMAND}": no such file or directory` } } },
            ],
          },
        },
      ],
    });
    expect(parsePodImageStates(json).runcFailedImages.has("quay.io/a/b:v1")).toBe(true);
  });

  test("init containers are read too — three preloaded images only appear there", () => {
    const json = JSON.stringify({
      items: [
        {
          spec: { containers: [], initContainers: [{ image: "busybox:1.36" }] },
          status: { initContainerStatuses: [{ state: { waiting: { reason: "ErrImagePull" } } }] },
        },
      ],
    });
    expect(parsePodImageStates(json).waitingReasonsByImage.get("busybox:1.36")).toEqual(["ErrImagePull"]);
  });
});

describe("parseEventMessages", () => {
  test("drops empty messages", () => {
    expect(parseEventMessages(JSON.stringify({ items: [{ message: "x" }, {}, { message: "" }] }))).toEqual(["x"]);
  });
});

describe("probeManifest", () => {
  test("names a digest-pinned image VERBATIM and quotes it", () => {
    const reference = "quay.io/cilium/cilium:v1.20.1@sha256:ae9ea21f";
    const manifest = probeManifest([reference]);
    expect(manifest).toContain(`image: '${reference}'`);
  });

  test("uses IfNotPresent — a probe that always pulls would test the registry, not the preload", () => {
    expect(probeManifest(["a:v1"])).toContain("imagePullPolicy: IfNotPresent");
  });

  test("tolerates every taint — the images are needed BEFORE a CNI exists", () => {
    expect(probeManifest(["a:v1"])).toContain('operator: "Exists"');
  });

  test("one Pod per image, plus the namespace", () => {
    const manifest = probeManifest(["a:v1", "b:v2", "c:v3"]);
    expect(manifest.match(/kind: Pod/g)).toHaveLength(3);
    expect(manifest).toContain("kind: Namespace");
  });
});

describe("dockerRunArgs", () => {
  const plan = {
    k3sImage: "rancher/k3s:v1.35.7-k3s1",
    blackholed: ["ghcr.io", "quay.io"],
    rosterFiles: ["cilium-install.yaml"],
    archivePath: null,
    probedImages: ["quay.io/a/b:v1"],
  };

  test("every derived host is pointed at 127.0.0.1", () => {
    const args = dockerRunArgs({ name: "n", plan, manifestsHostDir: "/m", imagesHostDir: "/i" });
    expect(args).toContain("ghcr.io:127.0.0.1");
    expect(args).toContain("quay.io:127.0.0.1");
  });

  test("the images directory is ALWAYS mounted — the control differs by CONTENT, not by mount", () => {
    // Two variables differing between the runs would not be a control. The
    // negative run mounts an empty directory; it does not skip the mount.
    const args = dockerRunArgs({ name: "n", plan, manifestsHostDir: "/m", imagesHostDir: "/i" });
    expect(args.join(" ")).toContain(`/i:${IMAGES_DIR}:ro`);
  });

  test("the real roster is mounted where k3s applies it", () => {
    const args = dockerRunArgs({ name: "n", plan, manifestsHostDir: "/m", imagesHostDir: "/i" });
    expect(args.join(" ")).toContain("/m:/var/lib/rancher/k3s/server/manifests");
  });
});
