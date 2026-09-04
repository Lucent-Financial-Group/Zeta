# Claim - task-arc-rung-f-calibration-falsifier

- **Session ID:** codex/019e9b66-4ea9-75e3-9452-c5816b3e945d
- **Harness:** OpenAI Codex - Vera (GPT-5.6)
- **Claimed at:** 2026-09-04T19:50:19Z
- **ETA:** 2026-09-04T22:30:00Z
- **Scope:** Complete work item `081M0QRPN05087G0R00047WBC4`: add a deterministic calibration falsifier for ARC pre-commitment coordinate fields, including committed and refused outcomes, without altering the measured policy to force a favorable verdict.
- **Durable target:** source-owned ARC calibration types and meter, generated calibration evidence, browser readout, focused falsifier tests, the completed work item, and this claim's removal in the landing PR.
- **Platform mirror:** GitHub pull request.

## Exit

- The meter reports a numeric proper score and calibration error from recorded `(displayed distribution, outcome)` pairs.
- Refusal is a first-class outcome rather than a filtered sample.
- A mutant display or commit turns the focused test red.
- The current policy's measured verdict is reported honestly, including an uncalibrated result.
- Repository gates pass and the work lands on `origin/main`.
