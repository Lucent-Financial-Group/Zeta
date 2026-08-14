import { useEffect, useState } from "react";
import {
  authorizeOperatorDevice,
  createProposalIntent,
  downloadJson,
  enrollProposalPasskey,
  isCommitSha,
  submitAutomaticProposal,
  ZETA_REPOSITORY,
  type PasskeyEnrollment,
} from "../lib/passkeyProposal";

const CREDENTIAL_STORAGE_KEY = "zeta-proposal-passkey-credential-id";

type PanelState = "idle" | "loading-base" | "enrolling" | "authorizing" | "ready" | "submitting" | "submitted" | "error";

async function fetchMainSha(): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${ZETA_REPOSITORY}/commits/main`, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub did not return main's commit SHA (HTTP ${response.status}).`);
  const json = await response.json() as { sha?: unknown };
  if (typeof json.sha !== "string" || !isCommitSha(json.sha)) throw new Error("GitHub returned an invalid main commit SHA.");
  return json.sha;
}

export default function PasskeyProposalPanel() {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<PanelState>("idle");
  const [message, setMessage] = useState("No repository credential is stored or requested by this page.");
  const [baseSha, setBaseSha] = useState("");
  const [payload, setPayload] = useState("");
  const [credentialId, setCredentialId] = useState(() => localStorage.getItem(CREDENTIAL_STORAGE_KEY) ?? "");
  const [enrollment, setEnrollment] = useState<PasskeyEnrollment | null>(null);
  const [capability, setCapability] = useState<string | null>(null);
  const [capabilityExpiresAt, setCapabilityExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (expanded && !isCommitSha(baseSha)) void loadBaseSha();
  }, [expanded]);

  const loadBaseSha = async () => {
    setState("loading-base");
    try {
      const sha = await fetchMainSha();
      setBaseSha(sha);
      setState("ready");
      setMessage(`Bound to immutable main commit ${sha.slice(0, 12)}. The executor rejects stale bases.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not retrieve the current main SHA.");
    }
  };

  const enroll = async () => {
    setState("enrolling");
    try {
      const registered = await enrollProposalPasskey();
      setEnrollment(registered);
      setCredentialId(registered.credentialId);
      localStorage.setItem(CREDENTIAL_STORAGE_KEY, registered.credentialId);
      setState("ready");
      setMessage("Passkey created. Export its public enrollment record for protected review; enrollment alone creates no repository authority.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Passkey enrollment did not complete.");
    }
  };

  const authorizeDevice = async () => {
    setState("authorizing");
    try {
      const result = await authorizeOperatorDevice(credentialId);
      setCapability(result.capability);
      setCapabilityExpiresAt(result.expiresAt);
      setState("ready");
      setMessage(`This device is authorized until ${new Date(result.expiresAt).toLocaleTimeString()}. Browser-local agents can now queue bounded patches automatically.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "This device was not authorized.");
    }
  };

  const submitProposal = async () => {
    if (!capability) return;
    setState("submitting");
    try {
      const intent = await createProposalIntent({ baseSha, payload, credentialId });
      const result = await submitAutomaticProposal({ capability, proposalId: intent.proposalId, baseSha: intent.baseSha, payload });
      setState("submitted");
      setMessage(`${result.message} Proposal ${result.proposalId.slice(0, 8)} now awaits the verifier and required gate.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The automatic proposal submission failed.");
    }
  };

  const canSubmit = Boolean(capability) && isCommitSha(baseSha) && payload.trim().length > 0;
  const statusColor = state === "error" ? "#fca5a5" : state === "submitted" ? "#6ee7b7" : "#94a3b8";

  return (
    <div style={{ margin: "0.6rem 0", padding: "0.55rem 0.7rem", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.28)", borderRadius: 5, fontFamily: "monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <div>
          <div style={{ color: "#93c5fd", fontSize: "0.63rem", fontWeight: 700 }}>Agent proposals: automatic · human authority: one-time device passkey</div>
          <div style={{ color: "#64748b", fontSize: "0.47rem", marginTop: "0.08rem" }}>Local AI/BNN proposes; the separate verifier and Action create gated review branches. This page never holds a repository key.</div>
        </div>
        <button onClick={() => setExpanded(value => !value)} style={{ background: "rgba(37,99,235,0.14)", border: "1px solid #1d4ed8", borderRadius: 3, color: "#bfdbfe", fontSize: "0.5rem", cursor: "pointer", padding: "0.12rem 0.35rem" }}>{expanded ? "▲ hide agent controls" : "▼ authorize & queue"}</button>
      </div>
      {expanded && (
        <div style={{ marginTop: "0.45rem", fontSize: "0.53rem", color: "#cbd5e1", lineHeight: 1.5 }}>
          <div style={{ padding: "0.3rem 0.4rem", background: "rgba(16,185,129,0.06)", borderLeft: "2px solid #10b981", marginBottom: "0.35rem", color: "#a7f3d0" }}>
            <strong>Routine path: authorize once, then automate.</strong> A device passkey starts a short PWA capability. Local agents can submit unified patches without opening GitHub issues, branches, or token forms. The executor can only stage a review branch; required checks retain merge authority.
          </div>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
            <button onClick={loadBaseSha} disabled={state === "loading-base"} style={{ background: "rgba(59,130,246,0.12)", border: "1px solid #2563eb", borderRadius: 3, color: "#bfdbfe", fontSize: "0.5rem", cursor: "pointer", padding: "0.12rem 0.35rem" }}>{state === "loading-base" ? "binding protected main…" : "refresh bound main"}</button>
            <button onClick={enroll} disabled={state === "enrolling" || credentialId.length > 0} style={{ background: "rgba(139,92,246,0.12)", border: "1px solid #7c3aed", borderRadius: 3, color: credentialId.length > 0 ? "#64748b" : "#ddd6fe", fontSize: "0.5rem", cursor: credentialId.length > 0 ? "not-allowed" : "pointer", padding: "0.12rem 0.35rem" }}>{state === "enrolling" ? "device passkey prompt…" : credentialId.length > 0 ? "device passkey ready" : "first time: enroll device passkey"}</button>
            {enrollment && <button onClick={() => downloadJson("zeta-proposal-author.json", enrollment)} style={{ background: "rgba(16,185,129,0.12)", border: "1px solid #047857", borderRadius: 3, color: "#a7f3d0", fontSize: "0.5rem", cursor: "pointer", padding: "0.12rem 0.35rem" }}>export public enrollment for review</button>}
            <button onClick={authorizeDevice} disabled={credentialId.length === 0 || state === "authorizing"} style={{ background: credentialId.length === 0 ? "rgba(71,85,105,0.16)" : "rgba(16,185,129,0.12)", border: `1px solid ${credentialId.length === 0 ? "#475569" : "#059669"}`, borderRadius: 3, color: credentialId.length === 0 ? "#64748b" : "#a7f3d0", fontSize: "0.5rem", cursor: credentialId.length === 0 ? "not-allowed" : "pointer", padding: "0.12rem 0.35rem" }}>{state === "authorizing" ? "device passkey prompt…" : capability ? "device authorized" : "authorize this device"}</button>
          </div>
          <label style={{ display: "block", color: "#64748b", marginBottom: "0.1rem" }}>Bound main SHA — loaded automatically; refresh after editing a proposal</label>
          <input value={baseSha} onChange={event => setBaseSha(event.target.value.trim())} placeholder="Use ‘refresh bound main’" spellCheck={false} style={{ display: "block", width: "100%", boxSizing: "border-box", background: "#0f172a", border: `1px solid ${baseSha.length === 0 || isCommitSha(baseSha) ? "#334155" : "#ef4444"}`, color: "#cbd5e1", borderRadius: 3, padding: "0.25rem 0.35rem", fontSize: "0.5rem", fontFamily: "monospace" }} />
          <label style={{ display: "block", color: "#64748b", margin: "0.35rem 0 0.1rem" }}>Local agent output — exact bounded unified Git patch</label>
          <textarea value={payload} onChange={event => setPayload(event.target.value)} placeholder={'diff --git a/docs/example.md b/docs/example.md\n--- a/docs/example.md\n+++ b/docs/example.md\n@@ -1 +1 @@\n-old\n+new'} rows={6} style={{ display: "block", resize: "vertical", width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 3, padding: "0.3rem 0.35rem", fontSize: "0.52rem", fontFamily: "monospace", lineHeight: 1.45 }} />
          <div style={{ marginTop: "0.32rem", display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={submitProposal} disabled={!canSubmit || state === "submitting"} style={{ background: canSubmit ? "rgba(16,185,129,0.15)" : "rgba(71,85,105,0.16)", border: `1px solid ${canSubmit ? "#059669" : "#475569"}`, borderRadius: 3, color: canSubmit ? "#a7f3d0" : "#64748b", fontSize: "0.5rem", cursor: canSubmit ? "pointer" : "not-allowed", padding: "0.14rem 0.4rem" }}>{state === "submitting" ? "queueing automatic proposal…" : "queue bounded proposal"}</button>
          </div>
          <div style={{ color: statusColor, fontSize: "0.48rem", marginTop: "0.32rem" }}>{message}</div>
          <div style={{ color: "#475569", fontSize: "0.44rem", marginTop: "0.25rem" }}>{capabilityExpiresAt ? `Capability expires ${new Date(capabilityExpiresAt).toLocaleTimeString()}. ` : ""}The executor rejects an unrecognized device, expired capability, stale base SHA, oversize or non-unified patch, protected-path edit, replay, or origin/RP-ID mismatch with a corrective teaching error.</div>
        </div>
      )}
    </div>
  );
}
