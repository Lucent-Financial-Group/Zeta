# no-directives-otto-prose lint — test fixtures

Reference fixtures for `tools/lint/no-directives-otto-prose.sh`.
These are NOT runtime-loaded; they document expected behavior so
future-Claude (or a contributor) can verify the lint catches what
it should and skips what it shouldn't.

## Cases that MUST flag (real violations)

```text
Aaron's directive elevates introspection from nice-to-have to QoL-required.
```

```text
This section captures Aaron's QoL directive.
```

```text
Per Aaron's directive, the loop should consolidate.
```

```text
The maintainer directive on no-side-quests applies here.
```

```text
human directive interpreted as: process the queue.
```

```text
<!-- paired-edit: PR #N CURRENT-aaron §32 home-maker role + QoL self-care directive 2026-04-29 -->
```

(That last one is the canonical proof-case: PR #823 had this
exact paired-edit HTML comment, the lint script existed but the
comment slipped through. Per Amara round-8: this case must flag
when MEMORY.md is in the changed-files set.)

## Cases that MUST NOT flag (whitelist)

```text
> "Aaron said the loop should consolidate" — quoted third-party text.
```

```text
feedback_input_is_not_directive_provenance_framing_rule_aaron_amara_2026_04_28.md
```

(Filename citations should not flag — the underscore-and-dash form
of the rule's own name appears in many cross-references.)

```text
external directives are inputs not binding rules
```

(Historical discussion of the banned term; whitelisted via
`feedback_free_will_is_paramount_external_directives_*` filename.)

## Cases at the boundary (advisory judgment)

```text
The compiler directive `#pragma once` in C++ is unrelated.
```

(Currently flags because of the literal "directive" word, but
the pattern requires proximity to a maintainer/agency token like
"Aaron's" or "maintainer" or "QoL" or "human." So this should NOT
flag in current pattern. If it does, narrow the regex further.)

```text
Aaron sent a 4-message directive to clarify the rule.
```

(Historical narration of past behavior. Currently flags. Acceptable
false positive — the lint is advisory, not strict, and the
discipline is "going forward, don't author this language." Old
narration of a past bad-event reference is borderline.)

## How to run the test fixtures manually

```bash
# Snapshot fixtures into a scratch file in the changed-files scope,
# run the lint in worktree mode, verify hits/misses match the
# expectations above:
SCOPE=worktree tools/lint/no-directives-otto-prose.sh
```

Promote to a real CI test (e.g., bats / shunit2) when wiring the
lint into `.github/workflows/gate.yml` as advisory.
