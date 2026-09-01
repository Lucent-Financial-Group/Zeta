# zeta-orleans-silo

The Orleans silo image that `full-ai-cluster/k8s/applications/orleans/statefulset.yaml` has
pinned since it was written — along with two manifests in the legacy tree — and that nothing
built until 2026-09-01 (`081M0QB1Q6Z087G0R00091JH3Q`).

Those legacy paths are deliberately not spelled out here: that tree is scheduled for deletion,
and `audit-cluster-tree-consumers.ts` counts every file naming it as coupling to be removed.
Naming it in a brand-new file would have added to a list whose whole purpose is to reach zero.

## Why the gap was invisible for so long

GHCR answers `manifest HTTP 401` for a package that **does not exist**, which is the same
answer it gives for one that is private. The status code alone cannot tell those apart, so
the missing image read as a permissions problem. Asking the packages API instead settled it:

```
$ gh api /orgs/lucent-financial-group/packages/container/zeta-orleans-silo
{"message":"Package not found.", "status":"404"}
```

**Making a package public would not have fixed it, because there was no package.**

## What it is

A real Orleans 10.3.1 silo, not a placeholder:

| | |
|---|---|
| clustering | Redis (`Microsoft.Orleans.Clustering.Redis`), endpoint from the ConfigMap |
| config | `/etc/orleans/cluster.json`, mounted from the `orleans-config` ConfigMap |
| ports | 11111 silo-to-silo · 30000 client gateway · 8080 dashboard |
| identity | `POD_IP` is advertised to peers; `POD_NAME` names the host in logs |
| grains | `IHeartbeatGrain` — the smallest grain that proves activation, state and placement |

### It refuses rather than defaults

Three failure modes are made loud on purpose, because each one's quiet version produces a
silo that **reports healthy while being wrong**:

- **Config missing or malformed** → exit 2. Defaulting would join whatever cluster the
  defaults name, which is a silent membership split.
- **`clustering.provider` this binary does not implement** → refuse. The ConfigMap carried
  `kubernetes` until 2026-09-01; a silo that fell through to a default would have formed a
  cluster of one and passed its readiness probe.
- **Empty Redis password** → passed through as empty, never as "no auth". A wrong secret
  fails to connect instead of silently connecting to an unauthenticated Redis.

## Build

```bash
docker build -t zeta-orleans-silo full-ai-cluster/orleans-silo
dotnet build -c Release full-ai-cluster/orleans-silo   # same build, see below
```

`Directory.Build.props` **and** `Directory.Packages.props` in this directory stop inheritance
from the repo root. Both are needed: NuGet discovers `Directory.Packages.props` on a search
entirely separate from the `Directory.Build.props` chain, so setting
`ManagePackageVersionsCentrally=false` in the latter is not sufficient — measured, the build
failed `NU1008` on exactly that. Without both files this project would compile one way locally
and another way in the image, where the repo root is not in the build context.

## Check the config without a cluster

```bash
ORLEANS_CONFIG_PATH=/path/to/cluster.json dotnet run -- --check-config
```

Exits 0 and prints the resolved settings, or exits 2 and says why. This is what makes the
manifest↔source contract testable without standing up Kubernetes.

## The contract is checked

`src/Core.TypeScript/cluster/orleans-silo-contract.test.ts` reads **both** halves — the
manifests and this source — and fails when they drift. Every assertion touches both; a test
reading only one half would pass against a silo that ignores it.

Four mutants are on record as caught: removing the `REDIS_PASSWORD` projection, adding a
ConfigMap key the silo never reads, deleting the provider refusal, and drifting a port
between the ConfigMap and the pod.

## Still open

`replicas: 0`, and **not** because the image is missing any more. The `redis-auth` secret the
pod projects does not exist in the tree — the redis Application says `create via Sealed Secret
/ Vault`. Bump replicas once that secret is provisioned.
