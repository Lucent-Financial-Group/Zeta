import { describe, expect, it } from "bun:test";
import {
  QEMU_NVME_DEFAULT_DRIVE_ID,
  QEMU_NVME_NAMESPACE,
  QEMU_NVME_TEST_SERIAL,
  isHostNvmeNamespacePath,
  qemuNvmeNamespaceArgs,
  qemuNvmeSerialError,
} from "./qemu-nvme-namespace.ts";

describe("qemu-nvme-namespace", () => {
  it("markers do not claim physical metal or nvme format", () => {
    expect(QEMU_NVME_NAMESPACE.noMetalClaim).toContain("no physical NVMe claim");
    expect(QEMU_NVME_NAMESPACE.noFormat).toContain("never emits nvme format");
    expect(QEMU_NVME_NAMESPACE.guestVisible).toContain("not a host namespace");
  });

  it("default argv is QEMU file-backed nvme, not a host device", () => {
    const planned = qemuNvmeNamespaceArgs({ file: "nvm.img" });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.serial).toBe(QEMU_NVME_TEST_SERIAL);
    expect(planned.driveId).toBe(QEMU_NVME_DEFAULT_DRIVE_ID);
    expect(planned.drive).toBe("file=nvm.img,if=none,id=nvm,format=raw");
    expect(planned.device).toBe(`nvme,serial=${QEMU_NVME_TEST_SERIAL},drive=nvm`);
    expect(planned.argv).toEqual(["-drive", planned.drive, "-device", planned.device]);
    expect(planned.argv.join(" ")).not.toContain("nvme format");
    expect(planned.argv.join(" ")).not.toContain("/dev/nvme");
  });

  it("refuses host NVMe device nodes so tests cannot format them", () => {
    expect(isHostNvmeNamespacePath("/dev/nvme0n1")).toBe(true);
    expect(isHostNvmeNamespacePath("/dev/nvme0")).toBe(true);
    expect(isHostNvmeNamespacePath("nvme://0000:e2:00.0/1")).toBe(true);
    expect(isHostNvmeNamespacePath("\\\\.\\PhysicalDrive1")).toBe(true);
    expect(isHostNvmeNamespacePath("nvm.img")).toBe(false);
    expect(isHostNvmeNamespacePath("/tmp/zeta-nvme.img")).toBe(false);
    expect(qemuNvmeNamespaceArgs({ file: "/dev/nvme0n1" })).toMatchObject({
      ok: false,
      error: "QEMU NVMe test backing must be a file image, not a host NVMe namespace",
    });
  });

  it("refuses empty or boundary-whitespace serial rather than emitting it", () => {
    expect(qemuNvmeSerialError("")).not.toBeNull();
    expect(qemuNvmeSerialError(" ZETA-QEMU-NVME-001")).not.toBeNull();
    expect(qemuNvmeSerialError("ZETA-QEMU-NVME-001 ")).not.toBeNull();
    expect(qemuNvmeNamespaceArgs({ file: "nvm.img", serial: "" })).toMatchObject({
      ok: false,
    });
  });

  it("refuses comma and equals — they split QEMU -device parsing", () => {
    expect(qemuNvmeSerialError("A,B")).not.toBeNull();
    expect(qemuNvmeSerialError("A=B")).not.toBeNull();
    expect(qemuNvmeNamespaceArgs({ file: "nvm,img" })).toMatchObject({ ok: false });
    expect(qemuNvmeNamespaceArgs({ file: "nvm.img", driveId: "n=vm" })).toMatchObject({
      ok: false,
    });
  });
});
