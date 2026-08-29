import { describe, expect, it } from "bun:test";
import {
  PASSPHRASE_SOURCE_SERIAL,
  planPassphraseSource,
  stagePassphrase,
  type PassphraseSourceEffects,
} from "./passphrase-source";
import { UEFI_KEYFILE_RESTORE_SERIAL } from "../ci/qemu-full-install-test";

function mockEffects(opts: {
  readonly fwCfg?: Uint8Array;
  readonly existingFile?: boolean;
  readonly typed?: string;
  readonly writes?: { path: string; contents: Uint8Array }[];
}): PassphraseSourceEffects {
  const writes = opts.writes ?? [];
  return {
    probeFwCfg: () => opts.fwCfg !== undefined && opts.fwCfg.byteLength > 0,
    readFwCfg: () => {
      if (opts.fwCfg === undefined) throw new Error("fw_cfg not readable");
      return opts.fwCfg;
    },
    passphraseFileNonempty: () => opts.existingFile === true,
    askPassword: () => opts.typed ?? "",
    writePassphraseFile: (path, contents) => {
      writes.push({ path, contents });
    },
  };
}

describe("planPassphraseSource (pure)", () => {
  it("picks fw_cfg when the hypervisor node is readable (QEMU)", () => {
    expect(
      planPassphraseSource({
        fwCfgReadable: true,
        passphraseFileNonempty: false,
        passphraseMode: "interactive",
      }),
    ).toEqual({ kind: "stage-from-fwcfg" });
  });

  it("picks ask-password when fw_cfg is absent and the file is empty (metal)", () => {
    expect(
      planPassphraseSource({
        fwCfgReadable: false,
        passphraseFileNonempty: false,
        passphraseMode: "interactive",
      }),
    ).toEqual({ kind: "ask-password" });
  });

  it("uses a pre-staged file when present and fw_cfg is absent", () => {
    expect(
      planPassphraseSource({
        fwCfgReadable: false,
        passphraseFileNonempty: true,
        passphraseMode: "interactive",
      }),
    ).toEqual({ kind: "use-existing-file" });
  });

  it("refuses in file mode when nothing is staged", () => {
    expect(
      planPassphraseSource({
        fwCfgReadable: false,
        passphraseFileNonempty: false,
        passphraseMode: "file",
      }),
    ).toEqual({ kind: "refuse", reason: "missing-file" });
  });
});

describe("stagePassphrase (injected metal / qemu adapters)", () => {
  const config = {
    passphraseFile: "/run/zeta-creds-passphrase",
    passphraseMode: "interactive" as const,
    interactiveTempFile: "/run/zeta-creds-passphrase-temp",
  };

  it("QEMU adapter: copies fw_cfg and names metal-capable=no", () => {
    const writes: { path: string; contents: Uint8Array }[] = [];
    const secret = new TextEncoder().encode("b0891-qemu-test-passphrase");
    const result = stagePassphrase(mockEffects({ fwCfg: secret, writes }), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transport).toBe("qemu-fw_cfg");
    expect(result.passphrasePath).toBe(config.passphraseFile);
    expect(result.serial).toEqual([
      PASSPHRASE_SOURCE_SERIAL.stagedFromFwcfg,
      PASSPHRASE_SOURCE_SERIAL.transportFwcfgNotMetal,
    ]);
    expect(writes).toHaveLength(1);
    expect(Buffer.from(writes[0]!.contents).toString("utf8")).toBe("b0891-qemu-test-passphrase");
  });

  it("metal adapter: mock ask-password yields metal-capable=yes and never claims fw_cfg", () => {
    const writes: { path: string; contents: Uint8Array }[] = [];
    const result = stagePassphrase(
      mockEffects({ typed: "operator-typed-passphrase", writes }),
      config,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transport).toBe("interactive-ask-password");
    expect(result.passphrasePath).toBe(config.interactiveTempFile);
    expect(result.serial).toEqual([PASSPHRASE_SOURCE_SERIAL.transportInteractive]);
    expect(result.serial.join("\n")).not.toContain("fw_cfg");
    expect(writes[0]!.path).toBe(config.interactiveTempFile);
    expect(Buffer.from(writes[0]!.contents).toString("utf8")).toBe("operator-typed-passphrase");
  });

  it("metal adapter: empty ask-password refuses and writes nothing", () => {
    const writes: { path: string; contents: Uint8Array }[] = [];
    const result = stagePassphrase(mockEffects({ typed: "", writes }), config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.serial).toEqual([PASSPHRASE_SOURCE_SERIAL.emptyAskPassword]);
    expect(writes).toHaveLength(0);
  });

  it("empty fw_cfg does not win — falls through to ask-password (prior Nix -s)", () => {
    const writes: { path: string; contents: Uint8Array }[] = [];
    const result = stagePassphrase(
      mockEffects({ fwCfg: new Uint8Array(0), typed: "operator-typed-passphrase", writes }),
      config,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transport).toBe("interactive-ask-password");
    expect(writes[0]!.path).toBe(config.interactiveTempFile);
  });

  it("file mode with no source refuses with the missing-file serial", () => {
    const result = stagePassphrase(mockEffects({}), {
      ...config,
      passphraseMode: "file",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.serial[0]).toContain("passphraseMode=file");
  });

  it("transport serials stay byte-identical to the QEMU restore contract", () => {
    expect(PASSPHRASE_SOURCE_SERIAL.stagedFromFwcfg).toBe(
      UEFI_KEYFILE_RESTORE_SERIAL.stagedFromFwcfg,
    );
    expect(PASSPHRASE_SOURCE_SERIAL.transportInteractive).toBe(
      UEFI_KEYFILE_RESTORE_SERIAL.transportInteractive,
    );
    expect(PASSPHRASE_SOURCE_SERIAL.transportFwcfgNotMetal.startsWith(
      UEFI_KEYFILE_RESTORE_SERIAL.transportFwcfgNotMetal,
    )).toBe(true);
  });
});
