---
name: Cross-harness skill discovery VERIFIED empirically (not just docs) — Claude Code does NOT read `.agents/skills/`; Codex + Gemini DO; until all three harnesses support a common home, each factory skill lives in its harness's canonical directory; generic skills use behaviour/data split (per-harness SKILL.md carries behaviour, shared `docs/` tree carries data); harness-specific skills stay in their canonical home with no duplication; Aaron Otto-227 policy call; 2026-04-24
description: Aaron Otto-227 *"until they all support a common home lets leave each skills in their connonical home for the harness"* + *"they may need little tweaks and should be able to be thin behavior entry points with the data in docs"* + *"not thin but thinner than holding the data too, we've talked about this the behavior / data split in skills, this means only the behaviors are duplicated they share docs"*. Verified via live discovery probes on 2026-04-24 that Claude Code does NOT honor `.agents/skills/` while Codex + Gemini DO. Policy: each harness's canonical home is the primary; generic skills use behaviour/data split so data is shared across harnesses via `docs/` while behaviour (SKILL.md bodies) are per-harness and get little tweaks for each harness's tooling.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Until all three harnesses support a common skill-home,
each factory skill lives in its harness's canonical
directory.** The `.agents/skills/` standard is real for
Codex + Gemini but NOT for Claude Code, so it is not (yet)
a single-copy cross-harness solution.

Direct Aaron quotes:

> *"we tried earlier and had issue with skills not in the
> canonical home for the harness before"*
>
> *"that was a while ago, you should be about to test that
> directly right?"*
>
> *"like if a skill only exist in .agents and you can invoke
> it then it means your harness works with it right?"*
>
> *"until they all support a common home lets leave each
> skills in their connonical home for the harness"*
>
> *"we have to do the same kind of tests with all the
> harnesses if we want to try to move skills outside their
> cononical home"*
>
> *"they may need little tweaks and should be able to be
> thin behavior entry points with the data in docs"*
>
> *"well not thin but thinner than holding the data too,
> we've talked about this the behavior / data split in
> skills, this means only the behaviors are duplicated they
> share docs"*

## Verified state as of 2026-04-24

Live probe: single skill at `.agents/skills/agents-only-prove/SKILL.md`
in an isolated workspace (no `.claude/`, `.codex/`, or
`.gemini/` skill dirs present). Each harness asked whether
it could see the skill by name:

| Harness | Version | `.claude/skills/` | `.agents/skills/` | Verified via |
|---|---|---|---|---|
| Claude Code | 2.1.116 | yes (canonical) | **NO** | `claude -p` — skill absent from listed set |
| OpenAI Codex | 0.124.0 | n/a | **YES** | `codex exec "..."` returned `YES` |
| Gemini CLI | 0.39.1 | n/a | **YES** | `gemini --skip-trust -p "..."` returned `YES` |

Codex + Gemini honor `.agents/skills/` **empirically**, not
just per-docs. Claude Code does NOT. Until Claude Code joins
the convention, `.agents/skills/` is additive for two out of
three.

## Placement policy (Aaron Otto-227 refinement)

### Generic skills (harness-agnostic capability)

Use `.agents/skills/` for the harnesses that support it,
`.claude/skills/` for Claude Code, until Claude Code joins
the `.agents/` convention:

```
.agents/skills/<name>/SKILL.md      # Codex + Gemini read this
.claude/skills/<name>/SKILL.md      # Claude Code reads this
```

Two files for generic skills, not three. A symlink from
`.claude/skills/<name>/` to `../../.agents/skills/<name>/`
is a legitimate collapse if the body truly does not diverge
between Claude Code and the others — Claude Code follows the
symlink and reads the target content because the symlink
itself is inside `.claude/skills/` (its canonical dir). If
the Claude copy needs harness-specific tweaks, keep the two
files separate so they can diverge.

Apply the **behaviour / data split** per Aaron Otto-227:

- Each SKILL.md body carries *behaviour* — what to do,
  which tools to call, per-harness tool-syntax or phrasing
  tweaks when needed. Thinner than holding the underlying
  data, but not so thin it just proxies somewhere else.
- The *data* (rule tables, worked examples, reference
  material, citation blocks, domain definitions, style
  guides, longer prose) lives in a shared `docs/` tree that
  every SKILL.md references. One data source, read by all.

**Net cost model:** two behaviour bodies (`.agents/` for
Codex+Gemini, `.claude/` for Claude Code) that may diverge
in tweaks, one shared `docs/` data source. Maintenance
burden tracks behaviour diffs only. When Claude Code joins
`.agents/skills/`, collapse to one body.

### Harness-specific skills (wrap one harness's features)

Place at the harness's canonical directory ONLY — NOT in
`.agents/skills/`. Aaron Otto-227 explicit:

> *"skills that directly extend the harness, they should be
> in connonical since they are not generic skills"*

Examples:
- Claude Code `/loop` companion, Skill-tool wrapper → `.claude/skills/` only
- Gemini `extensions validate` wrapper, `gemini hooks migrate`
  author → `.gemini/skills/` only
- Codex `agents/openai.yaml` author, `codex exec`
  orchestrator → `.codex/skills/` only

These bodies reference features other harnesses don't have,
so putting them in `.agents/` would mis-advertise their
portability to Codex + Gemini sessions that can't use them.

### Harness-specific skills (wrap one harness's features)

Place at the harness's canonical directory ONLY. Do not
duplicate. The body references features other harnesses
don't have, so duplicating is pointless.

Examples:
- A Claude Code `/loop` companion skill → `.claude/skills/`
  only
- A Gemini `extensions validate` wrapper → `.gemini/skills/`
  only
- A Codex `agents/openai.yaml` author → `.codex/skills/`
  only

## How to test a new harness

If a fourth harness shows up claiming `.agents/skills/`
compatibility (or claiming its own canonical directory),
run the same empirical probe pattern:

1. Create `/tmp/<test-dir>/.agents/skills/probe-test/SKILL.md`
   with a distinctive description
2. From `/tmp/<test-dir>/` run the harness's headless /
   non-interactive probe mode (`-p`, `exec`, `--print`,
   whatever)
3. Ask the harness whether it sees the skill by name
4. Compare with a control skill at the harness's claimed
   canonical dir

If YES on `.agents/skills/`, the harness is additive; if
NO, only the canonical dir is primary.

## Revisit trigger

Watch Claude Code's changelog. If/when Claude Code adds
`.agents/skills/` support, re-run the probe and update
this memory. At that point the factory can consolidate
generic skills to a single `.agents/skills/` copy and drop
the per-harness duplication. Until then, canonical-home
discipline holds.

## Composition with prior memory

- **Otto-226 parallel subagent drain** — subagents can be
  invoked through any harness that supports isolation; this
  memory covers the skill-discovery question for those
  harnesses.
- **Otto-220 code-comments-not-history** — applies to
  SKILL.md bodies too. Body content is documentation +
  behaviour; don't inflate with factory-process history.
- **Otto-215 bun+TS post-install + in-source plugin
  discipline** — cross-harness skills are the skill-level
  analog of the "plugins live in-source" discipline;
  `.claude/skills/**` + `.codex/skills/**` +
  `.gemini/skills/**` all check into the repo.

## What this memory does NOT authorize

- Does NOT authorize placing skills ONLY in
  `.agents/skills/` when the skill is supposed to be visible
  in Claude Code. Claude Code won't see them (verified).
- Does NOT authorize SKILL.md bodies that fold the data in
  inline. Data lives in `docs/`; bodies reference.
- Does NOT authorize symlinking `.claude/skills/<name>/` ->
  `.agents/skills/<name>/` to "share one file across
  harnesses". Claude Code doesn't discover the `.agents/`
  path, so the symlink doesn't save you anything.
- Does NOT authorize dropping the probe test next time a
  new harness shows up. Empirical verification is the rule,
  not "the docs said so".
- Does NOT override any Aaron per-skill decision that says
  "keep this one in a different spot".

## Direct Aaron quote to preserve

> *"until they all support a common home lets leave each
> skills in their connonical home for the harness"*

> *"not thin but thinner than holding the data too, we've
> talked about this the behavior / data split in skills,
> this means only the behaviors are duplicated they share
> docs"*

Future Otto: canonical home per harness; behaviour / data
split; re-verify via probe before trusting any cross-harness
claim. Three harnesses today; more tomorrow.
