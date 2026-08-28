---
name: Microsoft vscode-chat-customizations-evaluation — prompt analysis LSP
description: Microsoft's LSP for analyzing .prompt.md, .agent.md, .instructions.md files. Contradiction detection, ambiguity analysis, persona consistency, cognitive load, coverage gaps, composition conflicts. Uses Copilot as LLM backend. Copilot surfaced this unprompted while onboarding to the factory. Could analyze CLAUDE.md, AGENTS.md, skill files.
type: reference
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Microsoft vscode-chat-customizations-evaluation

GitHub: `github.com/microsoft/vscode-chat-customizations-evaluation`
License: MIT

Copilot surfaced this unprompted 2026-05-07 while being
onboarded to the Zeta factory. It recognized the factory's
instruction files and showed the tool that analyzes them.

### What it does

LSP that analyzes prompt/agent/instruction files:
- Contradiction detection (logical, behavioral, format)
- Semantic ambiguity with rewrite suggestions
- Persona consistency (conflicting traits, tone drift)
- Cognitive load assessment (overly complex prompts)
- Semantic coverage (gaps in intent, missing error paths)
- Composition conflict analysis (cross-file via markdown links)

### Supported file types

- `*.prompt.md`
- `*.agent.md`
- `*.instructions.md`

### Factory application

Could analyze:
- CLAUDE.md (107K chars, proven 40K ceiling)
- AGENTS.md (19.2K chars)
- `.claude/skills/*/SKILL.md` (entire skill catalog)
- `.claude/agents/*.md` (persona agents)

### Waza integration

Includes `waza` eval framework:
- `waza new eval <skill-name>` — scaffold eval files
- `waza run <eval.yaml>` — execute skill evaluation

### Install

```
git clone github.com/microsoft/vscode-chat-customizations-evaluation
cd vscode-chat-customizations-evaluation
npm install && npm run build
```

F5 in VS Code to launch.
