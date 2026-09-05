#!/usr/bin/env bash
#
# tools/setup/macos.sh — macOS bootstrap path. Called by install.sh.
#
# Order matters:
#   1. Xcode Command Line Tools (prerequisite for everything else)
#   2. Homebrew (system-package source on macOS)
#   3. Brew packages from manifests/brew (currently empty after
#      round-34 JDK → mise migration)
#   4. mise (runtime manager)
#   5. common/mise.sh     — installs dotnet/python/java/bun/uv
#                           per .mise.toml
#   6. ace-realize --all  — all mechanism realizers (install-graph order)
#   7. common/shellenv.sh — managed PATH file
#   8. common/profile-edit.sh — append the managed-PATH source line to the shell profile

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETUP_DIR="$REPO_ROOT/tools/setup"
SETUP_REALIZE="$REPO_ROOT/src/Core.TypeScript/ace/setup-realize.ts"

# Bun setup realizers (081KLL7…); requires bun on PATH (from mise).
realize_mechanisms() {
  if ! command -v bun >/dev/null 2>&1; then
    echo "error: bun required for setup realizers — ensure common/mise.sh ran first" >&2
    exit 1
  fi
  bun "$SETUP_REALIZE" "$@"
}

# shellcheck source=tools/setup/common/curl-fetch.sh
# shellcheck disable=SC1091  # SC1091 fires because the source path is
# constructed via $SETUP_DIR (a runtime variable) rather than a
# literal; shellcheck cannot statically resolve it. The source=
# directive above tells shellcheck where the file actually lives so
# it follows the include for static analysis. The SC1091 disable is
# the matching runtime-side suppression.
source "$SETUP_DIR/common/curl-fetch.sh"

# ── 1. Xcode Command Line Tools ─────────────────────────────────────
if ! xcode-select -p >/dev/null 2>&1; then
  echo "↓ installing Xcode Command Line Tools (non-interactive)..."
  # Apple still shows one confirmation prompt on this path; we accept
  # that rather than fail fast per the maintainer's standing
  # "just install everything" framing for first-run setup.
  xcode-select --install || true
  echo "  If a GUI prompt appeared, complete the install and re-run this script."
fi
echo "✓ Xcode CLT at $(xcode-select -p 2>/dev/null || echo 'pending user confirmation')"

# ── 2. Homebrew ─────────────────────────────────────────────────────
if ! command -v brew >/dev/null 2>&1; then
  echo "↓ installing Homebrew..."
  # Download to temp file then exec — the 081KQ8P5D0008QG0R001DMK8JD structural fix.
  # Homebrew does not publish a SHA256 for install.sh (the script
  # tracks HEAD of github.com/Homebrew/install with no tagged
  # releases). Trust anchor: HTTPS + GitHub + the Homebrew project.
  # We verify non-empty to catch truncated downloads.
  HOMEBREW_INSTALLER_TMP="$(mktemp)" || { echo "error: mktemp failed" >&2; exit 1; }
  trap 'rm -f "${HOMEBREW_INSTALLER_TMP}"' EXIT
  curl_fetch --output "${HOMEBREW_INSTALLER_TMP}" \
    https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh
  if [ ! -s "${HOMEBREW_INSTALLER_TMP}" ]; then
    echo "error: Homebrew installer empty after download; refusing to exec" >&2
    exit 1
  fi
  /bin/bash "${HOMEBREW_INSTALLER_TMP}"
  # Ensure brew is on PATH for the remainder of this script run.
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi
echo "✓ brew: $(brew --version | head -n1)"

# ── 3. Brew packages (from manifest) ────────────────────────────────
BREW_MANIFEST="$SETUP_DIR/manifests/brew"
if [ -f "$BREW_MANIFEST" ]; then
  # Extract non-comment non-empty lines via awk (doesn't fail under
  # pipefail when the manifest is all comments — unlike `grep -vE`
  # which exits 1 on no-match). Round-34 brew has no packages
  # after the JDK migration to mise.
  #
  # the maintainer 2026-05-26 surfaced a parser bug where a manifest
  # line like `p7zip  # cascade #4 audit (7z list)` was passed to
  # brew install verbatim (formula name became the whole line including
  # the inline comment), producing "No available formula". Fix: strip
  # inline `# ...` AND trim surrounding whitespace before emitting.
  PKGS="$(awk '
    { sub(/#.*$/, ""); gsub(/^[[:space:]]+|[[:space:]]+$/, "") }
    NF > 0 { print }
  ' "$BREW_MANIFEST")"
  # HOST TIERS — entries may carry tier=<slim|standard|full>; host declares or auto-detects
  # (workitem 081KTWQZY7F08QG0R0034KN17T).
  # shellcheck disable=SC1091
  . "$SETUP_DIR/common/host-tier.sh"
  if [ -n "$PKGS" ]; then
    # UNATTENDED OR IT IS NOT AN INSTALLER.
    #
    # `brew install X` PROMPTS -- "Would upgrade 1 dependency for tectonic: pcre2 /
    # Do you want to proceed with the installation? [y/n]" -- whenever it would
    # upgrade a dependency. Measured 2026-09-01 on the maintainer's machine, where it
    # stopped install.sh dead waiting for a keystroke.
    #
    # WHY CI NEVER SAW IT: Homebrew only prompts on an interactive terminal, and a
    # runner has no TTY. The macos-install-sh-test lane therefore CANNOT reproduce
    # this class -- a check structurally incapable of failing for the defect. The env
    # below makes the behaviour identical in both places instead of depending on the
    # absence of a terminal.
    export NONINTERACTIVE=1        # Homebrew's own documented unattended switch
    export HOMEBREW_NO_ENV_HINTS=1 # hint noise is not a diagnosis

    # DECLARED LINK-CONFLICT WINNERS.
    #
    # Two formulae in this manifest can ship the same binary; `brew install` of the
    # second then FAILS at the link step. Measured 2026-09-01: binaryen 132 added
    # `wasm2c`, which wabt 1.0.41 already provides, and install.sh errored with
    # "Could not symlink bin/wasm2c ... is a symlink belonging to wabt".
    #
    # AN UPSTREAM BUMP, NOT A LOCAL MESS. The CI run at 06:10 that day poured binaryen
    # 131 and passed; 132 published after it. The next CI run would have hit this.
    #
    # An allowlist rather than a blanket `--overwrite`: forcing every link would let a
    # future collision resolve silently in whichever order brew happened to run. Each
    # entry names the formula that WINS and why the loser does not need the binary.
    #   binaryen -- installed for wasm-opt/wasm-as/wasm-dis (AssemblyScript's
    #   optimizer, checked by common/smoke-10-toolchains.sh). wabt is installed for
    #   wat2wasm/wasm2wat/wasm-validate/wasm-strip. `wasm2c` is in NEITHER reason and
    #   is referenced NOWHERE in this repository, so the collision is over a binary
    #   nothing here uses.
    ZETA_BREW_LINK_OVERWRITE="binaryen"

    # DOES THIS BREW SUPPORT `install --overwrite`? Probed once, not assumed.
    #
    # WHY IT MATTERS -- and this is a defect fix, not a tidy-up. Installing a declared
    # winner WITHOUT `--overwrite` makes the link phase FAIL, and Homebrew's `ofail`
    # emits a GitHub Actions error annotation when `GITHUB_ACTIONS` is set
    # (`Library/Homebrew/utils/output.rb` onoe -> `GitHub::Actions
    # .puts_annotation_if_env_set!`, gated on `env_set?` = `ENV.fetch("GITHUB_ACTIONS",
    # false).present?`). We then recover with `brew link --overwrite`, the step exits 0,
    # and the JOB GOES GREEN CARRYING A FAILURE ANNOTATION.
    #
    # MEASURED on run 33860210941: `build-and-test (macos-26)` was green with zero failed
    # steps and this annotation attached --
    #     ##[error]The `brew link` step did not complete successfully
    #     Could not symlink bin/wasm2c ... belonging to wabt
    # -- which `drift (loud)` reports as `(step swallowed by continue-on-error)`, because
    # a failure annotation on a green job is indistinguishable, through the API, from a
    # step swallowed by `continue-on-error`. It was the only evidence anywhere that
    # anything had gone wrong.
    #
    # THE FIX IS TO NOT FAIL, NOT TO HIDE THE FAILING. Unsetting `GITHUB_ACTIONS` for the
    # call would suppress the annotation and leave the failure happening -- the wrong
    # shape, and it would blind brew's CI reporting for every other formula in the loop.
    # `--overwrite` links over the conflicting file during install, reaching the same end
    # state the recovery already produced (`brew link --overwrite` deletes the same wabt
    # symlink) without a failure on the way.
    #
    # PROBED RATHER THAN ASSUMED because this script runs on dev laptops with whatever
    # brew they have; `--overwrite` is not in every version. When it is absent the
    # install-then-relink path below is unchanged, so an older brew keeps working and
    # keeps its annotation -- honest either way.
    if brew install --help 2>/dev/null | grep -q -- '--overwrite'; then
      ZETA_BREW_INSTALL_OVERWRITE_SUPPORTED=1
    else
      ZETA_BREW_INSTALL_OVERWRITE_SUPPORTED=0
    fi

    echo "↓ installing brew packages from $(basename "$BREW_MANIFEST")..."
    # `brew install` is idempotent on already-installed formulae.
    #
    # THE LOOP READS FROM FD 3, NOT STDIN, AND THAT IS LOAD-BEARING.
    # This used to be `printf '%s\n' "$PKGS" | while IFS= read -r pkg_line`. A child
    # process inside the body inherits the loop's stdin -- which IS the package list --
    # and anything that reads it CONSUMES THE REST OF THE MANIFEST. The loop then hits
    # EOF, exits 0, and prints "✓ brew packages up to date" over rows it never attempted.
    # A silent truncation that reports success: the vacuity class, in the installer.
    #
    # CAUGHT 2026-08-31 by tools/setup/manifest-realized.ts on the FIRST run of the new
    # macos-install-sh-test step. `brew install zig` (which pulls llvm@21 and lld@21)
    # swallowed the tail of the list; the runner's log shows the remaining manifest lines
    # echoed raw --
    #     llvm tier=standard / pandoc tier=standard / ykman / yubico-piv-tool /
    #     opensc / pam-reattach
    # -- immediately followed by "✓ brew packages up to date", and install.sh exited 0.
    # Four tier=slim rows were never attempted on a machine that had just claimed to
    # provision itself, and `opensc` was one of them.
    #
    # FD 3 rather than `</dev/null` on each brew call: the redirect fix has to be repeated
    # on every command anyone ever adds to this body, and the failure it prevents is
    # SILENT, so the next omission would not be noticed either. Moving the input off the
    # channel children inherit makes the body safe by construction.
    while IFS= read -r pkg_line <&3; do
      required_tier="$(zeta_tier_of_line "$pkg_line")"
      pkg="$(zeta_strip_tier "$pkg_line" | awk '{print $1}')"
      [ -z "$pkg" ] && continue
      if ! zeta_tier_allows "$required_tier"; then
        echo "→ $pkg skipped: requires tier=$required_tier, host is $ZETA_HOST_TIER ($ZETA_HOST_TIER_SOURCE)"
        continue
      fi
      if brew list --formula "$pkg" >/dev/null 2>&1; then
        brew upgrade "$pkg" >/dev/null 2>&1 || true
      else
        # A DECLARED winner installs WITH `--overwrite` where brew supports it, so its
        # link phase never fails and never annotates. See the probe above for why the
        # failing-then-recovering path is a defect rather than a cost of doing business.
        zeta_install_flags=""
        case " $ZETA_BREW_LINK_OVERWRITE " in
          *" $pkg "*)
            if [ "$ZETA_BREW_INSTALL_OVERWRITE_SUPPORTED" = "1" ]; then
              echo "→ $pkg: declared link-conflict winner; installing with --overwrite"
              zeta_install_flags="--overwrite"
            fi
            ;;
        esac

        # A declared collision winner can fail to LINK against a formula installed
        # earlier in this same loop. Retry the link explicitly rather than letting the
        # install die -- and only for a formula named above, so an UNDECLARED collision
        # still fails loudly instead of being forced through. Reachable now only on a
        # brew without `--overwrite`, or on a conflict `--overwrite` did not settle.
        # shellcheck disable=SC2086
        if ! brew install $zeta_install_flags "$pkg"; then
          case " $ZETA_BREW_LINK_OVERWRITE " in
            *" $pkg "*)
              echo "→ $pkg: install hit a link conflict; DECLARED overwrite winner, relinking"
              brew link --overwrite "$pkg"
              ;;
            *)
              echo "error: brew install $pkg failed and $pkg is not a declared link-conflict winner" >&2
              exit 1
              ;;
          esac
        fi
      fi
    done 3<<EOF_BREW_PKGS
$PKGS
EOF_BREW_PKGS
  else
    echo "✓ brew manifest empty; skipping"
  fi
fi
echo "✓ brew packages up to date"

# ── 3b. Brew CASKS (from manifests/brew-cask) ───────────────────────
# Casks are a separate brew namespace (`--cask` / `brew list --cask`), so they get
# their own declarative manifest + loop (mirrors the formula loop above, tier-aware).
CASK_MANIFEST="$SETUP_DIR/manifests/brew-cask"
if [ -f "$CASK_MANIFEST" ]; then
  CASKS="$(awk '
    { sub(/#.*$/, ""); gsub(/^[[:space:]]+|[[:space:]]+$/, "") }
    NF > 0 { print }
  ' "$CASK_MANIFEST")"
  if [ -n "$CASKS" ]; then
    echo "↓ installing brew casks from $(basename "$CASK_MANIFEST")..."
    # FD 3, not stdin -- same defect, same fix. See the long note on the formula loop
    # above. This loop is MORE exposed, not less: a `pkg` cask artifact runs
    # `sudo installer -pkg`, and sudo reading a password prompt from stdin is exactly a
    # child that consumes the list.
    while IFS= read -r cask_line <&3; do
      required_tier="$(zeta_tier_of_line "$cask_line")"
      stripped="$(zeta_strip_tier "$cask_line")"
      cask="$(printf '%s' "$stripped" | awk '{print $1}')"
      [ -z "$cask" ] && continue
      # Optional `tap=<owner/tap>` token — a custom tap (e.g. cvc5/cvc5) is tapped + trusted
      # before install. Generalizes the former cvc5 one-off into the manifest framework.
      tap="$(printf '%s' "$stripped" | awk '{for(i=2;i<=NF;i++){if($i ~ /^tap=/){sub(/^tap=/,"",$i); print $i}}}')"
      if ! zeta_tier_allows "$required_tier"; then
        echo "→ $cask skipped: requires tier=$required_tier, host is $ZETA_HOST_TIER ($ZETA_HOST_TIER_SOURCE)"
        continue
      fi
      if [ -n "$tap" ]; then
        brew tap "$tap" >/dev/null 2>&1 || true
        brew trust "$tap" >/dev/null 2>&1 || true
      fi
      if brew list --cask "$cask" >/dev/null 2>&1; then
        brew upgrade --cask "$cask" >/dev/null 2>&1 || true
      else
        brew install --cask "$cask"
      fi
    done 3<<EOF_BREW_CASKS
$CASKS
EOF_BREW_CASKS
  fi
fi
echo "✓ brew casks up to date"

# ── 4. mise ─────────────────────────────────────────────────────────
# Keep in sync with .mise.toml min_version. macOS installs mise via Homebrew,
# whose formula advances in place; accept newer versions and enforce only the
# repo's minimum supported release.
MISE_MIN_VERSION="2026.6.12"

zeta_version_at_least() {
  awk -v have="$1" -v want="$2" '
    BEGIN {
      n = split(have, h, ".")
      m = split(want, w, ".")
      max = n > m ? n : m
      for (i = 1; i <= max; i++) {
        hv = i in h ? h[i] + 0 : 0
        wv = i in w ? w[i] + 0 : 0
        if (hv > wv) exit 0
        if (hv < wv) exit 1
      }
      exit 0
    }
  '
}

installed_mise_version=""
if command -v mise >/dev/null 2>&1; then
  installed_mise_version="$(mise --version 2>/dev/null | awk '{print $1}')"
fi

if ! command -v mise >/dev/null 2>&1; then
  echo "↓ installing mise via Homebrew..."
  # PINNED to the same version tools/setup/linux.sh pins. An unpinned `brew install mise`
  # leaves the tool that enforces every other pin floating -- the defect that put the
  # Windows lane red (see install.ps1 step 3). Homebrew cannot install an arbitrary old
  # formula version, so this installs current and then WARNS on mismatch rather than
  # pretending parity it cannot deliver: a silent mismatch is what hid this for months.
  brew install mise
fi

installed_mise_version="$(mise --version 2>/dev/null | awk '{print $1}')"
if ! zeta_version_at_least "$installed_mise_version" "$MISE_MIN_VERSION"; then
  echo "↓ upgrading mise ${installed_mise_version:-unknown} → at least ${MISE_MIN_VERSION} via Homebrew..."
  brew update
  brew upgrade mise || brew install mise
  installed_mise_version="$(mise --version 2>/dev/null | awk '{print $1}')"

# Parity check (GOVERNANCE.md §24): warn when macOS is not running the version Linux pins.
# Measured 2026-08-29: linux.sh pinned 2026.6.12 and macOS/Windows pinned nothing, so the
# three-way-parity script suite ran up to three different mise versions against one
# .mise.toml -- and a newer mise applies supply-chain policies an older one does not.
mise_pin_expected="$MISE_MIN_VERSION" # one source: the floor declared above
mise_actual="${installed_mise_version%% *}"
mise_actual="${mise_actual#v}"
if [ -n "$mise_actual" ] && [ "$mise_actual" != "$mise_pin_expected" ]; then
  echo "WARNING: mise is $mise_actual but tools/setup/linux.sh pins $mise_pin_expected."
  echo "         Same .mise.toml, different mise, different policy. Bump BOTH together."
fi
  if ! zeta_version_at_least "$installed_mise_version" "$MISE_MIN_VERSION"; then
    echo "error: mise is ${installed_mise_version}, but .mise.toml requires at least ${MISE_MIN_VERSION}" >&2
    echo "  run: brew update && brew upgrade mise" >&2
    exit 1
  fi
fi
mkdir -p "${MISE_DATA_DIR:-$HOME/.local/share/mise}"
touch "${MISE_DATA_DIR:-$HOME/.local/share/mise}/.disable-self-update"
echo "✓ mise: $(mise --version)"

# ── 5-12. Common steps ──────────────────────────────────────────────
# mise.sh runs `mise install` from .mise.toml, which now includes
# dotnet (round-34 flip). No separate dotnet install step needed;
# mise shims handle PATH. `~/.dotnet/tools` still needs PATH for
# `dotnet tool install -g` globals — that's dotnet's own convention
# independent of where the SDK lives. shellenv.sh wires it.
"$SETUP_DIR/common/mise.sh"

# Put mise shims on THIS shell's PATH so subsequent common/*.sh
# subprocesses (python-tools, dotnet-tools, verifiers) inherit it
# and can invoke dotnet / uv / bun / java / python from the mise
# install. mise.sh also tries to export this but it exports inside
# its own subprocess; parent inherit needs the parent to export.
for shim_dir in \
    "$HOME/.local/share/mise/shims" \
    "/opt/homebrew/opt/mise/shims" \
    "/opt/homebrew/share/mise/shims"; do
  if [ -d "$shim_dir" ]; then
    export PATH="$shim_dir:$PATH"
    break
  fi
done

export PATH="$HOME/.dotnet/tools:$PATH"

realize_mechanisms --all
"$SETUP_DIR/common/shellenv.sh"
"$SETUP_DIR/common/profile-edit.sh"
