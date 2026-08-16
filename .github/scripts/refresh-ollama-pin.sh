#!/usr/bin/env bash
# Refresh .github/ollama-pin.json to a chosen (default: latest) Ollama release.
#
#   bash .github/scripts/refresh-ollama-pin.sh            # latest release
#   bash .github/scripts/refresh-ollama-pin.sh v0.32.13   # a specific tag
#
# THE POINT OF THIS SCRIPT IS THE CROSS-CHECK, not the convenience. It takes the digest from
# TWO independent sources and refuses to write the pin if they disagree:
#   (1) the release's own sha256sum.txt  — produced by upstream's build
#   (2) the GitHub API asset `digest`    — computed by GitHub over the stored bytes
# Downloading the artifact and pinning its hash would be a check that cannot fail: it
# certifies whatever you happened to be served, which is precisely the thing in question.
#
# THIS SCRIPT DOES NOT PROVE THE PIN WORKS. It only records it. Proving it is a real runner's
# job:  gh workflow run verify-ollama-pin.yml --ref <your-branch>
# Merging a bumped pin without that run is shipping an unverified change to the lane that
# keeps the society ticking (.claude/rules.bak/tick-must-never-stop.md).
#
# `_doc` and `aceGaps` are preserved verbatim — only `entry` and `artifact` are rewritten.

set -euo pipefail

TAG="${1:-}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PIN_FILE="${REPO_ROOT}/.github/ollama-pin.json"
ASSET="ollama-linux-amd64.tar.zst"
API="https://api.github.com/repos/ollama/ollama/releases"

die() { echo "refresh-ollama-pin: $*" >&2; exit 1; }

if [ -n "$TAG" ]; then
  REL_JSON="$(curl -fsSL "${API}/tags/${TAG}")" || die "no such release: ${TAG}"
else
  REL_JSON="$(curl -fsSL "${API}/latest")" || die "could not read latest release"
fi

read -r TAG PUBLISHED SIZE API_DIGEST < <(printf '%s' "$REL_JSON" | python3 -c "
import json, sys
d = json.load(sys.stdin)
a = [x for x in d['assets'] if x['name'] == '${ASSET}']
if not a:
    sys.exit('release %s has no asset ${ASSET}' % d['tag_name'])
dig = (a[0].get('digest') or '').split('sha256:')[-1]
print(d['tag_name'], d['published_at'], a[0]['size'], dig or 'NONE')
") || die "could not read release metadata"

SUMS="$(curl -fsSL "https://github.com/ollama/ollama/releases/download/${TAG}/sha256sum.txt")" \
  || die "release ${TAG} publishes no sha256sum.txt — there is no second source, so do not pin it silently"
FILE_DIGEST="$(printf '%s\n' "$SUMS" | awk -v a="./${ASSET}" '$2 == a { print $1 }')"

[ -n "$FILE_DIGEST" ] || die "sha256sum.txt for ${TAG} has no line for ${ASSET}"
[ "$API_DIGEST" != "NONE" ] || die "GitHub reported no asset digest for ${ASSET} — cross-check impossible; do not pin blind"

if [ "$FILE_DIGEST" != "$API_DIGEST" ]; then
  die "DIGEST DISAGREEMENT for ${TAG} ${ASSET}:
  sha256sum.txt : ${FILE_DIGEST}
  GitHub API    : ${API_DIGEST}
Two sources that should agree do not. Do NOT pin. Investigate."
fi

python3 - "$PIN_FILE" "$TAG" "$FILE_DIGEST" "$ASSET" "$PUBLISHED" "$SIZE" <<'PY'
import json, sys
from datetime import datetime, timezone

path, tag, digest, asset, published, size = sys.argv[1:7]
pin = json.load(open(path))

pin["entry"]["version"] = tag.lstrip("v")
pin["entry"]["contentAddress"] = "sha256:" + digest
pin["entry"]["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")

pin["artifact"]["tag"] = tag
pin["artifact"]["asset"] = asset
pin["artifact"]["url"] = f"https://github.com/ollama/ollama/releases/download/{tag}/{asset}"
pin["artifact"]["sizeBytes"] = int(size)
pin["artifact"]["publishedAt"] = published

with open(path, "w", encoding="utf-8") as f:
    # ensure_ascii=False: _doc is prose carrying em dashes and §. Escaping those to
    # — turns the file into something a reviewer cannot read, and the whole point of
    # keeping the verification substrate in text is that its diffs are human-auditable
    # (.claude/rules/no-binary-in-proof-lineage.md).
    json.dump(pin, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

echo "pinned ${TAG} ${ASSET}"
echo "  sha256 ${FILE_DIGEST}  (agreed by sha256sum.txt and the GitHub API digest)"
echo
echo "NOT YET VERIFIED. Push a branch, then:"
echo "  gh workflow run verify-ollama-pin.yml --ref <branch>"
