# Apple Diagnostics confirms the memory fault — and what that means for every local green

**2026-08-28.** Apple Diagnostics on the maintainer's Mac Studio returned **RED on memory**,
with a secondary yellow suggesting a software update. AppleCare has been renewed and the
machine may go in for repair.

This closes an eight-day investigation that could not close itself.

## 1. What was inferred, and what is now confirmed

The forensic investigation (`2026-08-15-139-and-134-are-signal-deaths…`,
`2026-08-24-three-unclean-reboots-are-kernel-pmap-refcount-panics…`, work item
`081M02SQFZV087G0R000A4ZEXN`) established a machine-level memory-integrity fault beneath
every runtime, on this evidence:

- **97 memory faults in 8 days**, 68 inside a heap-walker or allocator, spanning `node`/V8,
  `dotnet`, `lean`, `git`, `rustc`, `python3`, WebKit — **and Apple's own daemons**, which run
  none of our code.
- **10 kernel panics**, eight of them page-mapping accounting failures
  (`pmap_recycle_page: page is referenced`, `wired count underflow`).
- A reproduction in which **two independent `fsc` processes died in the same second, in two
  different GC phases** — which no compiler bug explains.
- A **confirmed single-bit flip that reached `origin/main`**: `shards` → `shazds`
  (`r` 0x72 → `z` 0x7a) and `0` 0x30 → `<` 0x3c inside a `.git/index`, merged as PR #15007
  and cleaned up by #15194 / #15206.

It stopped one step short, deliberately: *"between failing memory hardware and a kernel
page-lifecycle defect, I cannot discriminate from userland."* Apple Diagnostics discriminates.
**Hardware.**

Two things about that are worth keeping. The investigation's honesty about what it could not
determine is why the diagnostic result is informative rather than merely confirmatory — a
report that had guessed "bad RAM" would have been right by luck and unfalsifiable in the
meantime. And the earlier `DOTNET_gcServer=0` workaround, attributed in April to a ".NET 10
Server GC bug on Apple Silicon", is now fully explained as a misdiagnosis of this same
fault: it moved every crash from `SVR::` to `WKS::` and stopped none of them, at the cost of
Server GC on 24 cores. It has been removed (#15984).

## 2. The consequence that matters today: local greens are suspect

This is the operational half, and it is uncomfortable.

**Any result computed on this machine may be wrong in a way that leaves no trace.** Not
"slow", not "crashed" — *wrong and plausible*. A test that passed, a byte-lock that matched,
a build that succeeded: each is a computation performed in memory that is known to corrupt
silently. Most such results are fine. We cannot tell which.

So, until the hardware is repaired or replaced:

- **CI on Linux is the oracle.** It is different hardware; its greens mean what they say.
- **A local green is a hypothesis.** Useful for iterating, not for concluding. Report it as
  local when reporting it at all.
- **Exit 139 is not a failing check, it is an absent one.** This bit twice during a single
  session today: `bunx tsc` exited 139 with zero output, and separately exited 1 with zero
  output. Both would read as "0 errors" to a grep-based gate. That is precisely the defect
  work item `081M02SQFZV087G0R000A4ZEXN` names.
- **Prefer committing what CI verifies over what the laptop verified.**

## 3. Why `git fsck` cannot help, and what can

The reflex on hearing "bit flips reached the repository" is to run `git fsck`. It will not
find them.

**Git hashes what it is given.** A flip that occurs *before* hashing produces an object that
is internally consistent — correctly hashed, and wrong. Every integrity guarantee git offers
is downstream of the moment the corruption already happened. `fsck` proves the bytes have
not changed *since*; it says nothing about whether they were right when written.

What does work is **derivable redundancy** — two independent encodings of the same fact that
must agree. The PR shard files carry exactly that:

```
docs/github/prs/shards/015/08000000000000007803000000003a98.json
                       ^^^                              ^^^^
                       015 == floor(0x3a98 / 1000) == floor(15000 / 1000)
```

The directory is a function of the filename, so a flip in either breaks the relation. That
is now enforced by `src/Core.TypeScript/hygiene/audit-shard-name-integrity.ts`, which catches
both shapes: a flip producing a non-hex character (the observed `0` → `<`), and a flip that
stays valid hex but moves the implied bucket (`3a98` → `3298`, which hex-validity alone
misses). Measured at introduction: **13,448 shards, 0 violations** — main is clean.

**The audit must run in CI, not here.** Verifying integrity using the hardware suspected of
corrupting it is self-blinding by construction — the same error as probing whether a job
finished over the API you are saturating. A clean local run of this audit is worth very
little. A clean CI run is worth what it says.

## 4. Honest limits

- **Names are not content.** This audit covers shard *filenames*, because that is where the
  one known flip landed and where a derivable invariant exists. A flip inside a JSON body,
  a source file, or a prose document is not covered by anything yet. Other derivable
  redundancies exist (JSON that must parse, ids that must resolve, byte-locks with four
  oracles) and could be turned into similar audits; none is written.
- **Zero violations today is not zero corruption ever.** It means no *surviving* corruption
  of this shape in this namespace. #15007's flip was cleaned up before this existed.
- **A red diagnostic identifies a faulty component, not a blast radius.** Nothing here says
  how much of the last eight days' output is affected, and nothing can.
- The yellow "update" result is secondary and should not distract from the red one.

## Anchors

- `docs/research/2026-08-15-139-and-134-are-signal-deaths-147-of-them-in-one-week-on-one-machine.md`
- `docs/research/2026-08-24-three-unclean-reboots-are-kernel-pmap-refcount-panics-not-agent-load.md`
- Work item `081M02SQFZV087G0R000A4ZEXN` — exit 139 read as a pass by grep-based gates.
- `.claude/rules/rest-is-the-default-transport-graphql-is-the-contested-budget.md` — "never
  probe a goal over the transport you are draining", the general form of §3's siting argument.
