import { sha256Hex } from "./sha256";

interface Vec {
  id: string;
  input_utf8?: string;
  input_hex?: string;
  expected_hex: string;
}

function inputBytes(v: Vec): Uint8Array {
  if (typeof v.input_utf8 === "string") return new TextEncoder().encode(v.input_utf8);
  if (typeof v.input_hex === "string") {
    const h = v.input_hex;
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  throw new Error(`vector ${v.id}: needs input_utf8 or input_hex`);
}

const vectors = (Bun.YAML.parse(await Bun.file("vectors.yaml").text()) as { vectors: Vec[] })
  .vectors;
const results: Record<string, string> = {};
let mismatches = 0;

for (const v of vectors) {
  const hex = sha256Hex(inputBytes(v));
  results[v.id] = hex;
  if (hex !== v.expected_hex) {
    mismatches++;
    console.error(`Hex MISMATCH ${v.id}: got ${hex} expected ${v.expected_hex}`);
  }
}

await Bun.write("ts-output.json", JSON.stringify(results, null, 2));
console.log(
  `Cross-verify: ${vectors.length} vectors. Hex matches expected ${vectors.length - mismatches}/${vectors.length}.`,
);

// Enforce: non-zero exit on any mismatch so CI / automation catches regressions.
if (mismatches > 0) {
  console.error(`FAIL: ${mismatches} hex mismatch`);
  process.exit(1);
}
