#!/usr/bin/env bash
# full-ai-cluster/dev-cluster/kind-up.sh
#
# Bring up the CI-friendly kind substrate for the B-0967 ArgoCD health test.
# k3d remains the closer Cilium-takeover profile; kind is the conservative
# GitHub Actions path because it is the upstream Kubernetes-in-Docker test
# harness and avoids k3s/kine startup behavior.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GIT_REF="main"
CONFIG_PATH="${SCRIPT_DIR}/profiles/ci.kind-config.yaml"
CLUSTER_NAME="zeta-ci"
CONTAINER_RUNTIME="${ZETA_CONTAINER_RUNTIME:-${CONTAINER_RUNTIME:-docker}}"

usage() {
  cat >&2 <<EOF
usage: ./kind-up.sh [--config <kind-config.yaml>] [--cluster-name <name>] [--git-ref <ref>]
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --config)
      if [ "$#" -lt 2 ]; then
        usage
        exit 1
      fi
      CONFIG_PATH="$2"
      shift 2
      ;;
    --cluster-name)
      if [ "$#" -lt 2 ]; then
        usage
        exit 1
      fi
      CLUSTER_NAME="$2"
      shift 2
      ;;
    --git-ref)
      if [ "$#" -lt 2 ]; then
        usage
        exit 1
      fi
      GIT_REF="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [ ! -f "$CONFIG_PATH" ]; then
  echo "ERROR: kind config not found: $CONFIG_PATH" >&2
  exit 1
fi

case "$CLUSTER_NAME" in
  ''|*[!a-z0-9-]*|-*|*-)
    echo "ERROR: cluster name must be a DNS label (got: '${CLUSTER_NAME}')" >&2
    exit 1
    ;;
esac

case "$CONTAINER_RUNTIME" in
  docker)
    unset KIND_EXPERIMENTAL_PROVIDER
    ;;
  podman)
    export KIND_EXPERIMENTAL_PROVIDER=podman
    ;;
  *)
    echo "ERROR: ZETA_CONTAINER_RUNTIME/CONTAINER_RUNTIME must be docker or podman (got: '${CONTAINER_RUNTIME}')" >&2
    exit 1
    ;;
esac

case "$GIT_REF" in
  *[!a-zA-Z0-9._/-]* | ''|/*|*/|*//*)
    echo "ERROR: git-ref must match [a-zA-Z0-9._/-]+ (got: '${GIT_REF}')" >&2
    exit 1 ;;
esac

for cmd in "$CONTAINER_RUNTIME" kind kubectl helm; do
  command -v "$cmd" >/dev/null || {
    echo "ERROR: $cmd not found. Install with:"
    case "$cmd" in
      docker) echo "  Docker Desktop or Colima (https://docs.docker.com/desktop/install/mac-install/)" ;;
      kind|kubectl|helm)
        echo "  bash \"${REPO_ROOT}/tools/setup/install.sh\""
        echo "  # installs kind/kubectl/helm from the repo's .mise.toml"
        ;;
    esac
    exit 1
  }
done

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} already exists. Use ./kind-down.sh --cluster-name ${CLUSTER_NAME} to recreate."
else
  echo "Creating kind cluster ${CLUSTER_NAME} ..."
  kind create cluster \
    --name "$CLUSTER_NAME" \
    --config "$CONFIG_PATH" \
    --wait 180s
fi

kubectl config use-context "kind-${CLUSTER_NAME}"
kubectl wait --for=condition=Ready nodes --all --timeout=180s

if ! helm -n argocd status argocd >/dev/null 2>&1; then
  echo "Installing ArgoCD ..."
  kubectl create namespace argocd >/dev/null 2>&1 || true
  helm repo add argo https://argoproj.github.io/argo-helm >/dev/null 2>&1 || true
  helm repo update argo >/dev/null
  helm install argocd argo/argo-cd \
    --version 7.7.10 \
    --namespace argocd \
    --set server.service.type=ClusterIP \
    --wait
fi

kubectl wait --for=condition=Established \
  --timeout=120s \
  crd/applications.argoproj.io \
  >/dev/null

"${SCRIPT_DIR}/apply-root-app.sh" "$GIT_REF"

cat <<EOF

Kind CI cluster up.

  kubectl get nodes
  kubectl -n argocd get applications

Tear down: ./kind-down.sh --cluster-name ${CLUSTER_NAME}
EOF
