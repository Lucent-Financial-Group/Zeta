import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  loadProposalAuthorRegistry,
  planGatedCommit,
  planOperatorGatedCommit,
  type GatedCommitRejection,
  type OperatorProposalCarrier,
} from "./proposal-gated-commit";

type GitHubIssueEvent = {
  readonly issue?: { readonly number?: unknown; readonly body?: unknown; readonly html_url?: unknown };
};

type LegacyIssueSource = { readonly kind: "issue"; readonly body: string; readonly number: number; readonly url: string };
type OperatorSource = { readonly kind: "operator"; readonly carrier: OperatorProposalCarrier; readonly url: string };
type ProposalSource = LegacyIssueSource | OperatorSource;

export type HandoffExec = (command: string, args: readonly string[], options: { readonly env: NodeJS.ProcessEnv; readonly stdio: "pipe" }) => void;

export function createGatedReviewPullRequest(input: {
  readonly token: string;
  readonly repository: string;
  readonly branch: string;
  readonly proposalId: string;
  readonly issueNumber?: number;
}, execute: HandoffExec = (command, args, options) => {
  execFileSync(command, [...args], options);
}): void {
  if (input.token.length === 0) throw new Error("teaching error: a separate pull-request-scoped credential is required to request an independently gated review; generator: configure ZETA_PR_ARCHIVE_TOKEN with Pull requests: write");
  try {
    const source = input.issueNumber === undefined ? "an authorized GitHub Pages device" : `issue #${input.issueNumber}`;
    execute("gh", [
      "pr", "create",
      "--repo", input.repository,
      "--base", "main",
      "--head", input.branch,
      "--title", `proposal: ${input.proposalId}`,
      "--body", `Proposal from ${source}. The branch was created by the bounded verifier; required gates must pass before any merge.`,
    ], { env: { ...process.env, GH_TOKEN: input.token }, stdio: "pipe" });
  } catch {
    throw new Error("teaching error: GitHub refused the review PR handoff; generator: verify the separate token has Pull requests: write and retry the unchanged branch");
  }
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], { encoding: "utf8" }).trim();
}

function writeOutput(name: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  writeFileSync(outputPath, `${name}=${value.replaceAll("\n", " ")}\n`, { encoding: "utf8", flag: "a" });
}

function publishTeachingError(error: GatedCommitRejection): never {
  const message = `${error.message} [${error.code}; retract ${error.retraction.weight} ${error.retraction.belief}; generator ${error.generator}]`;
  writeOutput("teaching_error", message);
  throw new Error(message);
}

function readIssueSource(): LegacyIssueSource {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("teaching error: GITHUB_EVENT_PATH is required; generator: invoke from the issue proposal workflow");
  const event = JSON.parse(readFileSync(eventPath, "utf8")) as GitHubIssueEvent;
  const body = event.issue?.body;
  const number = event.issue?.number;
  const url = event.issue?.html_url;
  if (typeof body !== "string" || typeof number !== "number" || typeof url !== "string") {
    throw new Error("teaching error: workflow event is not a GitHub issue with a proposal body; generator: open a legacy proposal issue or use the authorized Pages operator path");
  }
  return { kind: "issue", body, number, url };
}

function readProposalSource(): ProposalSource {
  const encoded = process.env.ZETA_OPERATOR_PROPOSAL_B64;
  if (!encoded) return readIssueSource();
  try {
    return {
      kind: "operator",
      carrier: JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OperatorProposalCarrier,
      url: "https://lucent-financial-group.github.io/Zeta/demo/identity-dla-site/#operator-proposal",
    };
  } catch {
    throw new Error("teaching error: automatic proposal carrier is not base64url JSON; generator: queue a fresh bounded proposal from the authorized Pages device");
  }
}

function branchExists(branch: string): boolean {
  try {
    git(["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

function receiptPath(proposalId: string): string {
  return `docs/observe-events/proposal-receipts/${proposalId}.json`;
}

function proposalIdWasConsumed(proposalId: string): boolean {
  try {
    git(["cat-file", "-e", `origin/main:${receiptPath(proposalId)}`]);
    return true;
  } catch {
    return false;
  }
}

async function applyPlan(): Promise<void> {
  const source = readProposalSource();
  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  const registry = loadProposalAuthorRegistry(resolve(repoRoot, "docs/security/proposal-author-registry.json"));
  const currentMainSha = git(["rev-parse", "origin/main"]);
  const preliminary = source.kind === "operator"
    ? planOperatorGatedCommit({ carrier: source.carrier, currentMainSha, now: new Date() })
    : planGatedCommit({ issueBody: source.body, currentMainSha, registry, now: new Date() });
  if (!preliminary.ok) publishTeachingError(preliminary);
  if (proposalIdWasConsumed(preliminary.proposal.proposalId) || branchExists(preliminary.branch)) {
    publishTeachingError({
      ok: false,
      code: "stale-base",
      message: "teaching error: this proposal already has a committed receipt or a pending review branch; generator: create a new proposal only after materially changing the patch",
      retraction: { weight: -1, belief: "proposal-duplicate-delivery" },
      generator: "createProposalIntent",
    });
  }
  git(["switch", "--detach", "origin/main"]);
  git(["switch", "-c", preliminary.branch]);
  const patchPath = resolve(repoRoot, ".git", "zeta-proposal.patch");
  writeFileSync(patchPath, preliminary.payload, "utf8");
  git(["apply", "--check", "--whitespace=error", patchPath]);
  git(["apply", "--whitespace=error", patchPath]);
  const receipt = receiptPath(preliminary.proposal.proposalId);
  const receiptAbsolutePath = resolve(repoRoot, receipt);
  mkdirSync(dirname(receiptAbsolutePath), { recursive: true });
  try {
    writeFileSync(receiptAbsolutePath, `${JSON.stringify({
      schema: "zeta.proposal-receipt.v1",
      proposalId: preliminary.proposal.proposalId,
      issue: source.url,
      baseSha: preliminary.proposal.baseSha,
      changeDigest: preliminary.proposal.changeDigest,
      credentialId: preliminary.proposal.authorCredentialId,
      receivedAt: new Date().toISOString(),
    }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch {
    throw new Error("teaching error: proposal receipt path already exists; generator: create a fresh proposal envelope");
  }
  git(["add", "--", "."]);
  git(["commit", "-m", preliminary.commitMessage]);
  git(["push", "origin", `HEAD:refs/heads/${preliminary.branch}`]);
  try {
    await createGatedReviewPullRequest({
      token: process.env.ZETA_PR_ARCHIVE_TOKEN ?? "",
      repository: process.env.GITHUB_REPOSITORY ?? "Lucent-Financial-Group/Zeta",
      branch: preliminary.branch,
      proposalId: preliminary.proposal.proposalId,
      ...(source.kind === "issue" ? { issueNumber: source.number } : {}),
    });
  } catch (error) {
    git(["push", "origin", "--delete", preliminary.branch]);
    throw error;
  }
  writeOutput("branch", preliminary.branch);
  if (source.kind === "issue") writeOutput("issue_number", String(source.number));
  writeOutput("proposal_id", preliminary.proposal.proposalId);
}

if (import.meta.main) await applyPlan();
