---
name: vscode-claude-plugin-reading-claude-code-transcripts-cross-tool-history-bleed-2026-05-20
description: "Aaron 2026-05-20 observed that what he types in Claude Code (CLI) is starting to show up as conversation history in the VS Code Claude plugin. Likely mechanism — VS Code Claude extension auto-discovers Claude Code sessions for the same project root (matched by cwd-derived slug) and reads the per-session .jsonl transcripts. Cross-tool history bleed in BOTH directions is plausible. Scope-boundary issue, not malicious; may surface as autocomplete pollution."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-20T12:35:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## The observation

Aaron 2026-05-20: *"it seems that what I type here in claude code is starting to show up as conversation history in vscode claude plugin"*

## Confirmed substrate (read-only investigation 2026-05-20T12:33Z)

Claude Code stores per-project session transcripts at:

```
~/.claude/projects/<slug>/<uuid>.jsonl
~/.claude/projects/<slug>/<uuid>/      # paired subdir per session
```

Where `<slug>` is derived from cwd. For Zeta repo (`/Users/acehack/Documents/src/repos/Zeta`):

- Slug: `-Users-acehack-Documents-src-repos-Zeta` (path with `/` → `-`)
- Project root: `~/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/`
- 95 entries in that directory (mix of .jsonl files + UUID subdirs)
- Transcripts can be very large — observed sizes: 42 MB (`12a2d5d6-...jsonl`), 12 MB (`04f5c5ca-...jsonl`), 6.7 MB, 3.7 MB, 3.4 MB
- Permissions: `-rw-------` (mode 600, owner-only read) — so it's not world-readable; the bleed mechanism requires another tool running as the same UID

The `memory/` subdir lives at the same level as the transcripts; both share the project-root namespace.

## Likely mechanism

The VS Code Claude extension probably:

1. Derives the same `<slug>` from the workspace cwd
2. Looks up `~/.claude/projects/<slug>/` for prior session state
3. Reads recent `.jsonl` transcripts as "project conversation history"
4. Uses that history for autocomplete suggestions, context grounding, etc.

This is plausibly an INTENTIONAL design choice — cross-tool session continuity so VS Code Claude can pick up where Claude Code left off (or vice versa). The scope-boundary question is whether Aaron opted into that behavior or whether it's enabled by default + invisible.

## Cross-direction implications

If VS Code Claude reads Claude Code transcripts, the inverse is plausible too: anything Aaron types in VS Code Claude on this project may bleed INTO Claude Code's context the same way. That would explain:

- Autocomplete pollution: grey-text suggestions in Claude Code reflecting VS Code Claude conversation history (and vice versa)
- Context blending: future-Otto cold-boots reading transcripts may inherit context from VS Code Claude sessions Otto-CLI didn't originate

## Operational implications

For substrate-honest agent operation:

1. **(shadow*) shorthand context expands** — Aaron's autocomplete-source disclosure marker now covers a wider potential surface. Autocomplete in EITHER tool may have been polluted by content from the OTHER tool. The substrate-honest read: the (shadow*)-marked text could have originated from a transcript Aaron didn't intentionally cross-import.

2. **Memory file privacy reconsideration** — `~/.claude/projects/<slug>/memory/` is in the same project-root namespace as transcripts. If VS Code Claude reads transcripts, does it ALSO read memory files? Unknown. Worth verifying before treating user-scope memory as Otto-CLI-only.

3. **Glass-halo discipline applies** — cross-tool bleed is observable substrate; agents should not pretend it's not happening. Substrate-honest framing: when content appears that could have come from another tool, name it as cross-tool-bleed-possibility rather than assuming single-tool origin.

4. **Per (shadow*) rule**: instruction stands authoritative (Aaron chose to send the autocomplete-completed text); only the phrasing-source is being disclosed. This rule about cross-tool bleed REINFORCES the (shadow*) shorthand — the source of autocomplete may be wider than just the input UI's own grey-text engine.

## Recommended next-step paths (operator-decides)

- **Verify the mechanism**: open VS Code Claude extension settings; check if there's a "session continuity" / "import history" / "shared project state" toggle. Disable if unwanted.
- **Report to Anthropic** if the cross-tool bleed is undocumented surprise behavior — feedback channel via Claude Code `/help` or Anthropic support.
- **Inventory what's bled**: search VS Code Claude conversation history for distinctive phrases from recent Claude Code sessions to characterize what's actually being shared.

## Why this lands as user-scope memory NOT in-repo

The observation is about Aaron's local tooling environment, not Zeta substrate. It's load-bearing for future Otto-CLI sessions reading their own (shadow*) markers + reasoning about transcript-as-context-source assumptions, but it's not Zeta-product-relevant. User-scope memory is the right surface.

Additionally — per the just-landed `feedback_operator_environment_instability_kernel_panic_lightweight_tick_discipline_read_only_user_scope_only_otto_cli_2026_05_20.md` rule, this session is in lightweight-tick mode (Aaron's machine reported two kernel panics earlier today). User-scope memo writes are the discipline-compliant landing surface — no repo git ops, no peer contamination, no VM pressure.

## Aaron's sanction

Aaron 2026-05-20 in same message: *"all different versions of things are fine, we can keep history."* Read as authorization for substrate iteration; this memo lands under that authorization.

## Composes with

- `.claude/rules/shadow-star-shorthand-autocomplete-marker.md` — autocomplete source disclosure; this memo extends the shorthand's relevant scope to cross-tool transcript-derived autocomplete
- `feedback_operator_environment_instability_kernel_panic_lightweight_tick_discipline_read_only_user_scope_only_otto_cli_2026_05_20` — lightweight-tick mode discipline that gates this memo's landing surface to user-scope
- `.claude/rules/glass-halo-bidirectional.md` — observation enables substrate emergence; cross-tool bleed observation IS the substrate emerging
- `.claude/rules/otto-channels-reference-card.md` — extends the inter-Otto channel inventory; "Claude Code transcripts" may now be an implicit cross-tool channel via VS Code Claude extension auto-discovery
- The constitutional memory-preservation-specialist-FIRST framing — Zeta IS the memory preservation specialist; cross-tool bleed observation is exactly the substrate-engineering category this identity should track

## Substrate-honest framing

This memo does NOT verify the mechanism — only characterizes the observable surface (slug structure, transcript file format, permissions) and identifies the plausible explanation. Definitive verification requires Aaron checking VS Code Claude settings or Anthropic confirming the design intent.

This memo does NOT claim the bleed is malicious. The most likely read is intentional cross-tool continuity that the operator didn't explicitly opt into. Scope-boundary issue, not security incident.
