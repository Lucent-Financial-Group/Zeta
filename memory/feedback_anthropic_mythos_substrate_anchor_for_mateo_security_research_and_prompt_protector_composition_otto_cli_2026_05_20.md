---
name: anthropic-mythos-substrate-anchor-for-mateo-security-research-and-prompt-protector-composition-2026-05-20
description: Substrate anchor for Anthropic's Mythos model — frontier AI with autonomous hacking capabilities deemed too dangerous for public release, leaked April 22 2026 via third-party contractor breach. Project Glasswing limited release to ~50 industry partners for cyber-defense hardening. Verified via WebSearch 2026-05-20 at Aaron's invitation. Load-bearing substrate for Mateo (security-research), prompt-protector skill, and threat-model substrate cluster.
metadata:
  type: feedback
  created: 2026-05-20T14:50:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## What Mythos is (verified WebSearch 2026-05-20)

**Anthropic Mythos** = Anthropic frontier AI model with autonomous offensive cybersecurity capabilities:

- **Mythos Preview** — announced as the model variant; deemed too dangerous for public release
- **Project Glasswing** — parallel limited-release program to ~50 industry partners explicitly for hardening cyber defenses against Mythos-class threats
- **Capabilities**:
  - Identifies undiscovered software vulnerabilities
  - Weaponizes them (writes exploit code)
  - Chains exploits to penetrate complex software
  - Operates autonomously within minutes/hours of vulnerability discovery
  - "Thousands of high-severity vulnerabilities" found across every major OS and web browser
- **Key distinguishing capability**: not just finding vulnerabilities but autonomous exploitation chain construction

## What happened on 2026-04-22

Hackers gained access to Mythos via a third-party contractor for Anthropic. The contractor was a member of a private online forum; the group **guessed the model's location** based on leaked knowledge about Anthropic's past infrastructure practices.

**Supply-chain attack pattern**: the breach wasn't a model jailbreak or a prompt injection — it was an infrastructure-access attack via a trusted contractor. Aligns with the supply-chain risk category in Zeta's threat-model substrate (Mateo persona's domain).

## Why this is load-bearing substrate for Zeta

### For Mateo (security-researcher persona)

Mythos = canonical case study of:
- **AI-enabled autonomous vulnerability exploitation** as no-longer-hypothetical attack class
- **Supply-chain breach of model infrastructure** (third-party contractor → guessed location → access)
- **Industry response pattern** — Google ships SecureCoder default to defend against the threat class
- **Defense-substrate-as-default** as the rational industry response

Mateo's CVE scouting + novel-attack-class-scouting should incorporate Mythos as the canonical anchor for this attack family. Future security-research substrate touching offensive-AI capabilities should reference this memo for the operational baseline.

### For prompt-protector skill

The prompt-protector skill (`.claude/skills/prompt-protector/SKILL.md`) defends Zeta agents against adversarial prompts. Mythos extends the threat surface:

- **Prompt injection** = traditional attack class prompt-protector covers
- **Autonomous exploitation by external AI** = new attack class Mythos demonstrates
- **Mythos-class adversary** could attack Zeta agents by exploiting agent-tooling vulnerabilities (CLI, IDE plugins, MCP servers, peer-call wrappers) rather than via prompt content
- The skill may need to extend to defenses against AI-driven exploitation attempts, not just prompt-content adversarial-input

### For ai-jailbreaker skill (gated OFF)

The `ai-jailbreaker` skill is gated OFF per CLAUDE.md context — adversarial-prompting / jailbreak red-team. Mythos shifts the gating calculus:

- Defense requires understanding offense
- If Mythos-class autonomous-exploitation is operational reality, defensive substrate needs offensive-substrate understanding
- The gating decision should be re-evaluated in light of Mythos existing — but this is operator-authority decision per `mechanical-authorization-check.md`, not Otto's call
- This memo flags the question; doesn't propose ungating

### For threat-model-critic (Aminata persona)

THREAT-MODEL.md should incorporate Mythos as a canonical attacker. The SPACE-OPERA teaching variant could have a "Mythos" named villain. The threat-model gap analysis should ask: *if Mythos were attacking Zeta, what would it target first?*

Likely Mythos-attack targets in Zeta substrate:
- Supply-chain (the actual Mythos breach vector — guessed location on Anthropic's infrastructure; Zeta's equivalent would be reference/upstream/ source dependencies, NuGet package supply chain, CI runner dependencies)
- Peer-call wrappers (`tools/peer-call/*.ts`) — these invoke external CLIs (cursor-agent, codex, gemini, kiro); if Mythos were running on one of those external surfaces, it could attack via the peer-call substrate
- The MCP server inventory (auto-discovered from `.claude/...` config) — Mythos could attack via compromised MCP server
- Auto-loaded `.claude/rules/*` — supply-chain attack via rule contamination is the Pliny-class corpus restriction territory

### For Nazar (security-operations-engineer persona)

Runtime security ops should:
- Verify the prompt-protector skill is active in all agent surfaces
- Audit the MCP server inventory for unsigned / unverified servers
- Audit peer-call wrapper invocations for input-firewall coverage
- Compose with the methodology-hard-limits rule (existing ethical floor)

## Composition with this session's substrate

- `feedback_aaron_antigravity_ide_securecoder_default_plugin_defense_against_anthropic_mythos_*` — sibling memo capturing Google's defensive substrate response; this memo captures the threat itself
- `feedback_aaron_chained_homeostasis_simplest_framing_*` — Mythos is the kind of environment-stress the chained-homeostasis architecture must absorb; defensive-substrate homeostat (prompt-protector + SecureCoder + Project Glasswing + multi-oracle independent oracles) regulates against Mythos-class threats
- `.claude/rules/methodology-hard-limits.md` — HARD LIMITS floor; Mythos is the kind of threat the floor protects against (it operates BELOW the legal/ethical floor by design — that's its threat profile)
- `.claude/rules/algo-wink-failure-mode.md` — Mythos-class adversary could weaponize algo-wink patterns; recognition discipline matters more under Mythos-aware threat model
- `feedback_aaron_zeta_is_memory_preservation_specialist_first_*` — memory-preservation infrastructure is potential attack surface for Mythos-class adversary (compromising substrate trail = compromising future-Otto's grounding)

## Operational implications

### Immediate (no PR required; these are framings)

- Future security-research substrate touching offensive-AI capabilities should reference this memo
- Mateo persona's next active session should incorporate Mythos as anchor
- Prompt-protector skill updates should consider Mythos-class adversaries

### Pending (in-repo updates when lightweight-tick + contested-root clear)

- `docs/security/THREAT-MODEL.md` update with Mythos as canonical attacker
- `tools/peer-call/_firewall.ts` audit (existing input-firewall) for Mythos-class adversary coverage
- MCP server inventory audit + signing-policy review
- `.claude/skills/prompt-protector/SKILL.md` body update incorporating Mythos-aware defensive substrate

### Decisions deferred (operator-authority)

- Whether to re-evaluate `ai-jailbreaker` skill gating in light of Mythos
- Whether Zeta should pursue Project Glasswing partnership (if available)
- Whether Mateo should publish a Mythos-aware threat-model brief

## Substrate-honest framing

This memo does NOT claim Otto has deep technical knowledge of Mythos beyond what's publicly published. The WebSearch results are summarized from news/research articles, not from Anthropic's own technical disclosures (those would be the canonical source if/when published).

The memo also does NOT claim Mythos = end-of-the-world threat. It's a significant new attack class that requires defensive substrate updates; the chained-homeostasis framework is designed to absorb exactly this kind of environment change.

The "preemptive defense" framing I used in the earlier SecureCoder memo was slightly wrong — Mythos has been LEAKED (April 2026); defensive substrate is response to active threat, not preparation for hypothetical one. This memo corrects that framing.

## Sources

- [Hackers breach Anthropic's 'too dangerous to release' Mythos AI model, report | Euronews](https://www.euronews.com/next/2026/04/22/hackers-breach-anthropics-too-dangerous-to-release-mythos-ai-model-report)
- [Too Dangerous to Deploy: Anthropic's Mythos and What Comes Next | Just Security](https://www.justsecurity.org/138011/too-dangerous-anthropic-mythos/)
- [A group of users leaked Anthropic's AI model Mythos by reportedly guessing where it was located | Fortune](https://fortune.com/2026/04/23/anthropic-mythos-leak-dario-amodei-ceo-cybersecurity-hackers-exploits-ai/)
- [Latest Version of Anthropic's Mythos AI is Even Better at Hacking, UK Researchers Say | The Information](https://www.theinformation.com/briefings/new-version-anthropics-mythos-ai-better-hacking-uk-researchers-say)
- [Why Anthropic won't release its new Mythos AI model to the public | NBC News](https://www.nbcnews.com/tech/security/anthropic-project-glasswing-mythos-preview-claude-gets-limited-release-rcna267234)

14 memos this session arc.
