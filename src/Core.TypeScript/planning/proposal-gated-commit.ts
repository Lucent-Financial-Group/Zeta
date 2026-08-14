import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type SignedProposal,
} from "./proposal-envelope";
import {
  verifySignedProposal,
  type ProposalAuthorRegistry,
  type ProposalTeachingError,
} from "./proposal-verifier";

export const PROPOSAL_ISSUE_MARKER = "<!-- zeta-proposal-v1 -->";
const REQUESTED_CHANGE_HEADING = "## Requested change";
const ENVELOPE_HEADING = "## Signed proposal envelope";
const PROTECTED_PATHS = [".github/workflows/", "docs/security/proposal-author-registry.json"] as const;

export interface ProposalCarrier {
  readonly payload: string;
  readonly proposal: SignedProposal;
}

export interface OperatorProposalCarrier {
  readonly schema: "zeta.operator-proposal.v1";
  readonly proposalId: string;
  readonly repository: "Lucent-Financial-Group/Zeta";
  readonly baseRef: "main";
  readonly baseSha: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly changeDigest: string;
  readonly authorCredentialId: string;
  readonly payload: string;
}

export interface ProposalReference {
  readonly proposalId: string;
  readonly baseSha: string;
  readonly changeDigest: string;
  readonly authorCredentialId: string;
}

export interface GatedCommitPlan {
  readonly ok: true;
  readonly branch: string;
  readonly commitMessage: string;
  readonly proposal: ProposalReference;
  readonly payload: string;
}

export type GatedCommitRejection = ProposalTeachingError | {
  readonly ok: false;
  readonly code: "carrier" | "patch" | "stale-base";
  readonly message: string;
  readonly retraction: { readonly weight: -1; readonly belief: string };
  readonly generator: string;
};

export type GatedCommitPlanningResult = GatedCommitPlan | GatedCommitRejection;

function reject(code: "carrier" | "patch" | "stale-base", message: string, belief: string, generator: string): GatedCommitRejection {
  return { ok: false, code, message, retraction: { weight: -1, belief }, generator };
}

function isGatedCommitRejection(value: readonly string[] | GatedCommitRejection): value is GatedCommitRejection {
  return !Array.isArray(value);
}

export function parseProposalIssueBody(body: string): ProposalCarrier | GatedCommitRejection {
  if (!body.startsWith(PROPOSAL_ISSUE_MARKER)) {
    return reject("carrier", "teaching error: issue does not begin with the zeta proposal marker; generator: submit a passkey-signed proposal from the Pages interface", "proposal-carrier", "proposalIssueBody");
  }
  const requestedStart = body.indexOf(REQUESTED_CHANGE_HEADING);
  const envelopeStart = body.indexOf(ENVELOPE_HEADING);
  if (requestedStart < 0 || envelopeStart < 0 || envelopeStart <= requestedStart) {
    return reject("carrier", "teaching error: proposal carrier lacks ordered requested-change and signed-envelope sections; generator: recreate the issue body from the PWA signer", "proposal-carrier-shape", "proposalIssueBody");
  }
  const payload = body.slice(requestedStart + REQUESTED_CHANGE_HEADING.length, envelopeStart).trim();
  const envelopeBody = body.slice(envelopeStart + ENVELOPE_HEADING.length);
  const fenced = envelopeBody.match(/```json\s*\n([\s\S]*?)\n```/u);
  if (payload.length === 0 || !fenced?.[1]) {
    return reject("carrier", "teaching error: proposal carrier has no patch or JSON envelope; generator: sign a non-empty unified Git patch", "proposal-carrier-content", "proposalIssueBody");
  }
  try {
    const proposal = JSON.parse(fenced[1]) as SignedProposal;
    return { payload, proposal };
  } catch {
    return reject("carrier", "teaching error: signed proposal envelope is not JSON; generator: submit the unmodified PWA-generated carrier", "proposal-carrier-json", "proposalIssueBody");
  }
}

export function patchPaths(payload: string): readonly string[] | GatedCommitRejection {
  if (!payload.includes("diff --git ")) {
    return reject("patch", "teaching error: requested change must be a unified Git patch; generator: produce a reviewable diff rather than free-form instructions", "proposal-patch-shape", "git diff --binary");
  }
  const paths: string[] = [];
  const matcher = /^diff --git a\/(.+) b\/(.+)$/gmu;
  for (const match of payload.matchAll(matcher)) {
    const before = match[1];
    const after = match[2];
    if (!before || !after || before !== after || before.includes("..") || before.startsWith("/")) {
      return reject("patch", "teaching error: patch path is ambiguous or escapes the repository; generator: regenerate a normal Git diff from the repository root", "proposal-patch-path", "git diff --binary");
    }
    if (PROTECTED_PATHS.some(protectedPath => before === protectedPath || before.startsWith(protectedPath))) {
      return reject("patch", "teaching error: passkey proposals cannot modify workflow authority or the author registry; generator: route this privileged change through an independently reviewed maintainer PR", "proposal-protected-path", "maintainer-reviewed-pr");
    }
    paths.push(before);
  }
  return paths.length > 0
    ? paths
    : reject("patch", "teaching error: patch has no recognized Git paths; generator: produce a unified Git diff", "proposal-patch-empty", "git diff --binary");
}

export function planGatedCommit(input: {
  readonly issueBody: string;
  readonly currentMainSha: string;
  readonly registry: ProposalAuthorRegistry;
  readonly consumedProposalIds?: ReadonlySet<string>;
  readonly consumedNonces?: ReadonlySet<string>;
  readonly now?: Date;
}): GatedCommitPlanningResult {
  const carrier = parseProposalIssueBody(input.issueBody);
  if (!("payload" in carrier)) return carrier;
  const verification = verifySignedProposal({
    proposal: carrier.proposal,
    payload: carrier.payload,
    registry: input.registry,
    ...(input.consumedProposalIds ? { consumedProposalIds: input.consumedProposalIds } : {}),
    ...(input.consumedNonces ? { consumedNonces: input.consumedNonces } : {}),
    ...(input.now ? { now: input.now } : {}),
  });
  if (!verification.ok) return verification;
  if (verification.proposal.baseSha !== input.currentMainSha.toLowerCase()) {
    return reject("stale-base", "teaching error: protected main advanced after the proposal was signed; generator: rebase the intended patch and sign a fresh envelope", "proposal-stale-base", "bindCurrentMainAndSign");
  }
  const paths = patchPaths(carrier.payload);
  if (isGatedCommitRejection(paths)) return paths;
  return {
    ok: true,
    branch: `proposal/${verification.proposal.proposalId}`,
    commitMessage: `proposal: ${verification.proposal.proposalId}\n\npasskey-credential: ${verification.author.credentialId}\nchange-digest: ${verification.proposal.changeDigest}`,
    proposal: verification.proposal,
    payload: carrier.payload,
  };
}

function digest(payload: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(payload);
  return hasher.digest("hex");
}

/** The server-bound Pages operator has already checked the passkey capability.
 * The Action still independently validates repository, immutable base, digest,
 * patch paths, and expiration before writing a review branch. */
export function planOperatorGatedCommit(input: {
  readonly carrier: OperatorProposalCarrier;
  readonly currentMainSha: string;
  readonly now?: Date;
}): GatedCommitPlanningResult {
  const carrier = input.carrier;
  if (carrier.schema !== "zeta.operator-proposal.v1" || carrier.repository !== "Lucent-Financial-Group/Zeta" || carrier.baseRef !== "main") {
    return reject("carrier", "teaching error: automatic proposal carrier is not bound to Zeta main; generator: queue a fresh proposal from the authorized Pages device", "operator-carrier-boundary", "queueBoundedProposal");
  }
  if (!/^[0-9a-f-]{36}$/iu.test(carrier.proposalId) || !/^[0-9a-f]{40}$/iu.test(carrier.baseSha) || carrier.authorCredentialId.length === 0) {
    return reject("carrier", "teaching error: automatic proposal carrier lacks an immutable base, UUID, or authorized device identity; generator: refresh the local proposal intent", "operator-carrier-shape", "createProposalIntent");
  }
  const now = input.now ?? new Date();
  const expiresAt = Date.parse(carrier.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    return reject("stale-base", "teaching error: automatic proposal capability expired before staging; generator: authorize the Pages device and queue a fresh proposal", "operator-capability-expired", "authorizeOperatorDevice");
  }
  const payload = carrier.payload.trim();
  if (digest(payload) !== carrier.changeDigest) {
    return reject("carrier", "teaching error: automatic proposal payload does not match its SHA-256 digest; generator: regenerate the local patch before queuing", "operator-payload-digest", "queueBoundedProposal");
  }
  if (carrier.baseSha.toLowerCase() !== input.currentMainSha.toLowerCase()) {
    return reject("stale-base", "teaching error: protected main advanced after automatic proposal binding; generator: refresh main and queue a fresh proposal", "operator-stale-base", "bindCurrentMainAndQueue");
  }
  const paths = patchPaths(payload);
  if (isGatedCommitRejection(paths)) return paths;
  const proposal: ProposalReference = {
    proposalId: carrier.proposalId,
    baseSha: carrier.baseSha.toLowerCase(),
    changeDigest: carrier.changeDigest,
    authorCredentialId: carrier.authorCredentialId,
  };
  return {
    ok: true,
    branch: `proposal/${proposal.proposalId}`,
    commitMessage: `proposal: ${proposal.proposalId}\n\noperator-device: ${proposal.authorCredentialId}\nchange-digest: ${proposal.changeDigest}`,
    proposal,
    payload,
  };
}

export function loadProposalAuthorRegistry(path: string): ProposalAuthorRegistry {
  const parsed = JSON.parse(readFileSync(resolve(path), "utf8")) as ProposalAuthorRegistry;
  return parsed;
}
