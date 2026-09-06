#!/usr/bin/env bun
/**
 * src/Core.TypeScript/installer/usb-hsm-companion.ts
 *
 * `--bake-cred` growth for HSM-*talk* on the repair stick.
 * Classifier kinds live in seal-emulator-rung.ts (USB_HSM_COMPANION).
 * This module is the bake-cred gate: companions are references
 * (module path, connector URL, authkey *label*, domain map,
 * OpenBao env *name*). PIN bytes, Shamir shares, OP_SESSION, and
 * a brand type in the volume are refused as originals.
 *
 * Companions restore under /etc/zeta/seal/ on the host. They are
 * host-only — never zeta-host-creds Secrets.
 *
 * Cite: seal-emulator-rung.ts, zeta-cred-handlers.ts,
 * zeta-creds-to-k8s.ts, pkcs11-hostpath-overlay.ts,
 * openbao.org/docs/configuration/seal/pkcs11/.
 */

import { USB_PKCS11_MODULE_POINTER } from "../cluster/pkcs11-hostpath-overlay.ts";
import { USB_HSM_COMPANION, USB_HSM_FORBIDDEN, classifyUsbRepairArtifact } from "../cluster/seal-emulator-rung.ts";

export const USB_HSM_COMPANION_IDS = USB_HSM_COMPANION;
export const USB_HSM_FORBIDDEN_IDS = USB_HSM_FORBIDDEN;

/** Operator-shaped aliases for the forbidden originals. */
export const FORBIDDEN_BAKE_CRED_ALIASES = [
  "pin",
  "PIN",
  "BAO_HSM_PIN",
  "VAULT_HSM_PIN",
  "OP_SESSION",
  "op_session",
  "shamir",
  "wrap-key",
  "wrap_key",
] as const;

/**
 * Discriminated error carrier. The `_tag` field discriminates the failure
 * branch from a parsed JSON object (a `Record<string, unknown>` whose index
 * signature would otherwise make `"error" in obj` non-narrowing, leaving
 * `obj.error` typed as `unknown`).
 */
interface ValidationError {
  readonly _tag: "error";
  readonly error: string;
}

function validationError(error: string): ValidationError {
  return { _tag: "error", error };
}

/**
 * Type guard that narrows a helper result to its failure branch. Using a
 * predicate (rather than `"error" in x`) is required because the success
 * branch is a `Record<string, unknown>` whose index signature makes the
 * `in` operator non-narrowing.
 */
function isValidationError(value: unknown): value is ValidationError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _tag?: unknown })._tag === "error" &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

const SECRET_JSON_KEY = /^(pin|password|secret|authkey|auth_key|unseal|wrap_key|wrapkey|op_session)$/i;
const ENV_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
const HEX_KEY_MATERIAL = /^[0-9a-fA-F]{32,}$/;

export function refuseForbiddenBakeCredId(id: string): string | null {
  if (classifyUsbRepairArtifact(id) === "forbidden") {
    return `--bake-cred refuses "${id}": PIN plaintext, Shamir shares, OP_SESSION, and brand types are not originals on the repair stick`;
  }
  if ((FORBIDDEN_BAKE_CRED_ALIASES as readonly string[]).includes(id)) {
    return `--bake-cred refuses "${id}": that is an original, not an HSM-talk companion. Point at the env name with openbao-seal-env-pointer.`;
  }
  return null;
}

function asUtf8Text(value: Buffer, id: string): string | ValidationError {
  if (value.length === 0) return validationError(`${id} value must be non-empty`);
  if (value.includes(0)) return validationError(`${id} is a reference, not a binary blob`);
  if (value.length >= 4 && value[0] === 0x7f && value[1] === 0x45 && value[2] === 0x4c && value[3] === 0x46) {
    return validationError(`${id} is a module path, not the .so bytes`);
  }
  return value.toString("utf8").trim();
}

function parseJsonObject(text: string, id: string): Record<string, unknown> | ValidationError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return validationError(`${id} value must be a JSON object`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return validationError(`${id} value must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (SECRET_JSON_KEY.test(key)) {
      return validationError(`${id} must not carry ${key} (reference only; PIN/authkey bytes stay off the stick)`);
    }
  }
  return record;
}

export function validatePkcs11ModulePath(value: Buffer): string | null {
  const text = asUtf8Text(value, "pkcs11-module-path");
  if (typeof text !== "string") return text.error;
  if (text.includes("\n") || text.includes("\r")) return "pkcs11-module-path must be a single path line";
  if (text === USB_PKCS11_MODULE_POINTER) {
    return "pkcs11-module-path is the restore file, not the .so";
  }
  if (!text.startsWith("/")) return "pkcs11-module-path must be an absolute path";
  if (!text.includes("/")) return "pkcs11-module-path must be a path, not a brand name";
  const lower = text.toLowerCase();
  if (lower === "/yubihsm" || lower === "/smartcard-hsm" || lower === "/yubikey") {
    return "pkcs11-module-path is a .so path, not a brand type in the volume";
  }
  if (lower.includes("softhsm") || lower.includes("swtpm")) {
    return "pkcs11-module-path is a metal module, not a CI emulator (SoftHSM/swtpm)";
  }
  if (!lower.endsWith(".so") && !lower.includes("pkcs11")) {
    return "pkcs11-module-path must name a PKCS#11 module (.so or a pkcs11 path)";
  }
  return null;
}

export function validateConnectorConfig(value: Buffer): string | null {
  const text = asUtf8Text(value, "connector-config");
  if (typeof text !== "string") return text.error;
  const obj = parseJsonObject(text, "connector-config");
  if (isValidationError(obj)) return obj.error;
  return null;
}

export function validateAuthkeyReference(value: Buffer): string | null {
  const text = asUtf8Text(value, "authkey-reference");
  if (typeof text !== "string") return text.error;
  if (text.includes("\n") || text.includes("\r")) return "authkey-reference must be a single label";
  if (HEX_KEY_MATERIAL.test(text)) {
    return "authkey-reference is a label, not key material";
  }
  return null;
}

export function validateDomainMap(value: Buffer): string | null {
  const text = asUtf8Text(value, "domain-map");
  if (typeof text !== "string") return text.error;
  const obj = parseJsonObject(text, "domain-map");
  if (isValidationError(obj)) return obj.error;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== "string" || val.length === 0) {
      return "domain-map values must be non-empty role labels";
    }
    if (HEX_KEY_MATERIAL.test(val) || HEX_KEY_MATERIAL.test(key)) {
      return "domain-map carries domain ids and labels, not wrap keys";
    }
  }
  return null;
}

export function validateOpenbaoSealEnvPointer(value: Buffer): string | null {
  const text = asUtf8Text(value, "openbao-seal-env-pointer");
  if (typeof text !== "string") return text.error;
  if (text.includes("=")) {
    return "openbao-seal-env-pointer is the env *name* (e.g. BAO_HSM_PIN), not NAME=value";
  }
  if (!ENV_NAME.test(text)) {
    return "openbao-seal-env-pointer must be an env var name like BAO_HSM_PIN";
  }
  return null;
}

export function validateCompanionValue(id: string, value: Buffer): string | null {
  switch (id) {
    case "pkcs11-module-path":
      return validatePkcs11ModulePath(value);
    case "connector-config":
      return validateConnectorConfig(value);
    case "authkey-reference":
      return validateAuthkeyReference(value);
    case "domain-map":
      return validateDomainMap(value);
    case "openbao-seal-env-pointer":
      return validateOpenbaoSealEnvPointer(value);
    default:
      return `no companion validator for "${id}"`;
  }
}
