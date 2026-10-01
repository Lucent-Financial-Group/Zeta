#!/usr/bin/env bash
# zeta-postgres-instances.sh -- the shared PostgreSQL's instance count FOLLOWS the number of
# schedulable nodes: 1 on a single node, 2 on two, 3 once three can take a pod. It only ever
# scales UP.
#
# WHY THIS EXISTS. The owner needs "clusters of pods", and `postgres-shared` (a CloudNativePG
# Cluster) shipped as `instances: 1` with a comment saying that a derived value "would read 1
# anyway": at first boot -- the only moment ArgoCD syncs it -- a joining worker has not arrived,
# so no install-time input can know the final node count. That is true of a value read ONCE.
# This unit reads it CONTINUOUSLY, so a node that joins an hour later still gets replicas.
# Three instances on one node cost 3x the memory and three PVCs and protect against nothing
# (one disk, one kernel), which is why the default is 1 and why this waits for real nodes.
#
# WHAT IT DOES, per pass:
#   1. counts nodes that are Ready, not cordoned, and carry no NoSchedule/NoExecute taint;
#   2. target = min(that count, 3), at least 1;
#   3. reads the Cluster's `spec.instances`;
#   4. when target > current, merge-patches `instances`, `enablePDB` and `primaryUpdateMethod`
#      TOGETHER -- the three that must agree (a PodDisruptionBudget on a lone primary hangs
#      `kubectl drain` forever; a switchover has no replica to promote at 1). The same
#      triple postgres-shared-cluster.test.ts pins for the committed file.
#   Anything else is `steady` or `waiting`; it NEVER scales down. A node that drops out of the
#   count (a reboot, a drain) must not delete a replica: scale-down is a data decision a human
#   makes, and shrinking on a flapping Ready condition would turn a blip into data loss.
#
# WHY A HOST UNIT AND NOT A CronJob. A cluster-resident CronJob would be a workload every
# audit of applications/ prices, and it would need an image pull on a cluster that is busy
# pulling. This runs on the server role (which already has `k3s kubectl`), exactly as
# zeta-virt-first-sync does, and is EXECUTED by tests against a fake kubectl.
#
# ARGOCD MUST NOT FIGHT IT. postgres-shared's Application ignores exactly these three fields
# on the Cluster and sets RespectIgnoreDifferences, so neither the diff nor a sync (selfHeal
# included) puts `instances: 1` back. Without that, a sync would scale three instances to one.
#
# OUTCOMES, each a VERDICT line on the serial console, printed only on CHANGE so a loop does
# not repeat itself every minute:  scaled | steady | waiting.
# A probe that FAILS is `waiting`, never "zero nodes" and never "steady": reading an API error
# as an empty cluster is how a scale-down guard is built wrong.
#
# EXIT: a pass never fails the unit. In loop mode it sleeps and repeats; ZETA_PG_ONCE=1 runs one
# pass (tests, and the live lane) and exits 0.

set -u

KUBECTL="${ZETA_KUBECTL_CMD:-KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl}"
NAMESPACE="${ZETA_PG_NAMESPACE:-postgres-shared}"
CLUSTER_NAME="${ZETA_PG_CLUSTER:-postgres-shared}"
MAX_INSTANCES="${ZETA_PG_MAX_INSTANCES:-3}"
INTERVAL_SEC="${ZETA_PG_INTERVAL_SEC:-60}"
ONCE="${ZETA_PG_ONCE:-}"
SERIAL_DEVICE="${ZETA_SERIAL_DEVICE:-/dev/ttyS0}"
LAST_STATE_FILE="${ZETA_PG_LAST_STATE_FILE:-/run/zeta-postgres-instances.last}"

say() {
  echo "$1"
  if [ -w "$SERIAL_DEVICE" ]; then
    echo "$1" > "$SERIAL_DEVICE" 2>/dev/null || true
  fi
}

# Print a verdict only when it differs from the previous pass's.
verdict() {
  local line="[zeta-postgres-instances]   VERDICT $1"
  if [ "$(cat "$LAST_STATE_FILE" 2>/dev/null || true)" != "$line" ]; then
    say "$line"
    mkdir -p "$(dirname -- "$LAST_STATE_FILE")" 2>/dev/null || true
    printf '%s' "$line" > "$LAST_STATE_FILE" 2>/dev/null || true
  fi
}

# One line per node: `<name> <Ready status> <ok|unschedulable> <taint effects, comma-joined>`.
# (go-template, not jq: the node's closure carries kubectl and nothing else this needs.)
NODE_TEMPLATE='{{range .items}}{{.metadata.name}} {{range .status.conditions}}{{if eq .type "Ready"}}{{.status}}{{end}}{{end}} {{if .spec.unschedulable}}unschedulable{{else}}ok{{end}} {{range .spec.taints}}{{.effect}},{{end}}{{"\n"}}{{end}}'

schedulable_nodes() {
  local out line n=0
  if ! out="$(eval "$KUBECTL get nodes -o go-template='$NODE_TEMPLATE'" 2>/dev/null)"; then
    return 1
  fi
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    # shellcheck disable=SC2086
    set -- $line
    [ "${2:-}" = "True" ] || continue
    [ "${3:-}" = "ok" ] || continue
    # Whole-effect match: `PreferNoSchedule` merely discourages scheduling and must NOT exclude a node.
    case ",${4:-}" in *,NoSchedule,*|*,NoExecute,*) continue;; esac
    n=$((n + 1))
  done <<< "$out"
  echo "$n"
}

pass() {
  local nodes current target

  if ! nodes="$(schedulable_nodes)"; then
    verdict "waiting: could not list nodes (the API did not answer)"
    return 0
  fi
  if [ "$nodes" -lt 1 ]; then
    # No schedulable node at all is far likelier a node-list oddity than a real cluster of
    # zero; either way there is nothing safe to scale to.
    verdict "waiting: no schedulable Ready node was counted"
    return 0
  fi

  # `--ignore-not-found` makes "absent" a SUCCESS with empty output, so a non-zero exit can only
  # mean the question was not answered.
  if ! current="$(eval "$KUBECTL -n $NAMESPACE get cluster.postgresql.cnpg.io $CLUSTER_NAME -o jsonpath='{.spec.instances}' --ignore-not-found" 2>/dev/null)"; then
    verdict "waiting: could not ask the API for Cluster $NAMESPACE/$CLUSTER_NAME"
    return 0
  fi
  if [ -z "$current" ]; then
    verdict "waiting: Cluster $NAMESPACE/$CLUSTER_NAME does not exist yet (ArgoCD has not synced postgres-shared)"
    return 0
  fi
  case "$current" in *[!0-9]*)
    verdict "waiting: Cluster $NAMESPACE/$CLUSTER_NAME reported a non-numeric instance count"
    return 0;;
  esac

  target="$nodes"
  [ "$target" -gt "$MAX_INSTANCES" ] && target="$MAX_INSTANCES"

  if [ "$target" -le "$current" ]; then
    verdict "steady: $nodes schedulable node(s), Cluster has $current instance(s) (target $target; never scales down)"
    return 0
  fi

  # More than one instance: the template's own values (examples/cnpg-postgres-ha.yaml). The PDB
  # and the switchover method are what a cluster with a replica needs; at 1 they are what hangs.
  if ! eval "$KUBECTL -n $NAMESPACE patch cluster.postgresql.cnpg.io $CLUSTER_NAME --type merge -p '{\"spec\":{\"instances\":$target,\"enablePDB\":true,\"primaryUpdateMethod\":\"switchover\"}}'" >/dev/null 2>&1; then
    verdict "waiting: patching Cluster $NAMESPACE/$CLUSTER_NAME to $target instances failed"
    return 0
  fi
  verdict "scaled: $nodes schedulable node(s); Cluster $NAMESPACE/$CLUSTER_NAME $current -> $target instance(s), enablePDB=true, primaryUpdateMethod=switchover"
}

if [ -n "$ONCE" ]; then
  pass
  exit 0
fi

while true; do
  pass
  sleep "$INTERVAL_SEC"
done
