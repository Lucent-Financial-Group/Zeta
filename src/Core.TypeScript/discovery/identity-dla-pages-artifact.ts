import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GO_PAGES_ASSET, GO_PAGES_BRIDGE, PAGES_WASM_ASSETS } from "./identity-dla-pages-wasm-assets";

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d] as const;
const CURRENT_PROPOSAL_MARKER = "authorize this device";
const RETIRED_PROPOSAL_MARKER = "GitHub's own issue form authenticates";
const RECEIPT_DETAIL_ROUTE = "evidence-seam/receipt/";
const RECEIPT_DETAIL_MARKER = "COPY RECEIPT ID";
const SOURCE_MANIFEST_ROUTE = "evidence-seam/sources";
const SOURCE_MANIFEST_MARKER = "SOURCE MANIFEST";

export type PagesArtifactEvidence = Readonly<{
  readonly entryAsset: string;
  readonly authorizationAsset: string;
  readonly evidenceRouteAsset: string;
  readonly evidenceReaderAsset: string;
  readonly receiptDetailAsset: string;
  readonly sourceManifestAsset: string;
  readonly proposalMarker: typeof CURRENT_PROPOSAL_MARKER;
  readonly wasmAssets: readonly string[];
  /**
   * DERIVED BY LOOKING, never declared. The Go substrate is built during the Pages
   * build rather than committed, so whether it shipped is a property of THIS artifact.
   * Writing `"published"` unconditionally would reproduce, in the evidence file, the
   * exact defect this field exists to close in the UI.
   */
  readonly goOracle: "published" | "absent";
}>;

function assertWasmMagic(file: string): void {
  const bytes = readFileSync(file);
  if (bytes.length < WASM_MAGIC.length || !WASM_MAGIC.every((value, index) => bytes[index] === value)) {
    throw new Error(`teaching error: published Pages asset is not a WebAssembly binary: ${file}`);
  }
}

/**
 * Proves the exact artifact uploaded to Pages contains the current verifier UI and
 * repository-owned WASM bytes. It intentionally checks built output, not source,
 * so a stale copy path cannot self-certify from current TypeScript source.
 */
export function verifyPagesArtifact(artifactRoot: string): PagesArtifactEvidence {
  const indexPath = join(artifactRoot, "index.html");
  const index = readFileSync(indexPath, "utf8");
  const entryMatch = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(index);
  if (!entryMatch?.[1]) throw new Error("teaching error: Pages index does not reference a hashed JavaScript entry asset");
  const entryAsset = entryMatch[1];
  const assetsDirectory = join(artifactRoot, "assets");
  const scriptAssets = readdirSync(assetsDirectory).filter(asset => asset.endsWith(".js"));
  const scripts = scriptAssets.map(asset => ({ asset, body: readFileSync(join(assetsDirectory, asset), "utf8") }));
  const authorizationAsset = scripts.find(script => script.body.includes(CURRENT_PROPOSAL_MARKER))?.asset;
  if (!authorizationAsset) {
    throw new Error("teaching error: Pages artifact omits the current one-time device authorization control");
  }
  // The route/seam marker belongs to the ENTRY chunk by construction -- it is what
  // makes the entry the routing shell. Checking ONLY entryAsset's own body (rather
  // than scanning every script for the substring) was a real, silently order-
  // dependent defect: a lazily-loaded page chunk that itself references the
  // evidence-seam route (e.g. "evidence-seam docs/room-evidence/index.json", the
  // realistic shape of EvidenceRoomPage's own body) ALSO contains the substring, so
  // `scripts.find(...)` could return either asset depending on `readdirSync`'s
  // filesystem-ordering -- unspecified by POSIX, and observed to differ between
  // CI runner filesystems for the identical fixture content (run 35790030804 vs the
  // passing main-tip run, same code, same test, different order). Anchoring to the
  // already-unambiguous `entryAsset` (parsed from index.html's own hashed script
  // tag) makes the check deterministic instead of merely usually-lucky.
  const entryScript = scripts.find(script => script.asset === entryAsset);
  const evidenceRouteAsset = entryScript?.body.includes("evidence-seam") ? entryScript.asset : undefined;
  if (!evidenceRouteAsset) {
    throw new Error("teaching error: Pages artifact omits the evidence-room route");
  }
  const evidenceReaderAsset = scripts.find(script => script.body.includes("room-evidence"))?.asset;
  if (!evidenceReaderAsset) {
    throw new Error("teaching error: Pages artifact omits the durable room-evidence reader");
  }
  if (!scripts.some(script => script.body.includes(RECEIPT_DETAIL_ROUTE))) {
    throw new Error("teaching error: Pages artifact omits the receipt-detail route");
  }
  const receiptDetailAsset = scripts.find(
    script => script.asset.startsWith("EvidenceReceiptDetailPage-") && script.body.includes(RECEIPT_DETAIL_MARKER),
  )?.asset;
  if (!receiptDetailAsset) {
    throw new Error("teaching error: Pages artifact omits the receipt-detail page");
  }
  if (!scripts.some(script => script.body.includes(SOURCE_MANIFEST_ROUTE))) {
    throw new Error("teaching error: Pages artifact omits the source-manifest route");
  }
  const sourceManifestAsset = scripts.find(
    script => script.asset.startsWith("EvidenceSourceManifestPage-") && script.body.includes(SOURCE_MANIFEST_MARKER),
  )?.asset;
  if (!sourceManifestAsset) {
    throw new Error("teaching error: Pages artifact omits the source-manifest page");
  }
  if (scripts.some(script => script.body.includes(RETIRED_PROPOSAL_MARKER))) {
    throw new Error("teaching error: Pages artifact still contains the retired GitHub issue-form proposal transport");
  }
  for (const asset of PAGES_WASM_ASSETS) assertWasmMagic(join(artifactRoot, asset.published));

  // The Go pair: present ⇒ verified and listed; absent ⇒ said out loud. A module
  // published without its runtime bridge counts as ABSENT, because it cannot run —
  // "the file is there" is not the property the page depends on.
  const goModule = join(artifactRoot, GO_PAGES_ASSET.published);
  const goBridge = join(artifactRoot, GO_PAGES_BRIDGE.published);
  const goPublished = existsSync(goModule) && existsSync(goBridge);
  if (goPublished) assertWasmMagic(goModule);

  return {
    entryAsset,
    authorizationAsset,
    evidenceRouteAsset,
    evidenceReaderAsset,
    receiptDetailAsset,
    sourceManifestAsset,
    proposalMarker: CURRENT_PROPOSAL_MARKER,
    wasmAssets: [
      ...PAGES_WASM_ASSETS.map(asset => asset.published),
      ...(goPublished ? [GO_PAGES_ASSET.published, GO_PAGES_BRIDGE.published] : []),
    ],
    goOracle: goPublished ? "published" : "absent",
  };
}

export function writePagesArtifactEvidence(artifactRoot: string, revision: string): PagesArtifactEvidence {
  const evidence = verifyPagesArtifact(artifactRoot);
  writeFileSync(
    join(artifactRoot, "identity-dla-build-evidence.json"),
    `${JSON.stringify({ schema: "zeta.identity-dla-pages-artifact.v1", revision, ...evidence }, null, 2)}\n`,
    "utf8",
  );
  return evidence;
}
