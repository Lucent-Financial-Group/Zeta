#!/usr/bin/env bash
# Mutation harness for reason-truth.ts.
#
# Every mutation is proven APPLIED by byte-level `cmp` against a pristine copy
# BEFORE its result is read, and proven RESTORED by `cmp` after. A harness that
# patches nothing produces fake surviving mutants, which is worse than no
# harness at all.
set -u
ROOT=/Users/acehack/Documents/src/repos/shadow-reason-truth-13492
TARGET="$ROOT/src/Core.TypeScript/cluster/reason-truth.ts"
PRISTINE="$ROOT/.mutation/pristine.ts"
cp "$TARGET" "$PRISTINE"

run_case () {
  local name="$1" old="$2" new="$3"
  cp "$PRISTINE" "$TARGET"
  OLD="$old" NEW="$new" TARGET="$TARGET" python3 - <<'PY'
import os
p=os.environ['TARGET']; s=open(p).read(); old=os.environ['OLD']; new=os.environ['NEW']
n=s.count(old)
if n != 1:
    print("PATCH-TARGET-COUNT %d" % n); raise SystemExit(3)
open(p,'w').write(s.replace(old,new))
PY
  if [ $? -ne 0 ]; then echo "$name | PATCH FAILED (target not unique)"; cp "$PRISTINE" "$TARGET"; return; fi
  if cmp -s "$TARGET" "$PRISTINE"; then
    echo "$name | NOT APPLIED (bytes identical to pristine) -- result NOT read"
    cp "$PRISTINE" "$TARGET"; return
  fi
  ( cd "$ROOT" && bun test src/Core.TypeScript/cluster/reason-truth.test.ts >/dev/null 2>&1 )
  local code=$?
  cp "$PRISTINE" "$TARGET"
  if ! cmp -s "$TARGET" "$PRISTINE"; then echo "$name | RESTORE FAILED"; return; fi
  if [ $code -ne 0 ]; then echo "$name | KILLED (tests exit $code)"; else echo "$name | SURVIVED (tests exit 0)"; fi
}

echo "== baseline (pristine, must be 0) =="
( cd "$ROOT" && bun test src/Core.TypeScript/cluster/reason-truth.test.ts >/dev/null 2>&1 ); echo "pristine tests exit $?"
echo "== mutants =="

run_case "M1 unrenderable comparison always true" \
  'if (classes.includes(arg(1))) return null;' \
  'if (true) return null;'

run_case "M2 snapshot staleness detection disabled" \
  'if (demonstrated || evidence.snapshotCoversTree) return null;' \
  'if (true) return null;'

run_case "M3 main always exits 0" \
  'process.exit(reasonTruthExitCode(report));' \
  'process.exit(0);'

run_case "M4 exit-code fold always 0" \
  'return report.refuted.length > 0 || report.unbound.length > 0 ? 1 : 0;' \
  'return 0;'

run_case "M5 chart-pin comparison always true" \
  'if (forChart.some((source) => source.targetRevision === arg(2))) return null;' \
  'if (true) return null;'

run_case "M6 renders-not always holds" \
  'if (snapshotUnrenderable(evidence.snapshot, arg(0))) return null;' \
  'if (true) return null;'

run_case "M7 unbound-identifier guard disabled" \
  'if (!subject.text.includes(failureClass)) continue;' \
  'continue;'

run_case "M8 malformed citations silently dropped" \
  'return { citations, malformed };' \
  'return { citations, malformed: [] };'

run_case "M9 pvc-total comparison always true" \
  'if (Number.isFinite(claimed) && total === claimed) return null;' \
  'if (true) return null;'

run_case "M10 missing cited path treated as present" \
  'if (text === null) return refute("cited-path-missing", `${arg(0)} does not resolve to a file in this tree`);' \
  'if (text === null) return null;'

run_case "M11 glob-defers always holds" \
  'if (evidence.globDeferred.has(arg(0))) return null;' \
  'if (true) return null;'

echo "== final integrity =="
if cmp -s "$TARGET" "$PRISTINE"; then echo "target restored byte-identical to pristine"; else echo "TARGET DIFFERS FROM PRISTINE"; fi
