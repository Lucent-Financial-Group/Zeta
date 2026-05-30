#!/usr/bin/env bash
#
# tools/setup/common/local-llm.sh — installs the CORE local-LLM primitive:
# a small CPU-only model served by Ollama, account-free. Pins are DECLARATIVE in
# tools/setup/manifests/local-llm. Idempotent (detect-first), and GRACEFUL: a
# registry/network failure WARNS and continues (it must never brick install.sh).
# The primitive's tests skip-if-absent, so a missing model degrades to mock-only
# tests rather than a hard failure (exceptions-as-signals: the model is
# best-effort substrate, the fallback is the safety rail).
#
# Consumers: accelerator move-next selector (choose-your-own-adventure),
# observe.ts auto-classifier, DST test fixtures (temp 0 + fixed seed ⇒ reproducible).
#
# OS split (matches the install-graph convention): macOS installs the ollama
# binary via manifests/brew (the brew step); Linux installs the pinned release
# binary here (mise-style curl-fetch). Both then pull the pinned model.

set -euo pipefail

# shellcheck source=curl-fetch.sh
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/curl-fetch.sh"

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="$REPO_ROOT/tools/setup/manifests/local-llm"

if [ ! -f "$MANIFEST" ]; then
  echo "✓ no local-llm manifest; skipping"
  exit 0
fi

# Read a `key  value` pair from the declarative manifest.
mget() { grep -E "^$1[[:space:]]" "$MANIFEST" | awk '{print $2}' | head -1; }
MODEL="$(mget model)"
HOST="$(mget host)"
: "${HOST:=http://127.0.0.1:11434}"

if [ -z "$MODEL" ]; then
  echo "warn: local-llm manifest has no 'model'; skipping" >&2
  exit 0
fi

# ── 1. ensure the ollama binary (Linux installs pinned release; macOS via brew) ──
if ! command -v ollama >/dev/null 2>&1; then
  case "$(uname -s)" in
    Linux)
      # NixOS: the generic glibc release binary won't run (non-FHS). Install ollama
      # via nix instead — FHS-safe, works in the nixos/nix container AND on real
      # NixOS, and floats with the channel (consistent with the float-ollama
      # decision). This is the install.sh-retrofit path that closes B-0941's test
      # false-green; the declarative real-hardware self-heal layer is
      # services.ollama in configuration.nix (complementary). linux.sh already
      # routes NixOS via /etc/NIXOS; honor the same marker here.
      if [ -f /etc/NIXOS ]; then
        echo "↓ NixOS detected — installing ollama via nix (FHS-safe)..."
        if ! nix --extra-experimental-features 'nix-command flakes' profile install nixpkgs#ollama 2>/dev/null \
           && ! nix-env -iA nixpkgs.ollama 2>/dev/null; then
          echo "warn: nix ollama install failed; skipping local-llm (tests fall back to mock)" >&2; exit 0
        fi
        export PATH="$HOME/.nix-profile/bin:/nix/var/nix/profiles/default/bin:$PATH"
        command -v ollama >/dev/null 2>&1 || { echo "warn: ollama not on PATH after nix install; skipping local-llm" >&2; exit 0; }
      else
      case "$(uname -m)" in
        x86_64 | amd64) oarch=amd64 ;;
        aarch64 | arm64) oarch=arm64 ;;
        *) echo "warn: unsupported arch $(uname -m) for ollama; skipping local-llm" >&2; exit 0 ;;
      esac
      tmp="$(mktemp -d)"
      # FLOATING latest (Aaron 2026-05-30): the ollama *runtime* version does not
      # affect DST reproducibility — the pinned MODEL + temp0 + seed do — so we
      # track latest (less maintenance). GitHub's /releases/latest/download/<asset>
      # auto-redirects to the newest release's asset (no API call, no pin).
      # Asset is .tar.zst (zstd), NOT .tgz — verified against the release API
      # 2026-05-30 (ollama-linux-amd64.tar.zst). The bare ollama-linux-<arch>.tgz
      # name 404s; this was caught by the validation workflow.
      url="https://github.com/ollama/ollama/releases/latest/download/ollama-linux-${oarch}.tar.zst"
      echo "↓ installing ollama (latest, linux-${oarch})..."
      if ! curl_fetch --output "${tmp}/ollama.tar.zst" "$url"; then
        echo "warn: ollama download failed; skipping local-llm (tests fall back to mock)" >&2; exit 0
      fi
      mkdir -p "$HOME/.local"
      # ollama-linux-<arch>.tar.zst extracts bin/ollama + lib/ollama under the
      # prefix. zstd-compressed → tar --zstd (zstd is present on ubuntu runners;
      # GNU tar + bsdtar both support --zstd).
      if ! tar -C "$HOME/.local" --zstd -xf "${tmp}/ollama.tar.zst"; then
        echo "warn: ollama extract failed (zstd?); skipping local-llm (tests fall back to mock)" >&2; exit 0
      fi
      export PATH="$HOME/.local/bin:$PATH"
      fi
      ;;
    Darwin)
      echo "warn: ollama not found on macOS — expected via manifests/brew (brew install ollama)." >&2
      echo "      Skipping model pull; re-run after the brew step installs it." >&2
      exit 0
      ;;
    *)
      echo "warn: unknown OS '$(uname -s)' for ollama install; skipping local-llm" >&2; exit 0 ;;
  esac
fi

# ── 2. ensure the daemon is reachable (start in background if needed) ──
if ! curl -fsS "${HOST}/api/version" >/dev/null 2>&1; then
  echo "↓ starting ollama serve (background)..."
  (ollama serve >/dev/null 2>&1 &)
  for _ in $(seq 1 30); do
    curl -fsS "${HOST}/api/version" >/dev/null 2>&1 && break
    sleep 1
  done
fi
if ! curl -fsS "${HOST}/api/version" >/dev/null 2>&1; then
  echo "warn: ollama daemon not reachable at ${HOST}; skipping model pull (tests fall back to mock)" >&2
  exit 0
fi

# ── 3. pull the pinned model (idempotent) ──
if ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "$MODEL"; then
  echo "✓ local-llm model ${MODEL} already present"
else
  echo "↓ pulling ${MODEL} (~400MB, one-time)..."
  if ! ollama pull "$MODEL"; then
    echo "warn: 'ollama pull ${MODEL}' failed; skipping (tests fall back to mock)" >&2
    exit 0
  fi
fi
echo "✓ local-llm primitive ready: ${MODEL} via ollama $(ollama --version 2>/dev/null | head -1 || echo '(version unknown)')"
