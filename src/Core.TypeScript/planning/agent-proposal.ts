import { createHash } from "node:crypto";
import { patchPaths, type GatedCommitRejection } from "./proposal-gated-commit";

export const AGENT_PROPOSAL_REPOSITORY = "Lucent-Financial-Group/Zeta" as const;
export const AGENT_PROPOSAL_BASE_REF = "main" as const;

export interface AgentProposalIntent {
  readonly schema: "zeta.agent-proposal.v1";
  readonly proposalId: string;
  readonly repository: typeof AGENT_PROPOSAL_REPOSITORY;
  readonly baseRef: typeof AGENT_PROPOSAL_BASE_REF;
  readonly baseSha: string;
  readonly workflowRef: string;
  readonly patchDigest: string;
}

export interface AgentProposalPlan {
  readonly ok: true;
  readonly branch: string;
  readonly commitMessage: string;
  readonly paths: readonly string[];
}

export type AgentProposalRejection = GatedCommitRejection | {
  readonly ok: false;
  readonly code: "agent-schema" | "agent-source" | "agent-id" | "agent-digest";
  readonly message: string;
  readonly retraction: { readonly weight: -1; readonly belief: string };
  readonly generator: string;
};

export type AgentProposalPlanningResult = AgentProposalPlan | AgentProposalRejection;

function reject(
  code: "agent-schema" | "agent-source" | "agent-id" | "agent-digest",
  message: string,
  belief: string,
  generator: string,
): AgentProposalRejection {
  return { ok: false, code, message, retraction: { weight: -1, belief }, generator };
}

function digest(payload: string): string {
  return createHash("sha256").update(payload.trim()).digest("hex");
}

function validProposalId(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/u.test(value);
}

function isRejection(value: readonly string[] | GatedCommitRejection): value is GatedCommitRejection {
  return !Array.isArray(value);
}

/**
 * Plans a bounded agent-originated change. The workflow source is the authority:
 * only code already running from protected main may use the ephemeral Action token.
 * It can create a review branch, never write protected main, workflows, or author keys.
 */
export function planAgentProposal(input: {
  readonly intent: AgentProposalIntent;
  readonly payload: string;
  readonly currentMainSha: string;
}): AgentProposalPlanningResult {
  const { intent } = input;
  if (intent.schema !== "zeta.agent-proposal.v1" || intent.repository !== AGENT_PROPOSAL_REPOSITORY || intent.baseRef !== AGENT_PROPOSAL_BASE_REF) {
    return reject("agent-schema", "teaching error: agent proposal does not bind the canonical Zeta protected-main contract; generator: createAgentProposalIntent", "agent-proposal-contract", "createAgentProposalIntent");
  }
  if (!validProposalId(intent.proposalId)) {
    return reject("agent-id", "teaching error: agent proposal ID is not a bounded lower-case branch component; generator: createAgentProposalIntent", "agent-proposal-id", "createAgentProposalIntent");
  }
  if (!intent.workflowRef.endsWith("@refs/heads/main")) {
    return reject("agent-source", "teaching error: agent proposal was not emitted by a protected-main workflow revision; generator: invoke the committed agent proposal adapter from main", "agent-proposal-source", "trustedMainWorkflow");
  }
  if (intent.baseSha.toLowerCase() !== input.currentMainSha.toLowerCase()) {
    return {
      ok: false,
      code: "stale-base",
      message: "teaching error: protected main advanced before the agent proposal could stage; generator: regenerate the patch against current main",
      retraction: { weight: -1, belief: "agent-proposal-stale-base" },
      generator: "bindCurrentMainAndGeneratePatch",
    };
  }
  // THIS CHECK IS CORRECT AND, AS DEPLOYED TODAY, CANNOT FIRE. Recorded here rather than in a
  // note nobody reads, because the next person to audit this chain will otherwise count it as
  // protection that is present.
  //
  // Measured 2026-08-17: the ONLY production caller is `agent-proposal-runner.ts`, and it builds
  // both sides of this comparison out of the same local variable --
  // `patchDigest: sha256(payload.trim())` in the intent, `payload` as the payload. The comparison
  // is therefore `sha256(x.trim()) !== sha256(x.trim())`, false by construction. The workflow
  // declares three inputs (`agent_proposal_id`, `agent_base_sha`, `agent_patch_b64`) and no
  // digest, so there is no channel by which an independently-declared digest could arrive.
  //
  // The unit test at agent-proposal.test.ts (`${PATCH}# injected`) is NOT vacuous -- it supplies
  // an intent digest taken from the un-injected patch, which is exactly the tamper this rejects.
  // The function has a real falsifier. What is missing is a caller that gives it two independent
  // inputs to compare.
  //
  // WHAT IT WOULD BUY, stated honestly, because the answer is narrower than "integrity": whoever
  // can dispatch this workflow can already choose the patch bytes, so this is not a defence
  // against the dispatcher. Its value is the link between the bytes the operator APPROVED on the
  // Pages device and the bytes that get applied here -- the "approved, not run" property the
  // gated-review design exists to provide. Today, if the device approves patch P and the delivery
  // path presents P', nothing in this file notices.
  //
  // Closing it is a producer-side change (the Pages device would emit the digest it signed as a
  // fourth workflow input) and so is deliberately NOT made here: adding a required input would
  // break the existing three-input producer on the next dispatch. Flagged for Aaron 2026-08-17.
  if (intent.patchDigest !== digest(input.payload)) {
    return reject("agent-digest", "teaching error: agent patch bytes differ from the declared digest; generator: re-hash the exact unified patch before staging", "agent-proposal-digest", "createAgentProposalIntent");
  }
  const paths = patchPaths(input.payload);
  if (isRejection(paths)) return paths;
  return {
    ok: true,
    branch: `agent-proposal/${intent.proposalId}`,
    commitMessage: `agent-proposal: ${intent.proposalId}\n\nworkflow: ${intent.workflowRef}\npatch-digest: ${intent.patchDigest}`,
    paths,
  };
}
