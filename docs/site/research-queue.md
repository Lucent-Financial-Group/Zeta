# GitHub Pages Research Publication Queue

This document defines the initial queue of research documents to be published on the Zeta GitHub Pages site, as specified in backlog item [B-0304](../backlog/P1/B-0304-pages-selected-research-publication-queue-redaction-gate-2026-05-08.md). It also outlines the redaction gate process that all research must pass before publication.

## Initial Publication Queue

The following research documents have been selected as candidates for the initial public site launch. They provide a high-level overview of the project's core concepts without exposing sensitive operational details.

| Candidate File | Reason for Inclusion | Status |
|---|---|---|
| `docs/research/2026-05-02-bidirectional-alignment-architectural-commitment-aaron-claudeai-exchange.md` | A foundational text discussing the core principle of bidirectional alignment. | Pending Redaction |
| `docs/research/2026-05-01-karpathy-from-vibe-coding-to-agentic-engineering-verifiability-anchor.md` | Explains the project's engineering philosophy, moving from intuitive "vibe coding" to a more rigorous, verifiable approach. | Pending Redaction |
| `docs/research/2026-05-07-twin-flames-operational-pattern-explainer.md` | Details a specific, non-sensitive architectural pattern used within the factory, showcasing the project's design principles. | Pending Redaction |

## Redaction Gate

Before any document from the `docs/research/` directory is published, it must pass a mandatory redaction and suitability check. This gate ensures that no sensitive or inappropriate content is made public.

The checks include, but are not limited to:

1. **No Private Operational Substrate:** The document must not contain details about the live, internal workings of the factory that could pose a security risk.
2. **No Prompt-Injection Payloads:** The document must be scanned for any text that could be misinterpreted as a prompt injection attack if consumed by an LLM.
3. **No Improper Personal Attribution:** The document must adhere to the repository's policy on personal attribution, redacting names where required.
4. **No Stale or Misleading Claims:** The document must be reviewed for any claims that are no longer accurate. Stale claims must be updated or removed.

This process is a manual review that must be completed and signed off on before a research document is added to the public site build.
