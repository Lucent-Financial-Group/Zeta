# `nixos/tests/fixtures/server-join/`

Fixtures that let the shipped join modules be **driven** by tests instead of
only read. `injected-server-join.nix` takes its two input paths as *options*
precisely so a test can point them somewhere that exists at evaluation time;
a module with hardcoded absolute paths could only ever be inspected.

| file | read by | what it is |
|---|---|---|
| `cluster-join-server-url` | `k3s-server-join-eval-test.nix`, `k3s-server-join.nix` | the join endpoint, `https://control-plane:6443` — a **name**, because `--tls-san=control-plane` in `k3s-server.nix` is what the API certificate is valid for |
| `token-present-marker` | `k3s-server-join-eval-test.nix` | an empty placeholder. The module reads only `builtins.pathExists` on its token path, never the contents, so the eval test needs no credential at all |
| `vm-shared-cluster-token` | `k3s-server-join.nix` (VM) | a **fixed, public, test-only** k3s `--token` value |

## `vm-shared-cluster-token` is not a secret, and could not usefully be one

It is committed in the clear on purpose. The two-node VM test needs the founder
and the joiner to agree on a cluster secret that is known at **evaluation**
time, which is k3s's documented HA setup (`--token` shared across servers). Its
entire blast radius is one hermetic QEMU pair inside the Nix build sandbox,
which has no network and is destroyed when the derivation finishes.

Storing a real credential here would be strictly worse and is structurally
impossible to need: a NixOS module evaluates into the **world-readable Nix
store**, which is exactly why `injected-server-join.nix` reads only the
*presence* of its token file and leaves the `K10<64 hex>::…` content check to
`zeta-install.sh`, on the machine, where the bytes already are.

The string is self-describing (`…-not-a-credential`) so that a secret scanner
hit here is answerable by reading the value rather than by consulting a
suppression list.
