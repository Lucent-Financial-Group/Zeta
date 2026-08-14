/**
 * The complete non-Go WebAssembly asset contract for the GitHub Pages DLA site.
 * Sources are committed Zeta artifacts; outputs are copied into the Vite public
 * tree by the declared Pages builder. This keeps a Pages deployment from silently
 * fetching a host-specific storage path that resolves to HTML rather than WASM.
 */
export const IDENTITY_DLA_PAGES_WASM_ASSETS = [
  { source: "src/wasm-dla/bytelock/dla-canonical-wat.wasm", output: "wat.wasm" },
  { source: "src/wasm-dla/zig/dla.wasm", output: "zig.wasm" },
  { source: "src/wasm-dla/c/dla-emcc.wasm", output: "emcc.wasm" },
  { source: "src/wasm-dla/c/dla-llvm-opt.wasm", output: "llvm.wasm" },
  { source: "src/wasm-dla/rust/dla-opt.wasm", output: "rust.wasm" },
  { source: "src/wasm-dla/bytelock/dla-canonical-asc.wasm", output: "asc.wasm" },
] as const;

export function hasWasmMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
}
