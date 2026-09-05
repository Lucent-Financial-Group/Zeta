# User-Declared Lexical-Geometric Bayesian Input Contract

> **Status:** Frozen implementation contract. This work specifies a finite, editable representation for declared lexical forms and a user-supplied colored spatial calibration. It is not a medical explanation, a model of any person’s perceptual experience, an English semantic system, a geospatial truth system, a cortical-column implementation, or a general-learning result.

## Recommendation

**Build an explicit calibration receipt before fitting any model.** The v0 object is a deterministic, content-addressed input and provenance record. It can show that a given declared encoding is stable, conflict-retaining, and admissible as a finite geometric observation to an existing Bayesian query. It cannot show that the encoding is the correct meaning of any word or that it improves learning without a separate held-out benchmark.

## 1. Scope and representation boundary

The representation has three independent inputs. Each is versioned and visible in a receipt.

| Input | Authoritative field set | Role | Prohibited interpretation |
| --- | --- | --- | --- |
| English seed | Existing `seed.json` version, seed ID, exponent, and allolexes | Exact lexical match only | A seed ID is not a discovered word sense or a semantic prime proof |
| Lexical correction state | Existing canonical `LexicalCorrectionState` content IDs and visible conflicts | Provenance and conflict status only | A `replaced` receipt does not silently rewrite an input into a seed ID |
| User-declared calibration | Calibration version, seed ID, RGB color, `Cl3` coordinates, uncertainty in ppm | Explicit feature assignment | A coordinate or color is not inferred from language, biology, geospatial reality, or any person’s mind |

A default personal calibration is deliberately **not** committed. Only the schema and non-personal test fixtures enter version control. Addison or another user may later submit a calibration dataset as editable declared data. A missing calibration entry remains unresolved; the implementation must not synthesize a hash-derived coordinate and present it as personal data.

## 2. Calibration schema and canonical identity

The v0 schema is `declared-lexical-geometry-calibration/v1`.

```json
{
  "algorithm": "declared-lexical-geometry-calibration/v1",
  "calibrationVersion": "user-supplied-version",
  "seedVersion": "nsm-english-candidate/v0",
  "entries": [
    {
      "seedId": "candidate-seed-id",
      "rgb": "#RRGGBB",
      "x": 0.0,
      "y": 0.0,
      "z": 0.0,
      "uncertaintyPpm": 0
    }
  ]
}
```

Each text field is NFKC-normalized and length-prefixed in the receipt fingerprint. `seedId` must be a member of the loaded seed. RGB must be canonical uppercase `#RRGGBB`; each coordinate must be finite and within the closed unit interval `[-1, 1]`; `uncertaintyPpm` is an integer from `0` through `1,000,000`. Entries are canonically sorted by their complete entry fingerprint before any receipt fold. A duplicate seed ID is a visible calibration conflict, not a winner-selection opportunity.

## 3. Deterministic projection

For every tokenizer span, the projection produces one of the following records in source-span order:

| Outcome | Condition | Required retained data |
| --- | --- | --- |
| `Resolved` | Exact seed/allolex match and exactly one calibration entry | Surface span, seed ID, RGB, `Cl3.vector(x,y,z)`, `ConformalGA.embed`, uncertainty, and input fingerprints |
| `UnresolvedToken` | No exact declared lexical match | Original normalized span and explicit reason; no guessed synonym or coordinate |
| `UnresolvedCalibration` | Exact seed match but no calibration entry | Surface span and seed ID; no generated fallback coordinate |
| `Conflict` | Conflicting calibration entries or existing lexical correction conflict | All conflicting content IDs; no automatic winner |
| `Refused` | Schema, version, range, or seed-membership violation | A teaching error naming the field and safe next step |

Lexical correction receipts are included as canonical provenance content IDs. Multiple same-surface correction conflicts union their distinct content IDs in canonical order; no arrival order selects a winner. They do not update or replace a lexical match in v0. Any future rewrite policy needs its own versioned contract and a correction-to-seed declaration; it must not be hidden in this projection.

## 4. Geometric and Bayesian adapter

A resolved coordinate maps directly to `Cl3.vector(x,y,z)` and `ConformalGA.embed`. The conformal embedding and its RBF kernel provide a finite, deterministic geometric carrier and a PSD similarity query. The selected calibration RGB is presentation metadata; it never participates in the numeric coordinate fold.

For an optional unary Bayesian input, a resolved coordinate becomes an existing `ReferenceFrameFactorHeterarchy.Gaussian3` observation with mean `(x,y,z)` and isotropic covariance:

\[
\sigma^2 = 10^{-6} + (1 - 10^{-6})\,u/1{,}000{,}000,
\]

where \(u\) is the declared `uncertaintyPpm`. This is a **unit-cube feature-noise convention**, not an estimate of perceptual, semantic, physical, or biological uncertainty. The adapter only establishes that a finite declared vector can pass the existing SPD validation. It does not create a posterior by itself, and any later posterior remains a deterministic query over its declared evidence—not a CRDT merge.

## 5. Required controls and falsifiers

| Control | Required result | What failure would show |
| --- | --- | --- |
| Calibration-entry permutation | Byte-identical receipt and query input | Canonicalization defect |
| Coordinate or RGB mutation | Changed fingerprint and changed affected projection | Receipt not binding declared data |
| Duplicate calibration seed ID | Visible `Conflict`; no coordinate selected | Hidden overwrite or false resolution |
| Unknown lexical span | `UnresolvedToken` retained | Guessed lexical completion |
| Missing calibration for known seed | `UnresolvedCalibration` retained | Fabricated personal/default mapping |
| Correction-state same-surface conflict | `Conflict` remains visible | Correction winner silently chosen |
| Non-finite/out-of-range coordinate or invalid RGB | Teaching-error refusal before projection | Unsafe feature admission |
| Gaussian covariance mutation | Existing SPD admission rejects non-positive covariance | Adapter bypasses the Bayesian input boundary |

The test fixtures must be labeled non-personal. A test that derives a coordinate from a seed ID is permitted only as a **negative control** demonstrating that this shortcut differs from user-supplied calibration; it must never be an admitted production fallback.

## 6. Benchmark gateway and non-claims

The gSCAN candidate benchmark is a later, separate measurement because it contains a synthetic grammar and explicit finite grid worlds.[1] The first candidate transfer result should name one gSCAN generator revision, one published split (initially `situational_1`, the held-out novel-direction split), a data hash, an action-sequence metric, a compute cap, and at least a token-only baseline plus an ablation of the geometric feature. A result on that task would be a finite synthetic-task measurement, not evidence of English understanding, real-world transfer, or general intelligence.

The Thousand Brains sources motivate a capability matrix for feature/location inputs, frame changes, partial-observation routing, and later agreement; they do not license a claim that Zeta implements cortical columns or any human cognitive function.[2] The current Zeta RFFH module remains a bounded typed evidence-and-pose surface, not a learner or cortical simulator.

## References

[1] [Ruis et al., "A Benchmark for Systematic Generalization in Grounded Language Understanding" (2020)](https://arxiv.org/abs/2003.05161)

[2] [Clay, Leadholm, and Hawkins, "The Thousand Brains Project: A New Paradigm for Sensorimotor Intelligence" (2024)](https://arxiv.org/abs/2412.18354)
