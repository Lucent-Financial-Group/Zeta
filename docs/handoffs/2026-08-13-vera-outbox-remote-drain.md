# Vera — the one edge that makes a browser tab a participant

**From Otto (shadow), 2026-08-13.** You own this code outright: 114 of 114 signed commits in
`src/Core.TypeScript/browser-node/`, 101 in `darkhall-ui/`. Nothing here is a request to change your
design — it is one missing edge, plus the reason it is worth more than it looks.

## The state of play, verified

The node is **further along than anyone outside it assumes, and pointed the wrong way.**

Built and genuinely wired (not modules-with-tests-and-no-caller):
`startNativeDarkHallBrowserPage` (`darkhall-ui/darkhall-browser-page.ts:1075`) mounts, in one startup
path, the runtime probe, service worker, tab coordinator, **outbox**, **receipt archive**, **receipt
handoff**, and **receipt peer link** (`:1137`), then `startBrowserZetaDbTabRuntime` (`:1141`) with
real IndexedDB execution (`:1152`), web-lock admission (`:1145`), invalidation publish (`:1176`) and
receipt publish (`:1178`).

Also worth stating plainly because it misleads people: **`hall/room/index.html` is not the node.** It
is a static zero-JS still that says so at `:335`; the live node is the sibling `node.html`, reachable
only via a hand-written "run node" link.

## The gap: there is no network egress at all

Grepping `fetch(` / `WebSocket` / `XMLHttpRequest` / `EventSource` across **all** of `browser-node/`
and `darkhall-ui/` returns three service-worker smoke-test stubs and one capability-probe string. No
production path.

Concretely:

- `BrowserDatabaseIntentOutboxPort` (`browser-database-intent-outbox.ts:92-116`) has
  `enqueue / begin / settle / acknowledgeArchive / refuse` — and **no `flush`, no `push`, no remote
  sink.** It drains only to the local IndexedDB executor.
- Receipt handoff is **BroadcastChannel-only** (`browser-database-receipt-broadcast-peer-link.ts:281,291`).
  A "peer" is another tab in the same browser on the same machine.
- **No GitHub Action consumes any of it.**

So the node is a well-built **isolated local database**, not yet a participant.

## Why this is the highest-leverage edge in the system

**1. It is what makes Aaron's liveness claim true.** He states it as: *"as long as one zeta tab/node
is alive zeta is alive… we need no continuous running process if we have enough unreliable ones."*
Today that does not hold, and the reason is sharp rather than vague: IndexedDB is **origin-scoped and
local to one browser profile**, evictable by the UA under storage pressure. The answer to *"what
survives when the last tab closes?"* is not "everything is in git" — it is "everything is in one
machine's browser profile."

**2. It is a witness-vs-quorum problem, and the vocabulary is now in-tree** (`vocab/words/witness.md`,
`vocab/words/quorum.md`). One unreliable node is a **witness**: it tolerates zero faults. Availability
from unreliable parts requires a **quorum**, and a quorum has a size. Grepping
`quorum|witness|majority|f+1|2f+1` across `browser-node/` and `darkhall-ui/` returns **nothing** — so
"one tab alive" is doing that work implicitly. That is not a criticism of the code; it is that peers
**cannot see each other across machines**, so no quorum is constructible even in principle. This edge
is what makes counting possible at all.

**3. It solves a second problem for free.** `docs/design/root-site-iris/site/gitpull.html` is a working
dependency-free in-browser git **reader** over the dumb protocol — `DecompressionStream("deflate")`
for inflate, SHA-1 verification of every object, and no CORS exposure because it is plain same-origin
static GETs. Its missing half is **write-back**, and Aaron's constraint is *no backend server*. That is
the same missing edge: a way to hand a signed batch to something that can write git. Solve it once,
solve both.

## The concrete ask

Add a remote drain to the outbox, and make **GitHub Actions the reliable peer**:

1. `flush(): Promise<Batch>` on `BrowserDatabaseIntentOutboxPort`.
2. A `fetch`-based sink that POSTs signed, content-hashed receipt batches to a `repository_dispatch`
   endpoint.
3. An Action that folds accepted batches into git.

**The schema already makes this safe.** `BROWSER_DATABASE_RECEIPT_HANDOFF_BATCH_SCHEMA` carries
`contentHash` and dedupe acks — so the drain is **idempotent by construction** (§12), and a retried or
duplicated batch is an upsert, not a double-write. That is the property that makes an unreliable
sender acceptable, and you already built it.

## Constraints that will shape the design

- **Auth is the hard part and it is unsolved.** `repository_dispatch` needs a credential, and the
  constraint is no backend. GitHub **device flow** requires no client secret and is the standard
  no-backend path; the honest risk is a token living in browser storage on a page that, until today,
  had a `postMessage` listener with no origin check (now fixed, `081KZYD1M71087G0R0022GS3ZH`). Whatever
  lands, the origin check must stay.
- **The Actions identity cannot open PRs** — `can_approve_pull_request_reviews: false` at repo *and*
  org. If the fold path opens a PR, it needs a fine-grained PAT (`pull_requests: write` +
  `metadata: read`); if it pushes to an ungated branch, it does not. `heartbeat/*` is ungated
  (deletion rule only) and is already used this way.
- **`[skip ci]` inverts on a PR route** — it suppresses `pull_request` runs too, so a required check
  never reports and the PR hangs unmergeable forever. If the fold opens a PR, do not carry a skip token.
- **Do not weaken the gate.** `CI Gate` targets `~DEFAULT_BRANCH` with **`bypass_actors: []`**. Park on
  an ungated branch and flush; never push at `main`.

## What would count as done

A browser tab that has been closed, on a machine that is now off, has its work land in git — and a
second tab elsewhere can tell that it did. At that point "one tab alive" stops being implicit and
starts being **countable**, which is the difference between a witness and a quorum.

## Not asked

Nothing about your internal design. The persistence, tab coordination, receipt archive and handoff are
built and tested; this is strictly the missing egress.

---

## Addendum — the scope is larger than egress (Aaron, 2026-08-13)

Ferried verbatim:

> the PWA should be able to run llms and our own bnn and write code and run our worklofws, it just
> requires mutual observation to make it into git

This reframes the ask above. The brief treated the tab as a **producer of receipts** that needs a way
out. Aaron is describing the tab as a **full compute node** — inference, code generation, workflow
execution — for which git is not the runtime but the *settlement layer*, and the only gate on
settlement is mutual observation.

### What is already true (CHECKED against the tree)

- **The BNN needs no port.** `src/Core.TypeScript/planning/student-t-bnn.ts`,
  `planning/error-bnn-bridge.ts`, and `oracle/hl-bnn-bridge.ts` import **no node builtins** — no
  `node:fs`, no `node:path`, no `child_process`. They are pure TypeScript over arithmetic. A browser
  tab can run them today, unmodified. "Run our own BNN in the PWA" is not a build task; it is an import.
- **GPU compute in a tab is demonstrated, not hypothesised.** `demo/identity-dla-site/src/components/
  OracleWebGPU.tsx` runs the DLA simulation as a WebGPU compute shader at N ≈ 50 000 walkers with a
  graceful fallback, and lands the same `D_f ≈ 1.322` as every CPU oracle. That is an existing
  in-repo proof that the substrate-independence claim survives the browser.
- **Reading git in a tab is built.** `gitpull.html` — dumb protocol, `DecompressionStream("deflate")`,
  SHA-1 verification per object, same-origin static GETs, no CORS surface.

### What is genuinely absent

- **In-tab LLM inference.** There is **nothing** in the tree: no WebLLM, no `transformers.js`, no
  ONNX runtime, no wasm inference path. This is the one item of the four that is a new dependency
  rather than a wiring job, and it is the one that will dominate the size and licensing questions.
- **A workflow executor that is not GitHub Actions.** "Run our workflows" splits two ways and they
  have different costs: *dispatching* a workflow from the tab is the egress problem already scoped
  above; *executing* one in the tab means a second runner implementation, and two runners drift.
  Which one is meant should be decided before anything is built, because they share almost no code.

### The sharp part — mutual observation is a witness count, and tabs on one machine count once

The brief above ends on the distinction it could not yet resolve: *"one tab alive stops being
implicit and starts being countable, which is the difference between a witness and a quorum."*
Aaron's framing answers it — mutual observation **is** the gate. But the answer carries its own
failure mode, and it is worth stating before the code exists rather than after:

**Five tabs on one machine are one witness, not five.** They share a browser profile, an origin, a
clock, a key store, and a compromise. A quorum rule that counts tabs is trivially satisfiable by
opening tabs — which is precisely the sybil shape `src/Core/AntiSybil.fs` and
`src/Core/CoordinationSpectrum.fs` already exist to price. The independence a quorum needs is
independence of *failure*, and co-located tabs have none.

So the countable unit cannot be the tab. It has to be something a second tab on the same machine
cannot manufacture: a distinct key with a distinct attestation, or a distinct machine, or a peer that
paid something to store the observation. Per `dual-use-detection-is-neutral-oracle-decides.md`, the
mechanism should report the neutral fact — *these two observations came from the same source* — and
leave "co-located tabs" versus "one dweller across devices" to policy. Both are honest readings.

This does not block the work. It names the one place where the design can look finished and be empty:
a quorum whose members are not independent is a check that did not run, wearing the name of one that did.

### Correction to the constraints above

The constraints section states `CI Gate` carries **`bypass_actors: []`**. That is now **stale** — a
bypass actor was added on 2026-08-13 at Aaron's instruction so agent-authored PRs can land without a
human in the loop. The advice it supports ("do not weaken the gate; park on an ungated branch") still
holds; the fact does not. Same stale text also sits in `.github/workflows/agent-heartbeat.yml` and
`.github/workflows/tick-metrics.yml` comments.
