#!/usr/bin/env bash
# k3s-agent-tls-self-heal.sh — delete ZERO-LENGTH files under the k3s agent
# certificate/kubeconfig directory before k3s starts, so a truncated write
# (an unclean stop mid-first-boot: this harness's own VM kill, or on real
# hardware a power cut) does not wedge k3s's own cert bootstrap forever.
#
# WP25 (081M38G8NGC087G0R001GEGEDK). ROOT CAUSE, MEASURED (run 35927439681,
# workflow build-ai-cluster-iso.yml, step "WP11 — installed-disk first-boot
# k3s verify") and CITED (full citation in the sibling
# k3s-agent-tls-self-heal.nix, which wires this script as an ExecStartPre on
# systemd.services.k3s): rancher/dynamiclistener's cert.LoadOrGenerateKeyFile
# (github.com/rancher/dynamiclistener/blob/master/cert/io.go) only
# regenerates a key when `os.ReadFile` returns `os.IsNotExist(err) == true`.
# A file that EXISTS with 0 bytes reads with `err == nil`, so the function
# takes its "real read error" branch instead of the "regenerate" branch --
# formatting the nil `err` as the literal string "<nil>", which is the exact
# text k3s printed on the box this fixes: "error loading key from
# .../serving-kubelet.key: <nil>", retried every ~8s, for 70+ minutes and
# counting. Removing the zero-length file turns the NEXT read into a genuine
# IsNotExist, which the same function already handles by generating a fresh
# one -- no k3s patch, just removing the state that trips its own
# conditional.
#
# SCOPE, STRICT: only files STRICTLY UNDER the agent directory
# (ZETA_K3S_AGENT_DIR, default /var/lib/rancher/k3s/agent) are ever
# considered, and only files whose size is EXACTLY ZERO are ever removed. A
# non-empty file -- however suspicious its contents -- is never touched: this
# script has no way to tell "corrupt but non-empty" from "valid", and
# guessing would be a stronger and less justified claim than the
# zero-length case, which is unambiguous (a 0-byte key or certificate is
# never valid, by construction, so removing it can never discard a state
# that was actually usable).
#
# WHY /var/lib/rancher/k3s/server/tls AND .../server/cred ARE DELIBERATELY
# OUT OF SCOPE (not merely untouched by accident -- see
# k3s-agent-tls-self-heal.nix for the full argument): everything under the
# agent directory is a per-node LEAF certificate or kubeconfig the control
# plane re-issues to a rejoining agent on request. server/tls holds this
# cluster's CA material and server/cred holds its encryption config and
# shared secrets -- regenerating either changes what the whole cluster
# trusts or how its stored data is encrypted, which is a strictly worse
# outcome than the hang this script fixes. The datastore (server/db) is
# never read by this script at all -- it is outside ZETA_K3S_AGENT_DIR by
# construction.
#
# THIS SCRIPT IS A STANDALONE FILE, not a Nix string, so that a test can
# EXECUTE it rather than only read it --
# `src/Core.TypeScript/hygiene/k3s-agent-tls-self-heal.test.ts` runs it over
# fixture directories and asserts exactly which files disappear. Same
# discipline as `k3s-datastore-preflight.sh`.
#
# NEVER FAILS THE UNIT: k3s-agent-tls-self-heal.nix wires this as an
# ExecStartPre on systemd.services.k3s, and a self-heal step must never
# itself become a new way for k3s to fail to start. So this script always
# exits 0, including when the directory does not exist yet (a node that has
# never run k3s before) or when the refusal guard below trips.

set -u

AGENT_DIR="${ZETA_K3S_AGENT_DIR:-/var/lib/rancher/k3s/agent}"
SERIAL_DEVICE="${ZETA_SERIAL_DEVICE:-/dev/ttyS0}"

say() {
  echo "$1"
  # Serial, when there is one. Never fatal if there is not.
  if [ -w "$SERIAL_DEVICE" ]; then
    echo "$1" > "$SERIAL_DEVICE" 2>/dev/null || true
  fi
}

# Independent guard, on top of the caller only ever pointing this at the
# agent directory: refuse to touch anything under a "server" path segment
# (the datastore and the CA material both live there) whatever
# ZETA_K3S_AGENT_DIR is set to. A misconfiguration here must fail SAFE (do
# nothing) rather than silently widen this script's blast radius.
case "$AGENT_DIR" in
  */server | */server/*)
    say "[zeta-k3s-agent-tls-self-heal]   refusing: ZETA_K3S_AGENT_DIR ($AGENT_DIR) contains a 'server' path segment; this script only ever operates on the agent directory. Doing nothing."
    exit 0
    ;;
esac

if [ ! -d "$AGENT_DIR" ]; then
  say "[zeta-k3s-agent-tls-self-heal]   $AGENT_DIR does not exist yet; nothing to heal."
  exit 0
fi

removed=0
while IFS= read -r -d '' f; do
  say "[zeta-k3s-agent-tls-self-heal]   removing zero-length file: $f"
  rm -f -- "$f"
  removed=$((removed + 1))
done < <(find "$AGENT_DIR" -type f -size 0 -print0 2>/dev/null)

if [ "$removed" -eq 0 ]; then
  say "[zeta-k3s-agent-tls-self-heal]   clear: no zero-length files under $AGENT_DIR"
else
  say "[zeta-k3s-agent-tls-self-heal]   removed $removed zero-length file(s) under $AGENT_DIR; k3s will regenerate them"
fi

exit 0
