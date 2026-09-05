#!/usr/bin/env bun

/**
 * Watchdog for the agent-heartbeat lane: "has a heartbeat SUCCEEDED recently?"
 *
 * WHY THIS EXISTS AS A SEPARATE THING FROM THE CADENCE STEP.
 *
 * `agent-heartbeat.yml` already measures cadence — step "Measure cadence (declared vs actual)".
 * That step lives INSIDE the heartbeat job, downstream of "Accumulate unflushed heartbeat state
 * over current main", and carries no `if:`, so it inherits the default `success()` gate. On
 * 2026-08-16T23:05Z through 2026-08-17T00:49Z the accumulate step failed on every tick and the
 * cadence step was reported `skipped` on every one of them. The measurement built to catch
 * silent degradation is switched off by the degradation. It can only speak while the thing it
 * watches is healthy, which is the one condition under which nobody needs it.
 *
 * It also cannot see the other half of the problem. It reads `docs/observe-events/*.json` from
 * inside a run, so it only measures ticks that HAPPENED. GitHub drops scheduled slots under
 * load: over 2026-08-16T00:19Z..2026-08-17T00:49Z the lane fired 84 scheduled runs where an
 * every-15-minutes cron declares 100, with observed inter-run gaps of 12..43 minutes against a
 * declared 15 (p50 16, p90 27). When a slot is dropped there is no run, so there is nothing to run a
 * check inside. An outage that consists of runs NOT HAPPENING is invisible to anything that
 * only executes when a run happens.
 *
 * So the watchdog is deliberately OUTSIDE the lane: a separate workflow, on its own schedule,
 * asking the Actions API a question about the heartbeat rather than asking the heartbeat about
 * itself. It is level-triggered ("how old is the newest success?"), never edge-triggered
 * ("did a tick just land?"), because a level-triggered check still gives the right answer when
 * the watchdog's OWN cron slot is dropped — it just answers later. An edge-triggered one would
 * miss the edge and go quiet, reproducing the bug it exists to catch.
 *
 * The logic is a pure function over run records so it can be unit-tested against outage shapes
 * that are hard to stage in production — no runs at all, only failures, a clock skew, a run
 * still in progress. A monitor whose alarm path never executes in test is a monitor nobody has
 * ever seen work.
 */

/** One Actions run, narrowed to the fields the verdict depends on. */
export interface HeartbeatRunRecord {
  /** ISO-8601 run creation time, as returned by the Actions API `created_at`. */
  readonly created_at?: unknown;
  /** `queued` | `in_progress` | `completed`. */
  readonly status?: unknown;
  /** `success` | `failure` | `cancelled` | ... ; null while the run is not completed. */
  readonly conclusion?: unknown;
}

export interface LivenessVerdict {
  /** True only when a completed successful run exists and is younger than the threshold. */
  readonly alive: boolean;
  /** Human-readable one-liner naming what was measured and against what. */
  readonly summary: string;
  /** ISO timestamp of the newest successful run, when one was found. */
  readonly lastSuccessAt?: string;
  /** Age of that success in whole minutes, clamped at 0. Absent when there is no success. */
  readonly ageMinutes?: number;
  /** How many run records the verdict was computed over — 0 is itself an alarm condition. */
  readonly consideredRuns: number;
}

/**
 * Default alarm threshold, in minutes.
 *
 * Sized from measured behaviour, not from the declared cadence. The declared cron fires every
 * 15 minutes, but GitHub's jitter and dropped slots put the observed worst-case gap between
 * consecutive scheduled runs at 43 minutes over a 25-hour sample — with the lane perfectly
 * healthy. A threshold at or below that would fire on GitHub's normal behaviour, and an alarm
 * that cries wolf during healthy operation gets muted, which is a slower way of having no
 * alarm at all. 60 minutes is four consecutive missed slots: comfortably above the observed
 * noise floor, still far short of the multi-hour silence this is meant to prevent.
 */
export const DEFAULT_STALE_AFTER_MINUTES = 60;

const MS_PER_MINUTE = 60_000;

/**
 * Parse an API timestamp, returning undefined rather than a fallback on anything unparseable.
 *
 * Deliberately NOT defaulting to "now" on a bad value. A malformed timestamp read as the
 * current time makes a stale lane look fresh — the monitor would report health it did not
 * measure. Unparseable input must drop the record, so a corpus of bad records degrades toward
 * "no usable success found" (an alarm) instead of toward silence.
 */
function parseTimestamp(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isSuccessfulRun(run: HeartbeatRunRecord): boolean {
  // Both fields are checked. `conclusion === "success"` alone would be enough for the API as it
  // behaves today, but a queued or in-progress run carries `conclusion: null`, and reading a
  // not-yet-finished run as proof of life is exactly the optimism this file exists to refuse.
  return run.status === "completed" && run.conclusion === "success";
}

/**
 * Decide whether the heartbeat lane is alive, given the recent runs and the current time.
 *
 * Pure: no network, no clock, no filesystem. `now` is injected so the outage cases are
 * reachable from tests.
 */
export function assessHeartbeatLiveness(
  runs: readonly HeartbeatRunRecord[],
  now: Date,
  staleAfterMinutes: number = DEFAULT_STALE_AFTER_MINUTES,
): LivenessVerdict {
  const considered = runs.length;

  // AN EMPTY RESULT IS AN ALARM, NOT A PASS. This is the case that turns a watchdog into
  // decoration: a bad filter, a renamed workflow, a token that lost `actions: read`, or an API
  // hiccup all return zero rows, and "no rows" read as "nothing wrong" means the monitor
  // reports healthy hardest at the moment it has stopped being able to see anything.
  if (considered === 0) {
    return {
      alive: false,
      summary:
        "no agent-heartbeat runs were returned at all — the lane is either stopped or the watchdog cannot see it; both need a human",
      consideredRuns: 0,
    };
  }

  const successTimes = runs
    .filter(isSuccessfulRun)
    .map((run) => parseTimestamp(run.created_at))
    .filter((at): at is Date => at !== undefined);

  if (successTimes.length === 0) {
    return {
      alive: false,
      summary: `no SUCCESSFUL agent-heartbeat run among the ${considered} most recent runs — the lane is firing but every tick is failing`,
      consideredRuns: considered,
    };
  }

  // Newest by TIMESTAMP, not by list position. The Actions API returns newest-first today, but
  // ordering is an API convenience and not a guarantee; sorting on the value actually being
  // measured is correct under any ordering.
  const newest = successTimes.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));

  // CLAMPED AT ZERO. A run timestamped in the future — runner clock skew, or a record whose
  // time is not what its position implies — otherwise yields a NEGATIVE age, which sails under
  // any threshold and silences the alarm permanently. Clamping makes skew read as "very
  // recent" (loud-failure-free but bounded) instead of "infinitely recent".
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - newest.getTime()) / MS_PER_MINUTE));
  const lastSuccessAt = newest.toISOString();
  const alive = ageMinutes < staleAfterMinutes;

  return {
    alive,
    summary: alive
      ? `last successful agent-heartbeat was ${ageMinutes}min ago (threshold ${staleAfterMinutes}min)`
      : `NO SUCCESSFUL agent-heartbeat IN ${ageMinutes} MINUTES — last success ${lastSuccessAt}, threshold ${staleAfterMinutes}min`,
    lastSuccessAt,
    ageMinutes,
    consideredRuns: considered,
  };
}

/**
 * Extract run records from the Actions API payload, accepting either the full object
 * (`{ workflow_runs: [...] }`) or a bare array, which is what `--jq '.workflow_runs'` yields.
 *
 * Anything else throws. A shape this does not recognise must not silently become an empty
 * array: empty is a specific finding ("the lane is stopped") and must not be manufactured by a
 * parser giving up.
 */
export function extractRuns(payload: unknown): readonly HeartbeatRunRecord[] {
  if (Array.isArray(payload)) return payload as readonly HeartbeatRunRecord[];
  if (
    payload !== null &&
    typeof payload === "object" &&
    Array.isArray((payload as { workflow_runs?: unknown }).workflow_runs)
  ) {
    return (payload as { workflow_runs: readonly HeartbeatRunRecord[] }).workflow_runs;
  }
  throw new Error("unrecognised Actions API payload: expected an array of runs or an object with `workflow_runs`");
}

/**
 * ---------------------------------------------------------------------------------------------
 * FLEET LIVENESS - the same question asked of EVERY tick source, not just of GitHub Actions.
 * ---------------------------------------------------------------------------------------------
 *
 * Everything above answers "how old is the newest SUCCESSFUL Actions run?". That is a question
 * about the PROVIDER'S JOB STATUS, and it is not the same question as "is the fleet ticking".
 * The two came apart in both directions, measured on this repository:
 *
 *   FALSE ALARM, observed 2026-08-25T17:11Z. `assessHeartbeatLiveness` returned
 *   "NO SUCCESSFUL agent-heartbeat IN 102 MINUTES - last success 2026-08-25T15:29:08Z" and the
 *   CLI exited 1. At that moment `heartbeat/alexa` carried "heartbeat(alexa): accumulated tick
 *   2026-08-25T16:49:05Z" - 22 minutes old. The tick HAD landed; the run that produced it went
 *   red at a later step, so its conclusion was not `success`, so the watchdog could not see the
 *   tick it had itself produced.
 *
 *   FALSE GREEN, by construction. agent-heartbeat.yml runs its tick body under
 *   `|| echo "[heartbeat] tick failed (non-fatal)"`, and its commit step prints "no new events to
 *   commit" and succeeds when nothing is staged. A run can conclude `success` having committed
 *   and pushed nothing, and this watchdog reads that as proof of life.
 *
 * And the coupling that matters for decoupling: a tick produced by ANY substrate that is not
 * GitHub Actions contributes zero rows to the Actions runs list, so it is invisible here no
 * matter how correct it is. Until this function existed, "alive" was DEFINED as "GitHub ran a
 * job", and a second tick source could not have turned the check green even in principle.
 *
 * WHY THIS IS NOT A WEAKENING OF THE EXISTING CHECK. The threshold, the clamping, the
 * empty-is-an-alarm rule and the refusal to treat in-progress runs as success are all unchanged -
 * `assessHeartbeatLiveness` above is untouched and its tests still pin it. What changes is only
 * that Actions is now ONE source among several rather than the definition of the term. The
 * verdict still fails when nothing has ticked; it stops failing when something HAS ticked and
 * merely was not GitHub.
 *
 * THE ADDITIVE-ONLY RULE, which this function must never break. Lane evidence can prove a source
 * ALIVE and can never prove one DEAD. A lane holds only UNFLUSHED ticks - the preparer resets it
 * over main every tick - so a flush that just landed legitimately leaves a lane with zero tick
 * commits. Reading that absence as an outage would manufacture a failure out of a healthy flush,
 * which is the "absent read as EMPTY" defect this repo fixed in #15381. Hence: a source with no
 * observations is NOT reported stale, it is simply not reported.
 */

/**
 * ---------------------------------------------------------------------------------------------
 * ENROLLMENT - "is the thing I watch even switched on?"
 * ---------------------------------------------------------------------------------------------
 *
 * WHAT WENT WRONG, measured on this repository 2026-09-03. `agent-heartbeat.yml`,
 * `society-heartbeat.yml` and `tick-metrics.yml` were deliberately disabled on 2026-08-29 while
 * the heartbeat lane is redesigned for space efficiency. This watchdog was re-enabled on
 * 2026-09-03 without asking whether its subject was still switched on, so it answered the only
 * question it knew how to ask - "how old is the newest success?" - and answered it CORRECTLY:
 * very old. Result: 35 of 35 runs red in seventeen hours, and 68 comments on one tracking issue,
 * every one of them a true statement about a condition somebody created on purpose.
 *
 * That is not a monitor working. It is the failure this file's own header warns about, arriving
 * from an angle the header did not anticipate: "an alarm that cries wolf during healthy operation
 * gets muted, which is a slower way of having no alarm at all." The threshold was sized against
 * GitHub's scheduling jitter. Nothing was sized against the subject being turned off.
 *
 * THE DISTINCTION THE CODE WAS MISSING. A source that is expected to tick and has not is STALE.
 * A source that nobody expects to tick is not stale - it is UNENROLLED, and reporting it as an
 * outage manufactures a finding out of a decision. The repo already has this vocabulary: a loop
 * participant that has recorded a `deregister` event is not a faulty participant, it is not a
 * participant. Enrollment is that idea applied to the watchdog's own subject.
 *
 * WHY THIS DOES NOT MAKE THE CHECK UNFALSIFIABLE. Three properties, each of them checkable:
 *
 *   1. The enrollment answer is DERIVED FROM THE LIVE API (`workflow.state`), never from a
 *      hand-maintained list in this repo. Nobody can silence the alarm by editing an allowlist,
 *      and re-enabling the subject re-arms the alarm with no code change at all.
 *   2. FRESHNESS WINS. A fresh source makes the fleet alive whatever the subject's state, so the
 *      pause branch can only ever be reached when nothing has ticked anyway - it changes how that
 *      silence is REPORTED, never whether a tick was seen.
 *   3. UNRECOGNISED STATE FAILS CLOSED. Any state string this module does not know is treated as
 *      `active`, so a renamed or invented state re-arms the alarm rather than silencing it.
 *      Guessing "probably disabled" from an unknown value is how a monitor talks itself quiet.
 *
 * WHAT IT STILL CANNOT DISTINGUISH, stated rather than papered over: when the subject is disabled
 * AND a non-Actions source is also silent, nothing here can tell whether that other source died
 * or was paused alongside it. The verdict says so in as many words instead of picking the
 * flattering reading - the stale sources are named in the summary under a `paused` outcome, so a
 * reader sees "nobody is watching for these" rather than either "all well" or "they are dead".
 */

/**
 * Lifecycle state of an Actions workflow, as reported by
 * `GET /repos/{owner}/{repo}/actions/workflows/{file}` -> `.state`.
 *
 * Spelled out rather than typed as `string` so that a value GitHub adds later is a value this
 * module does not recognise, which routes it to the fail-closed branch above.
 */
export type SubjectWorkflowState = "active" | "disabled_manually" | "disabled_inactivity" | "disabled_fork";

/**
 * The states under which the subject cannot tick, so its silence is expected rather than alarming.
 *
 * `disabled_inactivity` is included deliberately even though nobody chose it: GitHub switches a
 * scheduled workflow off after 60 days without repository activity, and a lane that has been
 * switched off BY the provider is exactly as unable to tick as one switched off by a human. What
 * differs is that nobody decided it, which is why the paused summary names the state verbatim
 * instead of saying "paused on purpose".
 */
const DISABLED_STATES: readonly string[] = ["disabled_manually", "disabled_inactivity", "disabled_fork"];

/**
 * Parse a `.state` value, returning `undefined` for anything unrecognised.
 *
 * Callers must treat `undefined` as `active`. That direction is not arbitrary: mapping an unknown
 * value to "disabled" would let a typo, an API change or a truncated response silence a real
 * outage, and a monitor that goes quiet on input it does not understand is the vacuity class with
 * a parser bolted on.
 */
export function parseSubjectWorkflowState(raw: unknown): SubjectWorkflowState | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  switch (trimmed) {
    case "active":
    case "disabled_manually":
    case "disabled_inactivity":
    case "disabled_fork":
      return trimmed;
    default:
      return undefined;
  }
}

/** True only for a state this module recognises AND that prevents the subject from running. */
export function subjectIsUnenrolled(state: SubjectWorkflowState | undefined): boolean {
  return state !== undefined && DISABLED_STATES.includes(state);
}

/** One observed tick, attributed to the substrate that produced it. */
export interface FleetTickObservation {
  readonly source: string;
  readonly at: string;
}

/** Per-source freshness. */
export interface SourceLiveness {
  readonly source: string;
  readonly lastAt: string;
  readonly ageMinutes: number;
  readonly fresh: boolean;
}

export interface FleetLivenessVerdict {
  /** True when AT LEAST ONE source has ticked inside the threshold. */
  readonly alive: boolean;
  /**
   * The three-valued reading. `alive` is kept alongside it and is exactly `state === "alive"`, so
   * every existing caller keeps working unchanged; new callers that need to tell an outage apart
   * from a switched-off subject read this instead.
   *
   * `paused` is NOT a pass. It says the watchdog is currently watching a subject that cannot tick,
   * which is a thing a human should know about - it is reported, recorded on the ledger and
   * warned about, and it merely stops being reported as a LANE OUTAGE, which it is not.
   */
  readonly state: "alive" | "stale" | "paused";
  readonly summary: string;
  /** Every source that produced at least one observation, newest-first by recency. */
  readonly sources: readonly SourceLiveness[];
  readonly consideredObservations: number;
}

/** Convert Actions run records into observations so they can be folded with lane evidence. */
export function runsToObservations(
  runs: readonly HeartbeatRunRecord[],
  source = "github-actions/.github/workflows/agent-heartbeat.yml",
): readonly FleetTickObservation[] {
  const out: FleetTickObservation[] = [];
  for (const run of runs) {
    if (!isSuccessfulRun(run)) continue;
    const at = parseTimestamp(run.created_at);
    if (at === undefined) continue;
    out.push({ source, at: at.toISOString() });
  }
  return out;
}

/**
 * Is ANY tick source alive?
 *
 * Pure: no network, no clock, no filesystem. `now` is injected so every outage shape is reachable
 * from a test - a monitor whose alarm path never executes in test is a monitor nobody has seen
 * work.
 */
export function assessFleetLiveness(
  observations: readonly FleetTickObservation[],
  now: Date,
  staleAfterMinutes: number = DEFAULT_STALE_AFTER_MINUTES,
  subjectState?: SubjectWorkflowState,
): FleetLivenessVerdict {
  const considered = observations.length;

  // Computed once, up front, so every branch below reads the same answer. `undefined` - the
  // caller did not supply a state, or supplied one this module does not recognise - is FALSE
  // here, which routes an unknown subject down the ordinary alarm path. See
  // `parseSubjectWorkflowState` for why that direction is the safe one.
  const unenrolled = subjectIsUnenrolled(subjectState);
  const stateNote = subjectState === undefined ? "unknown" : subjectState;

  if (considered === 0) {
    // A KNOWN-DISABLED SUBJECT EXPLAINS ZERO ROWS; AN UNKNOWN ONE DOES NOT. The empty case is
    // normally an alarm precisely because a bad filter, a renamed workflow or a lost
    // `actions: read` all look like this, and reading zero as "nothing wrong" would make the
    // monitor report healthiest at the moment it went blind. That argument turns on not knowing
    // WHY the rows are missing. Here we do: the caller obtained the subject's state from the same
    // API, so the successful state read is itself the proof that the permission is intact and the
    // workflow still exists under the name we asked for. Zero rows from a workflow we have just
    // confirmed is switched off is not blindness, it is arithmetic.
    if (unenrolled) {
      return {
        alive: false,
        state: "paused",
        summary: `no tick evidence from any source, and the watched Actions subject is ${stateNote} - this is a PAUSED lane, not an outage; re-enabling the workflow re-arms this alarm with no code change`,
        sources: [],
        consideredObservations: 0,
      };
    }
    return {
      alive: false,
      state: "stale",
      summary:
        "no tick evidence from ANY source - either every tick source has stopped or the watchdog cannot see any of them; both need a human",
      sources: [],
      consideredObservations: 0,
    };
  }

  const newestBySource = new Map<string, number>();
  for (const observation of observations) {
    const at = parseTimestamp(observation.at);
    // A malformed timestamp drops the record rather than defaulting to now: a bad value read as
    // the current time makes a dead source look fresh, which is health nobody measured.
    if (at === undefined) continue;
    const previous = newestBySource.get(observation.source);
    if (previous === undefined || at.getTime() > previous) newestBySource.set(observation.source, at.getTime());
  }

  if (newestBySource.size === 0) {
    // NOT ROUTED THROUGH THE PAUSE BRANCH, DELIBERATELY, however the subject is configured.
    // Evidence that exists and cannot be parsed is a fault in this watchdog, and a watchdog fault
    // must stay loud whether or not the thing it watches happens to be switched off. Letting a
    // disabled subject downgrade a parser failure to `paused` would mean the one state in which
    // nobody is checking the parser is also the state in which its failure is silent.
    return {
      alive: false,
      state: "stale",
      summary: `no PARSEABLE tick timestamps among ${considered} observations - the evidence exists but cannot be read, which is a watchdog fault and not a clean bill of health`,
      sources: [],
      consideredObservations: considered,
    };
  }

  const sources: SourceLiveness[] = [...newestBySource.entries()]
    .map(([source, ms]) => {
      // Clamped at zero for the same reason as above: a future-dated record (clock skew) would
      // otherwise yield a NEGATIVE age that sails under every threshold and silences the alarm
      // permanently.
      const ageMinutes = Math.max(0, Math.floor((now.getTime() - ms) / MS_PER_MINUTE));
      return { source, lastAt: new Date(ms).toISOString(), ageMinutes, fresh: ageMinutes < staleAfterMinutes };
    })
    .sort((a, b) => a.ageMinutes - b.ageMinutes);

  const freshest = sources[0];
  const alive = sources.some((s) => s.fresh);
  const stale = sources.filter((s) => !s.fresh);

  const staleNote =
    stale.length === 0
      ? ""
      : ` DEGRADED: ${stale.map((s) => `${s.source} last ticked ${s.ageMinutes}min ago`).join("; ")}.`;

  if (alive) {
    // FRESHNESS WINS OVER ENROLLMENT, and this ordering is the property that keeps the pause
    // branch from being able to hide a tick. A source that HAS ticked inside the threshold makes
    // the fleet alive no matter what state the Actions subject is in - including a source that is
    // not GitHub at all, which is the whole point of fleet liveness. So the pause branch below is
    // reachable only when nothing ticked anyway: it can change how silence is REPORTED and can
    // never change whether a tick was SEEN.
    return {
      alive: true,
      state: "alive",
      summary: `fleet alive - ${sources.filter((s) => s.fresh).length}/${sources.length} tick sources fresh; newest ${freshest?.source} ${freshest?.ageMinutes}min ago (threshold ${staleAfterMinutes}min).${staleNote}`,
      sources,
      consideredObservations: considered,
    };
  }

  if (unenrolled) {
    // THE HONEST LIMIT, SAID OUT LOUD IN THE SUMMARY RATHER THAN RESOLVED. With the subject
    // switched off and every other source silent, nothing available here can separate "that
    // source was paused too" from "that source died" - the two produce identical evidence. So the
    // stale sources are NAMED under a `paused` outcome instead of being folded into either
    // reading. A reader gets "nobody is currently watching for these", which is true, rather than
    // "all well" or "they are dead", each of which would be a guess wearing a verdict's clothes.
    const unwatched =
      sources.length === 0
        ? ""
        : ` Silent, and currently unwatched: ${sources.map((s) => `${s.source} (${s.ageMinutes}min)`).join("; ")}.`;
    return {
      alive: false,
      state: "paused",
      summary: `lane PAUSED - the watched Actions subject is ${stateNote}, so its silence is expected and is NOT reported as an outage.${unwatched} Whether the other silent sources are paused or dead cannot be told apart from here.`,
      sources,
      consideredObservations: considered,
    };
  }

  return {
    alive: false,
    state: "stale",
    summary: `NO TICK FROM ANY SOURCE IN ${freshest?.ageMinutes} MINUTES - newest was ${freshest?.source} at ${freshest?.lastAt}, threshold ${staleAfterMinutes}min`,
    sources,
    consideredObservations: considered,
  };
}

/**
 * CLI: `bun heartbeat-liveness.ts <runs.json> [staleAfterMinutes] [evidence.json] [subjectState]`.
 *
 * The third argument is OPTIONAL additional tick evidence - a JSON array of
 * `{ source, at }` produced by `lane-tick-evidence.ts`. When it is absent the verdict is computed
 * over the Actions runs alone, which is what this CLI did before fleet liveness existed; the
 * single-source path is therefore unchanged for any caller that does not opt in.
 *
 * The fourth argument is the watched workflow's `.state` from the Actions API, verbatim. Omitting
 * it, or passing a value this module does not recognise, keeps the pre-2026-09-03 behaviour
 * exactly: the subject is assumed enrolled and silence is an outage.
 *
 * EXIT CODES, and the reason there are three outcomes but only two of them are red:
 *
 *   0  alive   - something ticked inside the threshold.
 *   0  paused  - nothing ticked AND the watched workflow is switched off. Reported as a
 *                `::warning::`, recorded on the ledger, and NOT red. A run that is permanently
 *                red for a reason somebody chose is an alarm nobody reads: 35 of 35 red runs and
 *                68 issue comments in seventeen hours on 2026-09-03 is what that looks like.
 *   1  stale   - nothing ticked and the subject is enrolled. Unchanged; this is the alarm.
 *
 * `paused` exiting 0 is the one place this file trades loudness for legibility, so it is bounded
 * on purpose: it is reachable ONLY when no source ticked (freshness wins) and ONLY when the live
 * API says the subject cannot run (never a repo-side flag), and it says so in a warning on every
 * single run rather than going quiet.
 */
async function main(argv: readonly string[]): Promise<number> {
  const [pathArg, thresholdArg, evidenceArg, subjectStateArg] = argv;
  if (pathArg === undefined) {
    console.error("usage: heartbeat-liveness.ts <runs.json> [staleAfterMinutes] [evidence.json] [subjectState]");
    return 2;
  }

  const staleAfterMinutes = thresholdArg === undefined ? DEFAULT_STALE_AFTER_MINUTES : Number(thresholdArg);
  if (!Number.isFinite(staleAfterMinutes) || staleAfterMinutes <= 0) {
    console.error(`invalid staleAfterMinutes: ${String(thresholdArg)}`);
    return 2;
  }

  const raw = await Bun.file(pathArg).text();
  const runs = extractRuns(JSON.parse(raw));

  let extra: readonly FleetTickObservation[] = [];
  if (evidenceArg !== undefined) {
    // A MALFORMED EVIDENCE FILE MUST FAIL LOUDLY, never degrade to an empty array. Silently
    // dropping it would remove the second source from the verdict at exactly the moment the
    // second source is what is keeping the fleet alive - the watchdog would then report an
    // outage caused by its own parser.
    const parsed: unknown = JSON.parse(await Bun.file(evidenceArg).text());
    if (!Array.isArray(parsed))
      throw new Error(`evidence file ${evidenceArg} must contain a JSON array of { source, at }`);
    extra = parsed as readonly FleetTickObservation[];
  }

  // An UNRECOGNISED state string is not an error here, it is `undefined` - which the assessor
  // treats as enrolled. Failing the run on an unknown state would take the watchdog down over a
  // vocabulary change in someone else's API; assuming "disabled" would silence it over the same
  // change. Falling back to the alarm path is the only one of the three that cannot go quiet, and
  // the fallback is announced below so it is never silent either.
  const subjectState = subjectStateArg === undefined ? undefined : parseSubjectWorkflowState(subjectStateArg);
  if (subjectStateArg !== undefined && subjectState === undefined) {
    console.log(
      `::warning::[heartbeat-liveness] unrecognised workflow state ${JSON.stringify(subjectStateArg)} - treating the subject as ENROLLED, so silence will still raise the alarm`,
    );
  }

  const observations = [...runsToObservations(runs), ...extra];
  const verdict = assessFleetLiveness(observations, new Date(), staleAfterMinutes, subjectState);

  console.log(`[heartbeat-liveness] ${verdict.summary}`);
  console.log(
    `[heartbeat-liveness] observations considered: ${verdict.consideredObservations} (actions runs: ${runs.length}, lane evidence: ${extra.length})`,
  );
  for (const source of verdict.sources) {
    console.log(
      `[heartbeat-liveness]   ${source.fresh ? "FRESH" : "STALE"} ${source.source} ${source.ageMinutes}min ago`,
    );
  }
  if (verdict.state === "paused") {
    // A WARNING ON EVERY RUN, not a one-off. This is the state in which the watchdog is watching
    // something that cannot tick, and a reader who only ever sees green would have no way to tell
    // that apart from a lane that is genuinely healthy. The annotation is the surface that keeps
    // "paused" visible without making the run red for a condition somebody chose.
    console.log(`::warning::[heartbeat-liveness] ${verdict.summary}`);
    console.log(
      "::warning::[heartbeat-liveness] this check is currently watching a switched-off subject; it will go red again on its own the moment that workflow is re-enabled",
    );
    return 0;
  }

  if (!verdict.alive) {
    // `::error::` so the annotation lands on the run summary, not just in the log body.
    console.log(`::error::[heartbeat-liveness] ${verdict.summary}`);
    return 1;
  }
  // A degraded-but-alive fleet must still be LOUD, or a permanently dead Actions lane becomes
  // invisible the moment a second source covers for it - trading one blind spot for another.
  for (const source of verdict.sources.filter((s) => !s.fresh)) {
    console.log(
      `::warning::[heartbeat-liveness] tick source ${source.source} has not ticked in ${source.ageMinutes}min, but the fleet is alive on another source`,
    );
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
