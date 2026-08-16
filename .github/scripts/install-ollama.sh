#!/usr/bin/env bash
# Install Ollama from a PINNED, SHA-256-verified release asset.
#
# Replaces `curl -fsSL https://ollama.com/install.sh | sh` on the CI lanes.
# The pin lives in .github/ollama-pin.json — read its `_doc` for the why, the refresh
# procedure, and the ace-shape rationale.
#
# CONTRACT — the part that matters to anyone editing this:
#   exit 0  => `ollama` is on PATH and is the pinned build.
#   exit !0 => NOTHING was installed and the reason was printed as a ::error:: annotation.
#              THERE IS NO FALLBACK — not to the upstream installer, not to an unverified
#              download, not to "whatever apt has". A recovery path that cannot fail is not
#              a check, and that is the exact defect class this change exists to remove.
#   The CALLER decides whether that is fatal. On the heartbeat lane it is NOT: the step is
#   continue-on-error, so a broken pin degrades the tick to model-less rather than stopping
#   the society (.claude/rules.bak/tick-must-never-stop.md).
#
# Deliberately NOT short-circuited on a pre-existing `ollama`: if a runner image ever ships
# one, we still want the pinned build rather than whatever was baked in.

set -euo pipefail

fail() {
  # ::error:: renders in the run UI, not only in scrollback.
  echo "::error title=ollama pin::$*"
  exit 1
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# OLLAMA_PIN_FILE exists so verify-ollama-pin.yml can point this at a DELIBERATELY WRONG pin
# and prove the digest comparison can actually fail. A verifier that only ever exercises the
# happy path cannot distinguish "the check passed" from "the check is not wired up".
PIN_FILE="${OLLAMA_PIN_FILE:-${REPO_ROOT}/.github/ollama-pin.json}"
INSTALL_DIR="${OLLAMA_INSTALL_DIR:-/usr/local}"

[ -f "$PIN_FILE" ] || fail "pin file missing at ${PIN_FILE} — refusing to install anything"
command -v python3 >/dev/null 2>&1 || fail "python3 required to read ${PIN_FILE}"

# ONE source of truth. Two files carrying the same digest is a drift bug waiting to happen,
# so the shell reads the same JSON ace will read, rather than a parallel .env copy.
read -r PIN_VERSION PIN_SHA PIN_URL PIN_ASSET PIN_PLATFORM < <(python3 - "$PIN_FILE" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
e, a = p["entry"], p["artifact"]
ca = e["contentAddress"]
if not ca.startswith("sha256:"):
    sys.exit("contentAddress is not sha256: " + ca)
print(e["version"], ca[len("sha256:"):], a["url"], a["asset"], a["platform"])
PY
) || fail "could not parse ${PIN_FILE}"

# amd64 linux only — that is every runner in this repo. An unexpected platform is a LOUD
# refusal, never a silent "install whatever fits": a pin that quietly does not apply to the
# machine it ran on is the vacuous-check shape again.
HOST="$(uname -s)/$(uname -m)"
[ "$HOST" = "Linux/x86_64" ] || fail "pin targets ${PIN_PLATFORM}; this host is ${HOST}. Add a pin for it rather than falling back."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
TARBALL="${TMP_DIR}/${PIN_ASSET}"

echo "[ollama] pinned ${PIN_VERSION} — ${PIN_ASSET}"
echo "[ollama] sha256 (expected) ${PIN_SHA}"
echo "[ollama] fetching ${PIN_URL}"

# https://ollama.com/download/<asset> 302-redirects to exactly this release origin (verified
# 2026-08-16), so these are the SAME bytes the installer would have fetched — now with a
# version and a digest attached.
#
# --retry covers transient 5xx / resets on a 1.4GB asset. It does NOT weaken anything: every
# retry lands in the same digest comparison below.
curl --fail --show-error --silent --location \
     --retry 3 --retry-delay 5 --retry-all-errors \
     --output "$TARBALL" "$PIN_URL" \
  || fail "download failed: ${PIN_URL}"

ACTUAL="$(sha256sum "$TARBALL" | cut -d' ' -f1)"
if [ "$ACTUAL" != "$PIN_SHA" ]; then
  fail "SHA-256 MISMATCH for ${PIN_ASSET}: expected ${PIN_SHA}, got ${ACTUAL}. The bytes under the tag changed, or they were tampered with in transit. NOT installing. Bump via .github/scripts/refresh-ollama-pin.sh and prove it with verify-ollama-pin.yml."
fi
echo "[ollama] sha256 OK"

command -v zstd >/dev/null 2>&1 || fail "zstd not present; cannot expand ${PIN_ASSET}"

# Same layout the upstream installer produces: bin/ollama + lib/ollama/* under ${INSTALL_DIR}.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || fail "not root and sudo unavailable; cannot install into ${INSTALL_DIR}"
  SUDO="sudo"
fi

$SUDO mkdir -p "$INSTALL_DIR"
zstd -d --stdout "$TARBALL" | $SUDO tar -xf - -C "$INSTALL_DIR" \
  || fail "extraction into ${INSTALL_DIR} failed"

command -v ollama >/dev/null 2>&1 || fail "extracted, but 'ollama' is not on PATH (expected ${INSTALL_DIR}/bin/ollama)"

# WHOLE output, flattened — NOT `head -1`. With no server running, `ollama --version` prints
#     Warning: could not connect to a running Ollama instance
#     Warning: client version is 0.32.13
# so the first line carries no version at all and a head -1 match would reject a perfectly
# good install. Matching the flattened output is robust to either form.
INSTALLED="$(ollama --version 2>&1 | tr '\n' ' ')"
echo "[ollama] installed: ${INSTALLED}"

# The binary must be the build we pinned. Without this the digest check proves only that a
# correct archive was downloaded, not that the thing now on PATH came out of it — an earlier
# ollama already on PATH would shadow ours and the step would still say OK.
case "$INSTALLED" in
  *"$PIN_VERSION"*) : ;;
  *) fail "PATH ollama reports '${INSTALLED}' but the pin is ${PIN_VERSION} — something else is shadowing ${INSTALL_DIR}/bin/ollama" ;;
esac
