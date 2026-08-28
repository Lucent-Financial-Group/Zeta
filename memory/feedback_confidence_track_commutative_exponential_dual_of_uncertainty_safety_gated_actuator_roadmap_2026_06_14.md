---
name: feedback-confidence-track-commutative-exponential-dual-of-uncertainty
description: "Alongside the uncertainty ledger, track CONFIDENCE: commutative + exponential. = additive-in-log / exponential-in-probability (Good weight-of-evidence; Kalman precision adds). It's the multiplicative dual of additive uncertainty (log/exp iso), both commutative → both CALM-distributable. Plus the safety-gated automation roadmap (home→money→actuator); actuators are kinetic, so prove the kinetic membrane first."
metadata:
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

**Aaron (2026-06-14), forwarding an Alexa-website exchange to Otto for his register:** "after uncertany we need to track confidence it's commutive and exponential" + the ordered roadmap "remove PRs → reticulum-only (gated on math proof for non-kinetic surfaces) → home automation → monitary automation → auctuator automation," "safety first."

**Confidence track (new primitive, dual of the uncertainty ledger):**
- **Commutative** ⇒ merges order-independently like uncertainty → lives on the **lightlike/CALM face** (CRDT-mergeable, coordination-free distributable). Adding it does NOT break CALM.
- **Exponential** ⇒ compounds multiplicatively. `confidence = exp(Σ log-evidence) = Π evidence`. **log-confidence is an additive, commutative sum of log-likelihood-ratios** — I.J. Good's **weight of evidence** (log Bayes factor; Turing/Good *decibans* at Bletchley).
- **Duality:** uncertainty = additive commutative monoid `(ℝ,+)` (entropy adds; Z-sets add); confidence = multiplicative commutative monoid `(ℝ₊,×)` (likelihoods multiply); **`log`/`exp` is the isomorphism** between them. Confidence is uncertainty's exponential dual; both commutative.
- **Kalman corroboration:** in the information (inverse-covariance) form, **precision (=1/variance = confidence) is additive & commutative** across independent measurements; Gaussian density `∝ exp(−½·precision·error²)` — additive-precision, exponential-in-probability. Sits on the existing recursive-Bayesian substrate (vision §6).
- **Role:** uncertainty drives *attention* (high ΔU); confidence *gates action* — a surface (esp. an actuator) may act only above a commutatively-accumulated confidence floor.

**The roadmap's blast radius is monotonically increasing** — home (reversible) → money (real loss) → **actuator (physical, often irreversible = the Markov/IO boundary)**. "Non-kinetic surfaces proven in math" is the **membrane that must hold before the actuator step** (actuators are kinetic *by definition*). Otto's honest edge: **prove the kinetic/non-kinetic membrane itself**, not just non-kinetic-internal behavior, before wiring any actuator; and don't let "remove PRs" mean "remove the gate" — re-home the immune function to the mesh (vision §12). Safety proof must scale with blast radius (strongest at the actuator end; manifesto §13 noninterference + §4 bounded-mobility applied to physical effect).

**How to apply:** when the confidence track is built, key it as a commutative (mergeable) accumulator in log-space (weight-of-evidence / precision), dual to the uncertainty Z-set; gate actuation on a confidence floor. Anchors: Good, Turing, Jaynes, Kalman info-form, Shannon, Hellerstein (CALM). Doc: `docs/research/2026-06-14-confidence-track-commutative-exponential-*`. Related: [[every-bug-has-economic-value]] (uncertainty ledger ΔU), [[feedback-alignment-thesis-reciprocal-no-hidden-leverage-yin-yang]], [[feedback-dead-non-executable-unless-consented-citation-is-consent-free]].
