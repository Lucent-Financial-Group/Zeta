import { describe, expect, it } from "bun:test";
import { selectCliBindingMaterial } from "./installer-binding-cli.ts";
import { UEFI_KEYFILE_BYTES } from "./uefi-keyfile-esp.ts";

describe("selectCliBindingMaterial", () => {
  it("defaults to usbUuid", () => {
    const selected = selectCliBindingMaterial({
      usbUuid: "uuid-1",
      usbISerial: null,
      uefiKeyfileBytes: null,
    });
    expect("error" in selected).toBe(false);
    if ("error" in selected) return;
    expect(selected.factor).toBe("usbUuid");
    expect(selected.material).toBe("uuid-1");
  });

  it("prefers usbISerial over uuid when set", () => {
    const selected = selectCliBindingMaterial({
      usbUuid: "uuid-1",
      usbISerial: "ZETA-STICK-001",
      uefiKeyfileBytes: null,
    });
    expect("error" in selected).toBe(false);
    if ("error" in selected) return;
    expect(selected.factor).toBe("usbISerial");
    expect(selected.material).toBe("ZETA-STICK-001");
  });

  it("rejects iserial and keyfile together", () => {
    const selected = selectCliBindingMaterial({
      usbUuid: null,
      usbISerial: "AAA",
      uefiKeyfileBytes: new Uint8Array(UEFI_KEYFILE_BYTES).fill(1),
    });
    expect("error" in selected).toBe(true);
  });

  it("errors when no factor is present", () => {
    const selected = selectCliBindingMaterial({
      usbUuid: null,
      usbISerial: null,
      uefiKeyfileBytes: null,
    });
    expect("error" in selected).toBe(true);
  });

  it("FAULT INJECTION: rejects a whitespace-altered UUID instead of normalizing its key material", () => {
    const selected = selectCliBindingMaterial({
      usbUuid: "uuid-1 ",
      usbISerial: null,
      uefiKeyfileBytes: null,
    });
    expect(selected).toEqual({ error: "binding factor required: --usb-uuid, --usb-iserial, or --uefi-keyfile" });
  });

  it("FAULT INJECTION: rejects a whitespace-altered USB serial instead of normalizing its key material", () => {
    const selected = selectCliBindingMaterial({
      usbUuid: "uuid-1",
      usbISerial: "ZETA-STICK-001 ",
      uefiKeyfileBytes: null,
    });
    expect(selected).toEqual({ factor: "usbUuid", material: "uuid-1" });
  });
});
