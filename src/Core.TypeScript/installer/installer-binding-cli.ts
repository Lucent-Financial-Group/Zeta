/**
 * CLI binding-factor selection for persist/restore.
 * Default remains usbUuid. Optional --usb-iserial / --uefi-keyfile override.
 * Mutually exclusive extras. No TPM / Touch ID.
 */

import type { CredentialBindingFactorKind } from "./credential-binding-model.ts";
import { isUefiKeyfileError, keyfileBindingMaterial } from "./uefi-keyfile-esp.ts";

export type CliBindingSelection = {
  readonly factor: CredentialBindingFactorKind;
  readonly material: string;
};

function isExactNonEmpty(value: string | null): value is string {
  return value !== null && value.length > 0 && value === value.trim();
}

export function selectCliBindingMaterial(input: {
  readonly usbUuid: string | null;
  readonly usbISerial: string | null;
  readonly uefiKeyfileBytes: Uint8Array | null;
}): CliBindingSelection | { readonly error: string } {
  const hasIserial = isExactNonEmpty(input.usbISerial);
  const hasKeyfile = input.uefiKeyfileBytes !== null;
  if (hasIserial && hasKeyfile) {
    return { error: "--usb-iserial and --uefi-keyfile are mutually exclusive" };
  }
  if (hasKeyfile) {
    const material = keyfileBindingMaterial(input.uefiKeyfileBytes!);
    if (isUefiKeyfileError(material)) return { error: material.error };
    return { factor: "uefiKeyfile", material };
  }
  if (hasIserial) {
    return { factor: "usbISerial", material: input.usbISerial };
  }
  if (isExactNonEmpty(input.usbUuid)) {
    return { factor: "usbUuid", material: input.usbUuid };
  }
  return { error: "binding factor required: --usb-uuid, --usb-iserial, or --uefi-keyfile" };
}
