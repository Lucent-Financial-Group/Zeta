# ARC Adversarial Leakage And Efficiency Audit

Status: measured review of the source state on 2026-09-05. This is not an
official ARC score or evidence of general intelligence.

## Verdict

The current ARC lane is a task-specific harness evaluated repeatedly on the
public demonstration roster. Its hosted numbers are useful engineering
measurements for this harness. They are not valid evidence for ARC's official
generalization claim. ARC's technical report explicitly says that the public
set is a demonstration interface, that the official evaluation is private and
out of distribution, and that public-set scores from task-specific harnesses
must not be reported as progress toward general intelligence.

The implementation does not contain hard-coded action scripts or level
solutions for hosted games. The coordinate learner receives rendered grids
only. This change removes the hosted game identifier from its constructor as
well, so neither game identity, level identity, human reference actions, engine
score, nor target metadata can enter through that port.

## Findings

### P0 - Local Scoring Was Stale

`score_level` capped the efficiency ratio at 1.0 and `environment_score` omitted
the weighted completion cap. ARC toolkit 0.9.9 implements a 115 percent
per-level cap and caps each game by the weighted fraction of completed levels.
Both local scorers now implement those rules, with regression tests for the
bonus and completion caps.

This defect affected Zeta's local estimates. The ARC server remains the source
of truth for an official scorecard.

### P1 - Public-Roster Iteration Is Test-Set Adaptation

The workflow repeatedly evaluates the same public roster, and repository
changes can be selected after observing those results. Even without explicit
level scripts, that is adaptation to a known evaluation set. The three-arm run
must therefore be labelled a community harness experiment, never a held-out or
official result.

No repository-only change can repair this. A valid generalization result needs
the private competition evaluation under its enforced execution rules.

### P1 - Normal Mode Is Not Competition Mode

The current hosted workflow opens the toolkit in normal mode. ARC competition
mode permits one `make` call per environment, scores all available
environments, permits only level resets, and prevents reading an in-flight
scorecard. The three-arm experiment intentionally creates each public
environment three times, once per policy. It is an ablation experiment and
cannot be represented as one competition submission.

### P1 - One Sample Does Not Establish A Performance Difference

One roster snapshot and one seed control roster membership and an explicit
random input. They do not establish that remote execution, server state, or
runtime noise are identical. Score deltas are observations, not confidence
intervals. CPU, wall time, and Python heap are reported as one process sample
and must not be used as a correctness gate.

### P2 - Online Episode Learning Is Not Zero-History Inference

The scene policy updates color and shape evidence after actions within an
episode. This is allowed test-time adaptation and is central to an interactive
task, but it is not inference with no prior observations. Each hosted
environment receives a fresh policy instance, so learned state does not cross
environment boundaries.

### P2 - Resource Proxies Are Not Hardware Counters

The deterministic receipt reports calls, grid cells crossing the coordinate
port, and the canonical JSON size of retained semantic state. Those values are
portable and regression-testable, but they are not instruction count, RSS, or
serialized production storage. The comparison also reports sampled process CPU,
wall time, Python heap peak, and report bytes with those limitations attached.

The receipt found one concrete retention defect during this review. On the
source-owned 64 by 64 click control, observed scene feedback retained a 23,446
byte canonical checkpoint after one action, versus 8,267 bytes for centroid.
The scene adapter was retaining the complete last outcome and independently
copying the same frame into an unused fallback policy. Removing both redundant
copies reduced the scene checkpoint to 8,915 bytes, a 14,531 byte (62.0 percent)
reduction with the same action and score. Sampled peak Python heap did not fall,
so this is evidence about retained semantic state, not a claim about process RSS.

## Enforced Boundaries

- `build_hosted_agent` accepts only a coordinate-policy selection. It cannot
  receive a game or level identifier.
- `CoordinatePolicy.choose` and `CoordinatePolicy.observe` accept only a grid.
- Human reference actions are passed to scoring after the agent is built and
  are never passed to the coordinate policy.
- Every hosted environment gets a new policy and new learned state.
- The default remains the centroid control. Observed and one-step predictive
  policies are explicit experiment arms.
- The workflow withholds the API key from pull-request code.

## Efficiency Decision Rule

An optimization earns adoption only when it is Pareto-better or when its trade
is explicit. For the same roster, seed, and action ceiling, report:

1. levels cleared, mean game score, and environment actions;
2. coordinate decisions, observations, and grid cells received;
3. retained-state canonical bytes and report bytes;
4. sampled process CPU and Python heap peak;
5. every regression in the same table as every gain.

Lower CPU, memory, or storage without preserved task performance is not an
optimization. Higher score bought with unbounded state or compute is not a
resource-efficiency result.

## External Anchors

- ARC-AGI-3 scoring methodology:
  <https://docs.arcprize.org/methodology>
- ARC-AGI-3 competition mode:
  <https://docs.arcprize.org/toolkit/competition_mode>
- ARC-AGI-3 technical report, especially sections 3.6, 4, and 4.3:
  <https://arcprize.org/media/ARC_AGI_3_Technical_Report.pdf>
