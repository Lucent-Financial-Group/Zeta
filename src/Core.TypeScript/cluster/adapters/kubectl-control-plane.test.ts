import { describe, expect, test } from "bun:test";
import type { ProcessRunner } from "../ports.ts";
import { kubectlControlPlane } from "./kubectl-control-plane.ts";

function recordingRunner(): { readonly runner: ProcessRunner; readonly log: string[] } {
  const log: string[] = [];
  const runner: ProcessRunner = {
    run: (cmd, args) => {
      log.push(`${cmd} ${args.join(" ")}`);
      return { status: 0, stdout: "", stderr: "" };
    },
  };
  return { runner, log };
}

describe("applyInlineManifest last-applied ceiling", () => {
  test("server-side apply when asked — the 262144-byte annotation door", () => {
    // MEASURED live-k3d / live-kind-included 33821540802: packed=411676B,
    // `kubectl apply -f -` failed `metadata.annotations: Too long: may not be
    // more than 262144 bytes`. Delete --server-side here and that run repeats.
    const { runner, log } = recordingRunner();
    kubectlControlPlane(runner).applyInlineManifest("kind: ConfigMap\n", true);
    expect(log).toEqual(["kubectl apply --server-side --force-conflicts -f -"]);
  });

  test("client-side by default, so small Secrets keep the old path", () => {
    const { runner, log } = recordingRunner();
    kubectlControlPlane(runner).applyInlineManifest("kind: Secret\n");
    expect(log).toEqual(["kubectl apply -f -"]);
  });
});
