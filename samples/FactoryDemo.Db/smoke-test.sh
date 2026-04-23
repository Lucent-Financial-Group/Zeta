#!/usr/bin/env bash
# Factory-demo DB smoke test — confirms schema + seed applied correctly.
#
# Run after `docker-compose up -d`:
#   bash samples/FactoryDemo.Db/smoke-test.sh
#
# Exits 0 if the seed is present and shapes are correct; 1 otherwise.
# Uses `docker-compose exec` so no host-side psql is required.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! docker-compose ps --services 2>/dev/null | grep -q '^db$'; then
    echo "db service not running. Start it first:"
    echo "    cd $SCRIPT_DIR && docker-compose up -d"
    exit 1
fi

# Wait for Postgres to accept connections before smoke-checking.
# The compose healthcheck covers container-up; pg_isready confirms the
# server is actually answering. Bounded: 30 attempts * 1s = 30s budget.
echo -n "Waiting for Postgres to accept connections"
for _ in $(seq 1 30); do
    if docker-compose exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
        echo " ready."
        break
    fi
    echo -n "."
    sleep 1
done
if ! docker-compose exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    echo ""
    echo "Postgres did not become ready within 30s." >&2
    exit 1
fi

fail=0

run_psql() {
    docker-compose exec -T db psql -U postgres -tAX -c "$1" 2>/dev/null | tr -d '[:space:]'
}

check() {
    local label="$1"
    local sql="$2"
    local expected="$3"
    local actual
    actual=$(run_psql "$sql")
    if [ "$actual" = "$expected" ]; then
        printf "  OK   %-40s (%s)\n" "$label" "$actual"
    else
        printf "  FAIL %-40s expected=%s got=%s\n" "$label" "$expected" "$actual"
        fail=1
    fi
}

echo "Factory-demo DB smoke test"
echo "=========================="

check "customer row count"              "SELECT COUNT(*) FROM customers;"              "20"
check "opportunity row count"           "SELECT COUNT(*) FROM opportunities;"          "30"
check "activity row count"              "SELECT COUNT(*) FROM activities;"             "33"
check "duplicate-email customer pairs"  "SELECT COUNT(*) FROM (SELECT email FROM customers GROUP BY email HAVING COUNT(*) > 1) s;"  "2"
check "Lead-stage opportunity count"    "SELECT COUNT(*) FROM opportunities WHERE stage = 'Lead';"     "10"
check "Won-stage opportunity count"     "SELECT COUNT(*) FROM opportunities WHERE stage = 'Won';"      "6"
check "Lost-stage opportunity count"    "SELECT COUNT(*) FROM opportunities WHERE stage = 'Lost';"     "2"

if [ "$fail" -eq 0 ]; then
    echo ""
    echo "All checks passed."
    exit 0
else
    echo ""
    echo "One or more checks failed — seed data may be missing or corrupted."
    exit 1
fi
