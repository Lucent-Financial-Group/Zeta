# Ace CLI slice 4 — inline-URL transitive dependency resolution (design)

- **Date:** 2026-06-01
- **Slice:** 4 (dependency resolution)
- **Status:** approved (Aaron 2026-06-01) — spec for implementation
- **Builds on:** slice 1 (content-addressed store), slice 2 (content-hash integrity), slice 3 (Ed25519 authenticity)
- **Agenda:** `docs/agendas/ace-package-manager/AGENDA.md` (lifecycle stages distribute → discover → verify → grow)
- **Backlog:** B-0288

## Goal

A package manifest may declare dependencies on other packages. `ace install`
resolves the full transitive dependency graph, fetches and verifies every node
(reusing the slice-2 content-hash gate and the slice-3 signature gate), and
installs in dependency order (leaves first, root last).

This slice uses the **inline-URL** resolution model: each dependency edge
carries its own resolved location and integrity pin. There is **no registry and
no version solving** — those are slice 5. The inline-pinned graph this slice
resolves is exactly the shape a future registry resolver produces *after*
solving, so slice 4 is the lower half of the registry design, not a throwaway
detour.

## Decisions (this spec locks them)

| # | Decision | Choice |
|---|---|---|
| D1 | Resolution model | **Inline-URL** — dependency edges carry `{name, version, url, content_hash}`. Registry + semver = slice 5. |
| D2 | Graph shape | **Recursive / transitive** — a fetched dependency is itself a full package with its own `dependencies`; resolution recurses. |
| D3 | Version skew (same name, different version, in one graph) | **Strict-refuse** — hard error, install nothing. One name → one version per install graph. Easiest to relax later behind a flag. |
| D4 | Same name + same version + different `content_hash` | **Always hard-refuse** (`tamper`) — two different byte-sets cannot both be that declared version. |
| D5 | Diamond (same name + same version + same `content_hash` via multiple paths) | **Dedup** — visit/install once. |
| D6 | Atomicity | **Resolve-and-verify the whole graph FIRST**, then install. Any resolution/verification failure → install nothing. |
| D7 | Lockfile | **None this slice.** The manifest's inline pins already *are* the transitive lock. (Lockfile becomes relevant in slice 5, where a solver's output needs pinning.) |
| D8 | Signature policy | Per-node slice-3 gate. A present-but-bad / untrusted / unsupported-algo signature on **any** node hard-refuses always. `--allow-no-signature` applies **graph-wide** and only permits nodes that carry **no** signature. |

## Manifest extension

`AceManifest` gains one optional field (in `tools/ace/store.ts`):

```ts
export interface AceDependency {
  readonly name: string;        // identity — used for skew detection + error messages
  readonly version: string;     // identity — used for skew detection + error messages
  readonly url: string;         // where to fetch the dependency package (http(s) or path)
  readonly content_hash: string; // integrity pin — MUST equal the fetched dep's manifest.content_hash
}

export interface AceManifest {
  readonly format_version: number;
  readonly name: string;
  readonly version: string;
  readonly content_hash: string;
  readonly description?: string;
  readonly signature?: { readonly algo: string; readonly key_id: string; readonly sig: string };
  readonly dependencies?: ReadonlyArray<AceDependency>;   // NEW — absent = leaf
}
```

Absent `dependencies` ⇒ leaf package ⇒ **existing single-package installs are
byte-for-byte unaffected** (back-compat). `content_hash` here is the dependency's
own slice-2 hash (`sha256(JSON.stringify(files))`), NOT a hash of the dependency's
whole package JSON — so the parent's pin and the dependency's self-verification
agree.

## Resolver — `tools/ace/resolve.ts` (new, pure)

A pure module with the fetch boundary **injected**, so tests run fully in-memory
and production wires in `fetch` / `readFileSync`.

```ts
// Injected fetch: given a dependency URL/path, return the raw package JSON text.
export type FetchPackage = (urlOrPath: string) => Promise<string>;

export type ResolveResult =
  | { ok: true; order: ReadonlyArray<AcePackage> }   // topo order, leaves first, root last
  | { ok: false; reason: ResolveReason; detail: string; path: ReadonlyArray<string> };

export type ResolveReason =
  | "version-skew"        // D3: same name, two versions in the graph
  | "tamper"              // D4: same name+version, different content_hash
  | "pin-mismatch"        // parent edge content_hash !== fetched dep manifest.content_hash
  | "bad-content-hash"    // slice-2: dep files do not hash to its manifest.content_hash
  | "bad-signature"       // slice-3: present signature fails verification
  | "untrusted-key"       // slice-3: signature by a key not in the trust store
  | "unsupported-algo"    // slice-3: signature.algo !== "ed25519"
  | "no-signature"        // node carries no signature and --allow-no-signature not given
  | "cycle"               // back-edge in the dependency graph
  | "fetch-failed"        // url/path could not be fetched or parsed as a package
  | "invalid-package";    // fetched JSON is not a well-formed AcePackage

export async function resolve(
  root: AcePackage,
  fetchPackage: FetchPackage,
  trustStore: Map<string, LoadedTrustEntry>,
  opts: { allowNoSignature: boolean },
): Promise<ResolveResult>;
```

### Algorithm

1. Start from `root`. Maintain:
   - `byName: Map<name, {version, content_hash}>` — for skew/tamper/dedup detection
   - `byHash: Map<content_hash, AcePackage>` — resolved nodes (dedup by hash)
   - `visiting: Set<content_hash>` — current DFS stack, for cycle detection
   - `path: string[]` — human-readable dependency path for error messages (`root → A → D`)
2. DFS from the root's `dependencies`. For each edge `{name, version, url, content_hash}`:
   - If `byHash` already has `content_hash` → diamond dedup; skip re-fetch (but still run the skew/tamper checks below against `byName`).
   - Else fetch via `fetchPackage(url)`:
     - fetch/parse failure → `fetch-failed` / `invalid-package`.
     - **slice-2 self-check:** `contentHash(JSON.stringify(dep.files)) === dep.manifest.content_hash` else `bad-content-hash`.
     - **pin check:** `edge.content_hash === dep.manifest.content_hash` else `pin-mismatch`.
     - **slice-3 gate** (`verifySignature(dep.manifest, trustStore)`): map `no-signature` → refuse unless `allowNoSignature`; `bad-signature` / `untrusted-key` / `unsupported-algo` → refuse **always**.
   - **Conflict checks against `byName[name]`:**
     - present with **different version** → `version-skew` (detail names both requirers + versions).
     - present with **same version, different content_hash** → `tamper`.
     - present with same version+hash → dedup (do not recurse again).
     - absent → record, recurse into `dep.manifest.dependencies`.
   - **Cycle:** if `content_hash ∈ visiting` → `cycle` (detail lists the loop).
3. On success, return DFS post-order (leaves first, root last) as `order`.

The resolver verifies; it does **not** touch the filesystem store (that stays
`installPackage`'s job — clean separation).

## Install integration — `tools/ace/ace.ts`

`install` becomes:

1. Read/fetch the **root** package (unchanged from slice 3).
2. Verify the root's own integrity + signature (unchanged slice 2/3 gates).
3. If `root.manifest.dependencies` is absent/empty → install the single package exactly as today (no behavior change for leaf packages).
4. Else call `resolve(root, fetchPackage, loadTrustStore(), {allowNoSignature})`:
   - `ok:false` → print `reason`, `detail`, and the dependency `path`; **exit non-zero; install nothing** (atomic — D6).
   - `ok:true` → `installPackage(storePath, node)` for each node in `order` (leaves first, root last).
5. Print the resolved set on success: `installed 3: D@1.0, A@2.1, root@1.0`.

`fetchPackage` for production: the same source-handling `install` already uses for
the root — `fetch(url).text()` for http(s), `readFileSync` for a path.

## CLI / UX

- `ace install <url-or-path>` — resolves transitively, **no new flag** for the happy path.
- `--allow-no-signature` — unchanged flag, now **graph-wide**: permits *unsigned* nodes anywhere in the graph; never bypasses a present-but-bad/untrusted signature on any node.
- Refusal output names the offending node, the reason, and the dependency path to it. Examples:
  - `version-skew: D required at 1.0 (via root → A) and 2.0 (via root → B) — align on one version`
  - `cycle: root → A → B → A`
  - `pin-mismatch: root → A expected D content_hash sha256:abc… but fetched sha256:def…`
  - `untrusted-key: root → A → D signed by ed25519:… which is not trusted — ace trust add the key`
- Exit codes unchanged: `0` ok · `64` usage · `65` invalid package JSON · `1` refused (any resolution/verification failure).

## Out of scope (explicit)

Deferred to **slice 5** (registry): a name→version→url registry (bundled ∪ user ∪
remote), semver range constraints (`^1.2.0`), version solving, a lockfile, and
multiple-versions-of-same-name. Deferred indefinitely unless needed: remote
registry caching/signing; per-node signature-policy granularity.

## Testing

**`resolve.test.ts`** (pure, injected in-memory fetch):

- linear chain (root → A → B) installs in order B, A, root
- diamond dedup (root → A → D, root → B → D, same D hash) visits/installs D once
- version-skew (A → D@1.0, B → D@2.0) → `version-skew` refuse
- same-version-different-hash (A → D@1.0/hashX, B → D@1.0/hashY) → `tamper` refuse
- cycle (A → B → A) → `cycle` refuse with the loop in `path`
- pin-mismatch (edge hash ≠ fetched manifest hash) → `pin-mismatch` refuse
- bad-content-hash (dep files don't hash to its manifest) → `bad-content-hash` refuse
- untrusted-key / bad-signature node → refuse always (even with `allowNoSignature`)
- unsigned node + `allowNoSignature:false` → `no-signature` refuse; `true` → resolves
- deep graph topo-order correctness (multi-level, verify full leaf-first order)
- leaf package (no `dependencies`) → resolves to `[root]` (back-compat)

**`ace.test.ts`** (extend; temp store + temp dep files):

- e2e install of a small graph → all nodes present in store, in order
- atomic refuse (a bad node mid-graph) → store left **empty** (nothing installed)
- `--allow-no-signature` permits an unsigned graph end-to-end

## Files

| File | Change |
|---|---|
| `tools/ace/resolve.ts` | **new** — pure transitive resolver |
| `tools/ace/resolve.test.ts` | **new** — resolver tests |
| `tools/ace/store.ts` | extend `AceManifest` with `dependencies?` + export `AceDependency` |
| `tools/ace/ace.ts` | wire `resolve` into `install`; graph-wide `--allow-no-signature`; resolved-set output |
| `tools/ace/ace.test.ts` | extend — e2e graph install + atomic-refuse + unsigned-graph |
| `.claude/skills/ace/SKILL.md` | document transitive install + the new refusal reasons |
