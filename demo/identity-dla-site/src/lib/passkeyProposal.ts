export const ZETA_PROPOSAL_SCHEMA = "zeta.proposal.v1";
export const ZETA_REPOSITORY = "Lucent-Financial-Group/Zeta";
export const ZETA_PROPOSAL_MARKER = "<!-- zeta-proposal-v1 -->";
export const ZETA_PAGES_ORIGIN = "https://lucent-financial-group.github.io";
export const ZETA_PAGES_RP_ID = "lucent-financial-group.github.io";
export const ZETA_OPERATOR_HARNESS_ORIGIN = "https://idspace-dla-6faa9bmi.manus.space";

export type ProposalIntent = {
  schema: typeof ZETA_PROPOSAL_SCHEMA;
  proposalId: string;
  repository: typeof ZETA_REPOSITORY;
  baseRef: "main";
  baseSha: string;
  createdAt: string;
  expiresAt: string;
  nonce: string;
  changeDigest: string;
  authorCredentialId: string;
};

export type SerializedWebAuthnAssertion = {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  userHandle?: string;
};

export type SignedProposal = ProposalIntent & { assertion: SerializedWebAuthnAssertion };

export type PasskeyEnrollment = {
  schema: "zeta.proposal-author.v1";
  repository: typeof ZETA_REPOSITORY;
  credentialId: string;
  clientDataJSON: string;
  attestationObject: string;
  createdAt: string;
};

function bytesToBase64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let index = 0; index < view.length; index++) binary += String.fromCharCode(view[index] ?? 0);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64urlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const output = new Uint8Array(length);
  crypto.getRandomValues(output);
  return output;
}

async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { teachingError?: unknown };
  if (!response.ok) throw new Error(typeof body.teachingError === "string" ? body.teachingError : `Operator service rejected the request (HTTP ${response.status}).`);
  return body;
}

export function isCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

export function canonicalProposalIntent(intent: ProposalIntent): string {
  return JSON.stringify({
    schema: intent.schema,
    proposalId: intent.proposalId,
    repository: intent.repository,
    baseRef: intent.baseRef,
    baseSha: intent.baseSha,
    createdAt: intent.createdAt,
    expiresAt: intent.expiresAt,
    nonce: intent.nonce,
    changeDigest: intent.changeDigest,
    authorCredentialId: intent.authorCredentialId,
  });
}

export async function sha256Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = await sha256Bytes(value);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function createProposalIntent(input: {
  baseSha: string;
  payload: string;
  credentialId: string;
  now?: Date;
  expiresInMs?: number;
}): Promise<ProposalIntent> {
  if (!isCommitSha(input.baseSha)) throw new Error("baseSha must be a 40-character immutable Git commit SHA");
  if (input.payload.trim().length === 0) throw new Error("proposal payload must explain the desired change");
  if (input.credentialId.length === 0) throw new Error("a registered passkey credential ID is required");
  const now = input.now ?? new Date();
  const expiresInMs = input.expiresInMs ?? 5 * 60_000;
  return {
    schema: ZETA_PROPOSAL_SCHEMA,
    proposalId: crypto.randomUUID(),
    repository: ZETA_REPOSITORY,
    baseRef: "main",
    baseSha: input.baseSha.toLowerCase(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiresInMs).toISOString(),
    nonce: bytesToBase64url(randomBytes(32)),
    changeDigest: await sha256Hex(input.payload.trim()),
    authorCredentialId: input.credentialId,
  };
}

export async function enrollProposalPasskey(): Promise<PasskeyEnrollment> {
  if (!window.PublicKeyCredential) throw new Error("This browser does not support passkeys. Use a current browser with WebAuthn enabled.");
  if (window.location.origin !== ZETA_PAGES_ORIGIN) throw new Error("Passkey enrollment is bound to the published GitHub Pages origin.");
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "Zeta proposal signer", id: ZETA_PAGES_RP_ID },
      user: { id: randomBytes(32), name: "zeta-proposal-signer", displayName: "Zeta proposal signer" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -8 }],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      attestation: "none",
      timeout: 60_000,
    },
  });
  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAttestationResponse)) throw new Error("No passkey enrollment response was returned. Confirm the browser prompt.");
  return {
    schema: "zeta.proposal-author.v1",
    repository: ZETA_REPOSITORY,
    credentialId: bytesToBase64url(credential.rawId),
    clientDataJSON: bytesToBase64url(credential.response.clientDataJSON),
    attestationObject: bytesToBase64url(credential.response.attestationObject),
    createdAt: new Date().toISOString(),
  };
}

export async function signProposal(intent: ProposalIntent): Promise<SignedProposal> {
  if (window.location.origin !== ZETA_PAGES_ORIGIN) throw new Error("Passkey signing is bound to the published GitHub Pages origin.");
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: await sha256Bytes(canonicalProposalIntent(intent)),
      allowCredentials: [{ type: "public-key", id: base64urlToBytes(intent.authorCredentialId) }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAssertionResponse)) throw new Error("No passkey assertion was returned. Confirm the browser prompt.");
  const userHandle = credential.response.userHandle ? bytesToBase64url(credential.response.userHandle) : undefined;
  return {
    ...intent,
    assertion: {
      credentialId: bytesToBase64url(credential.rawId),
      authenticatorData: bytesToBase64url(credential.response.authenticatorData),
      clientDataJSON: bytesToBase64url(credential.response.clientDataJSON),
      signature: bytesToBase64url(credential.response.signature),
      ...(userHandle ? { userHandle } : {}),
    },
  };
}

export async function authorizeOperatorDevice(credentialId: string): Promise<{ capability: string; credentialId: string; expiresAt: string }> {
  if (window.location.origin !== ZETA_PAGES_ORIGIN) throw new Error("Device authorization is bound to the published GitHub Pages origin.");
  const challenge = await jsonResponse<{ ok: true; challenge: string; challengeToken: string }>(
    await fetch(`${ZETA_OPERATOR_HARNESS_ORIGIN}/api/github-app/operator/challenge`, { headers: { Accept: "application/json" } }),
  );
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: base64urlToBytes(challenge.challenge),
      allowCredentials: [{ type: "public-key", id: base64urlToBytes(credentialId) }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAssertionResponse)) throw new Error("No device authorization assertion was returned. Confirm the passkey prompt.");
  const assertion = {
    credentialId: bytesToBase64url(credential.rawId),
    authenticatorData: bytesToBase64url(credential.response.authenticatorData),
    clientDataJSON: bytesToBase64url(credential.response.clientDataJSON),
    signature: bytesToBase64url(credential.response.signature),
  };
  return jsonResponse<{ ok: true; capability: string; credentialId: string; expiresAt: string }>(
    await fetch(`${ZETA_OPERATOR_HARNESS_ORIGIN}/api/github-app/operator/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken: challenge.challengeToken, assertion }),
    }),
  );
}

export async function submitAutomaticProposal(input: { capability: string; proposalId: string; baseSha: string; payload: string }): Promise<{ proposalId: string; message: string }> {
  return jsonResponse<{ ok: true; proposalId: string; message: string }>(
    await fetch(`${ZETA_OPERATOR_HARNESS_ORIGIN}/api/github-app/operator/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.capability}` },
      body: JSON.stringify({ proposalId: input.proposalId, baseSha: input.baseSha, payload: input.payload }),
    }),
  );
}

export function proposalIssueBody(payload: string, proposal: SignedProposal): string {
  return `${ZETA_PROPOSAL_MARKER}\n\n## Requested change\n\n${payload.trim()}\n\n## Signed proposal envelope\n\n\`\`\`json\n${JSON.stringify(proposal, null, 2)}\n\`\`\`\n`;
}

export function githubNewIssueUrl(title: string, body: string): string {
  const query = new URLSearchParams({ title, body });
  return `https://github.com/${ZETA_REPOSITORY}/issues/new?${query.toString()}`;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
