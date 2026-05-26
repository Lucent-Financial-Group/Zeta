// full-ai-cluster/tools/zflash-lib.test.ts
//
// CI test cascade #2 (per Aaron 2026-05-26 — "any parts we can test
// in siolate are candidates for more unit like tests instead of full
// integration tests"). Pure-logic Bun unit tests for the zflash-lib
// extractions. Catches:
//
//   - RFC1123 hostname regex regressions (iter-5.2 + iter-5.2.2
//     mirrored in zflash.ts + zeta-install.sh; drift detection)
//   - diskutil-output parser regressions (iter-4.4 mount_msdos
//     added MBR 0xEF support after 2026-05-26 empirical test;
//     these tests pin the parser against representative outputs)
//   - auto-name format regressions (iter-5.2.1; node-<6hex>)
//
// Run via: bun test full-ai-cluster/tools/zflash-lib.test.ts
// Or as part of the full suite: bun test

import { describe, expect, test } from "bun:test";
import {
  generateRandomNodeName,
  isValidHostname,
  parseFatPartitionFromDiskutilList,
  parseOutputFileMarker,
  VALID_HOSTNAME_REGEX,
} from "./zflash-lib";

describe("VALID_HOSTNAME_REGEX / isValidHostname", () => {
  test("exports the regex directly for cross-substrate sync verification", () => {
    // The bash equivalent in zeta-install.sh greps with the regex pattern
    // `^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$`. Pin the JS source
    // shape so cross-substrate drift surfaces here.
    expect(VALID_HOSTNAME_REGEX.source).toBe(
      "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$",
    );
  });

  test("accepts simple lowercase name", () => {
    expect(isValidHostname("pikachu")).toBe(true);
  });

  test("accepts mixed-case name", () => {
    expect(isValidHostname("PikachuNode")).toBe(true);
  });

  test("accepts name with hyphens (internal)", () => {
    expect(isValidHostname("worker-gpu-1")).toBe(true);
    expect(isValidHostname("control-plane")).toBe(true);
    expect(isValidHostname("node-a3f9c2")).toBe(true);
  });

  test("accepts single character", () => {
    expect(isValidHostname("a")).toBe(true);
    expect(isValidHostname("Z")).toBe(true);
    expect(isValidHostname("9")).toBe(true);
  });

  test("accepts 63-character name (max length)", () => {
    const name63 = "a".repeat(63);
    expect(name63.length).toBe(63);
    expect(isValidHostname(name63)).toBe(true);
  });

  test("rejects empty string", () => {
    expect(isValidHostname("")).toBe(false);
  });

  test("rejects 64-character name (over max length)", () => {
    const name64 = "a".repeat(64);
    expect(name64.length).toBe(64);
    expect(isValidHostname(name64)).toBe(false);
  });

  test("rejects leading hyphen", () => {
    expect(isValidHostname("-pikachu")).toBe(false);
  });

  test("rejects trailing hyphen", () => {
    expect(isValidHostname("pikachu-")).toBe(false);
  });

  test("rejects leading + trailing hyphen", () => {
    expect(isValidHostname("-pikachu-")).toBe(false);
  });

  test("rejects underscore", () => {
    expect(isValidHostname("pi_kachu")).toBe(false);
  });

  test("rejects dot", () => {
    expect(isValidHostname("pikachu.local")).toBe(false);
  });

  test("rejects space", () => {
    expect(isValidHostname("pikachu node")).toBe(false);
  });

  test("rejects slash", () => {
    expect(isValidHostname("worker/gpu")).toBe(false);
  });
});

describe("parseFatPartitionFromDiskutilList", () => {
  test("matches GPT EFI EFI format", () => {
    const out = `/dev/disk6 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *124.0 GB   disk6
   1:                        EFI EFI                   209.7 MB   disk6s1
   2:                  Apple_APFS Container disk7      123.8 GB   disk6s2`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk6s1");
  });

  test("matches real-world MS-DOS FAT32 format (diskutil empirical output shape)", () => {
    // CI test-cascade #2 finding (2026-05-26): the existing zflash.ts regex
    // documents "DOS_FAT_32" as a matching format, but `\bDOS_FAT\b` doesn't
    // match `DOS_FAT_32` (underscore is a word-char so no \b boundary).
    // Real diskutil output for a FAT32 GPT partition is `MS-DOS FAT32`
    // (with a space), which DOES match `\bMS-DOS\b`. The `DOS_FAT` token
    // in the regex may be vestigial / from a misremembered format —
    // empirically never exercised because all real NixOS isohybrid ISOs
    // post-dd hit the MBR 0xEF path (iter-4.4 substrate). Filed as test-
    // finding; resolve in follow-on by either dropping `DOS_FAT` from the
    // regex OR broadening to `DOS_FAT(_\d+)?` if there's a known consumer.
    const out = `/dev/disk6 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *124.0 GB   disk6
   1:                   MS-DOS FAT32 NIXOS_ISO           65.5 MB    disk6s1`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk6s1");
  });

  test("DOCUMENTS-FINDING: regex `DOS_FAT` token never matches `DOS_FAT_32` (\\b fails on underscore)", () => {
    // Pinning the empirical behavior to surface the regex bug for follow-on
    // resolution. If the regex is broadened to actually match DOS_FAT_NN,
    // delete this test + flip the prior one.
    const out = `   1:                  DOS_FAT_32 NIXOS_ISO              65.5 MB    disk6s1`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe(null);
  });

  test("matches MBR 0xEF format (NixOS isohybrid post-dd; iter-4.4 fix)", () => {
    // This is the exact output shape that broke iter-4.2 on 2026-05-26
    // empirical test and motivated the iter-4.4 0xEF support.
    const out = `/dev/disk6 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *124.0 GB   disk6
   1:                       0xEF                         3.1 MB     disk6s2`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk6s2");
  });

  test("matches MBR 0xEF lowercase", () => {
    const out = `   1:                       0xef                         3.1 MB     disk7s1`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk7s1");
  });

  test("matches MBR 0x0C (FAT32-LBA)", () => {
    const out = `   1:                       0x0C                         100 MB     disk5s2`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk5s2");
  });

  test("matches MBR 0x06 (FAT16)", () => {
    const out = `   1:                       0x06                         32 MB      disk8s3`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk8s3");
  });

  test("returns null when no FAT/EFI partition present", () => {
    const out = `/dev/disk6 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *124.0 GB   disk6
   1:                  Apple_APFS Container disk7      123.8 GB   disk6s1`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe(null);
  });

  test("returns null for empty input", () => {
    expect(parseFatPartitionFromDiskutilList("")).toBe(null);
  });

  test("returns first match when multiple FAT/EFI partitions present", () => {
    // E.g., a disk with both an EFI System Partition and a separate
    // FAT32 data partition — parser returns the first one diskutil lists.
    const out = `   1:                       EFI EFI                   200 MB     disk6s1
   2:                  DOS_FAT_32 DATA                  4.0 GB     disk6s2`;
    expect(parseFatPartitionFromDiskutilList(out)).toBe("/dev/disk6s1");
  });

  test("does not false-positive on 0xEF inside a longer hex string", () => {
    // Defensive: \b boundary prevents matching '0xEFFFFF' or similar.
    const out = `   1:                       0xEFFFFF                     100 MB     disk6s2`;
    // The \b at the end of 0x(EF) is on hex-char boundary which counts
    // as word-char; 'EF' followed by 'F' is NOT a word boundary. So no
    // match expected.
    expect(parseFatPartitionFromDiskutilList(out)).toBe(null);
  });
});

describe("generateRandomNodeName", () => {
  test("produces `node-` prefix", () => {
    const name = generateRandomNodeName();
    expect(name.startsWith("node-")).toBe(true);
  });

  test("produces 6-hex suffix (11 chars total: 'node-' + 6 hex)", () => {
    const name = generateRandomNodeName();
    expect(name.length).toBe(11);
    expect(/^node-[0-9a-f]{6}$/.test(name)).toBe(true);
  });

  test("output passes RFC1123 validation", () => {
    const name = generateRandomNodeName();
    expect(isValidHostname(name)).toBe(true);
  });

  test("deterministic with injected RNG (testability check)", () => {
    const fixedRng = (_n: number): Uint8Array => new Uint8Array([0xa3, 0xf9, 0xc2]);
    const name = generateRandomNodeName(fixedRng);
    expect(name).toBe("node-a3f9c2");
  });

  test("two calls produce different names with default RNG", () => {
    // Vanishingly unlikely to collide (1 in 16M); good signal that RNG is wired
    const a = generateRandomNodeName();
    const b = generateRandomNodeName();
    expect(a).not.toBe(b);
  });
});

describe("parseOutputFileMarker", () => {
  test("matches standard peer-call output-file marker", () => {
    const line = "OUTPUT-FILE: /tmp/peer-call-output/2026-05-26-grok-build-a3f9c2.md";
    expect(parseOutputFileMarker(line)).toBe(
      "/tmp/peer-call-output/2026-05-26-grok-build-a3f9c2.md",
    );
  });

  test("returns null for non-matching line", () => {
    expect(parseOutputFileMarker("some other line")).toBe(null);
    expect(parseOutputFileMarker("")).toBe(null);
    expect(parseOutputFileMarker("output-file: lowercase fails")).toBe(null);
  });

  test("trims trailing whitespace from path", () => {
    expect(parseOutputFileMarker("OUTPUT-FILE: /tmp/out.md   ")).toBe("/tmp/out.md");
  });
});
