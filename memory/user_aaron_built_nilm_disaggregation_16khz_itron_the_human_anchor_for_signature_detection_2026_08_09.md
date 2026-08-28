---
name: user-aaron-built-nilm-disaggregation-16khz-itron
description: "Aaron built energy disaggregation (NILM) over electric signal at 16 kHz at Itron — the unnamed human anchor under Zeta's signature detectors"
metadata: 
  node_type: memory
  type: user
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-09T19:46:07.623Z
---

Aaron 2026-08-09, while explaining how the 4×4 controller grammar generalises:

> *"Our signature detector has many names in the soft regime, like soft values over
> dynamic values — I think it's called rainbow spectrum or something; we have a few
> different signature algorithms. I used to work at Itron and built **disaggregation
> over electric signal at 16 kHz**."*

**What that is:** non-intrusive load monitoring (**NILM**) — recovering *which
individual appliances are running* from a single aggregate electrical signal, by their
characteristic signatures. Doing it at **16 kHz** is high-rate (transient/harmonic
signatures), well past the 1 Hz-ish metering most NILM literature assumes. He built
this professionally.

**Why it matters for Zeta:** this is the **human anchor** under a mechanism the repo
already has but had not attributed:

- `src/Core/CoordinationSpectrum.fs` — *"the S-spectrum as a **soft-rainbow
  fingerprint**"*; the CHSH probe battery acts as a **prism**, and one source wearing
  many faces disperses into a characteristic pairwise-S spectrum.
- `src/Core/Optics.fs` — `FingerprintPrism.Rainbow`.
- The 4×4 controller's universality works by **loading the signature of the search
  space you are in** (Xbox-like: invariant shape, swappable semantics). That *is*
  signature detection driving interface semantics.

The already-cited anchor is Pappu 2002 (*Physical One-Way Functions* — PUFs, identity
read from laser speckle). **NILM is the missing sibling anchor**, and it is stronger
here because Aaron has hands-on production experience with it, not just a citation.
Canonical NILM reference: **G. W. Hart, "Nonintrusive Appliance Load Monitoring",
Proc. IEEE 80(12), 1992.**

**How to apply:**

- When designing or reviewing signature/fingerprint detection, *ask Aaron* — this is
  first-hand expertise, not something to reason about from first principles.
- Cite Hart 1992 + Aaron's Itron disaggregation work when the signature machinery needs
  a Beacon anchor ([[feedback-errors-should-teach-the-user-when-they-fail]] register
  discipline: outward-facing claims stand on named human shoulders).
- The NILM framing suggests transferable structure worth mining: signatures are
  **additive** in the aggregate (superposition of loads), detection is **inference
  under overlap**, and the hard cases are *simultaneous* and *near-identical* loads —
  all of which map onto distinguishing agents/sources in a shared channel.

Related: the other Itron memories cover mesh HW/FW/PKI/secure-boot, the throttler
concept, metering protocols (DLMS/COSEM, ANSI C12), and mentors — **none covered
disaggregation**, which is why this is its own file.
