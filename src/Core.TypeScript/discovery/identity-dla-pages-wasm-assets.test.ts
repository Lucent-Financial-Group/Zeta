import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasWasmMagic, IDENTITY_DLA_PAGES_WASM_ASSETS } from "./identity-dla-pages-wasm-assets";

describe("GitHub Pages WebAssembly asset contract", () => {
  test("PWA-1: each declared browser artifact exists in Zeta and begins with the WebAssembly magic bytes", () => {
    const root = process.cwd();
    for (const asset of IDENTITY_DLA_PAGES_WASM_ASSETS) {
      const source = join(root, asset.source);
      expect(existsSync(source)).toBeTrue();
      expect(hasWasmMagic(readFileSync(source))).toBeTrue();
    }
  });

  test("PWA-2 FAULT INJECTION: an archive or HTML-shaped response is not treated as a WebAssembly module", () => {
    expect(hasWasmMagic(Buffer.from("!<arch>\n"))).toBeFalse();
    expect(hasWasmMagic(Buffer.from("<!doctype html>"))).toBeFalse();
  });

  test("PWA-3: every staged non-Go compiler module instantiates with the browser loader's declared imports", () => {
    const root = process.cwd();
    for (const asset of IDENTITY_DLA_PAGES_WASM_ASSETS) {
      const bytes = readFileSync(join(root, asset.source));
      const imports: WebAssembly.Imports = asset.output === "wat.wasm"
        ? { math: { cos_f32: Math.cos, sin_f32: Math.sin } }
        : asset.output === "asc.wasm"
          ? { env: { abort: () => {} }, "dla-canonical": { cos_f32: Math.cos, sin_f32: Math.sin } }
          : {};
      const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes), imports);
      expect(Object.keys(instance.exports).length).toBeGreaterThan(0);
    }
  });
});
