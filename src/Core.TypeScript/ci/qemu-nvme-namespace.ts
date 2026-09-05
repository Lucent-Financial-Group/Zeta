/**
 * QEMU NVMe namespace argv — file-image backing only.
 *
 * QEMU docs (`system/devices/nvme.html`) simplest form:
 *   -drive file=nvm.img,if=none,id=nvm
 *   -device nvme,serial=...,drive=nvm
 *
 * Backing is a regular file. This module never points at a host NVMe
 * namespace and never emits `nvme format`. Zeta FORMAT / ZFL2 is our
 * volume identity, not the NVMe Format NVM admin command.
 *
 * Not a native driver. Not a metal claim. CI unit tests stay on
 * `SimulatedBlockIo`. Sibling pattern: `qemu-usb-storage.ts`.
 */

export const QEMU_NVME_TEST_SERIAL = "ZETA-QEMU-NVME-001" as const;

export const QEMU_NVME_DEFAULT_DRIVE_ID = "nvm" as const;

export const QEMU_NVME_NAMESPACE = {
  guestVisible: "[qemu-nvme-namespace] serial= is NVMe Identify SN, not a host namespace",
  noMetalClaim: "[qemu-nvme-namespace] file-image backing; no physical NVMe claim",
  noFormat: "[qemu-nvme-namespace] never emits nvme format; Zeta FORMAT/ZFL2 is volume identity",
} as const;

/**
 * True when `path` names a host NVMe device node (or a Windows physical
 * disk), not a regular file image. Tests must not format these.
 */
export function isHostNvmeNamespacePath(path: string): boolean {
  const n = path.replace(/\\/g, "/").toLowerCase();
  if (n.includes("/dev/nvme")) return true;
  if (n.startsWith("nvme://")) return true;
  if (n.includes("physicaldrive")) return true;
  return false;
}

export function qemuNvmeSerialError(serial: string): string | null {
  if (serial.length === 0) return "NVMe serial must be non-empty";
  if (serial !== serial.trim()) {
    return "NVMe serial must not have leading or trailing whitespace";
  }
  if (serial.includes(",") || serial.includes("=")) {
    return "NVMe serial must not contain comma or equals (QEMU -device parser)";
  }
  return null;
}

function qemuNvmeIdError(id: string, label: string): string | null {
  if (id.length === 0) return `${label} must be non-empty`;
  if (id.includes(",") || id.includes("=")) {
    return `${label} must not contain comma or equals (QEMU -device parser)`;
  }
  return null;
}

export type QemuNvmeNamespacePlan =
  | {
      readonly ok: true;
      readonly file: string;
      readonly driveId: string;
      readonly serial: string;
      readonly drive: string;
      readonly device: string;
      readonly argv: readonly string[];
    }
  | { readonly ok: false; readonly error: string };

/**
 * Plan QEMU argv for one file-backed NVMe namespace.
 * Does not create the image, start QEMU, or format anything.
 */
export function qemuNvmeNamespaceArgs(opts: {
  readonly file: string;
  readonly driveId?: string;
  readonly serial?: string;
}): QemuNvmeNamespacePlan {
  const file = opts.file;
  if (file.length === 0) return { ok: false, error: "NVMe backing file path is required" };
  if (file.includes(",") || file.includes("=")) {
    return { ok: false, error: "NVMe backing file path must not contain comma or equals" };
  }
  if (isHostNvmeNamespacePath(file)) {
    return {
      ok: false,
      error: "QEMU NVMe test backing must be a file image, not a host NVMe namespace",
    };
  }

  const driveId = opts.driveId ?? QEMU_NVME_DEFAULT_DRIVE_ID;
  const idErr = qemuNvmeIdError(driveId, "NVMe drive id");
  if (idErr !== null) return { ok: false, error: idErr };

  const serial = opts.serial ?? QEMU_NVME_TEST_SERIAL;
  const serialErr = qemuNvmeSerialError(serial);
  if (serialErr !== null) return { ok: false, error: serialErr };

  const drive = `file=${file},if=none,id=${driveId},format=raw`;
  const device = `nvme,serial=${serial},drive=${driveId}`;
  return {
    ok: true,
    file,
    driveId,
    serial,
    drive,
    device,
    argv: ["-drive", drive, "-device", device],
  };
}
