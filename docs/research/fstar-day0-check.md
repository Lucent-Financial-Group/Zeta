# F* Extraction Day-0 Check & Feasibility Assessment

We performed a Day-0 check of the F\* verification and code extraction environment to evaluate its viability as a successor to the LiquidF# validation framework.

---

## 1. Environment Diagnostics

Running diagnostic checks on the host system path yielded:
- `fstar`: **Not found** (exit code `127`)
- `fstar.exe`: **Not found** (exit code `127`)

While Z3 is integrated into the .NET project dependencies (`Microsoft.Z3` version `4.12.2`), the standalone `fstar` compiler and its specific compatible `z3` binary execution dependency are not present on the active system PATH.

---

## 2. Setup & Toolchain Prerequisites

To establish a functioning F\* verification pipeline, the environment requires:
1. **OCaml Toolchain**:
   - `opam` package manager.
   - OCaml compiler version `4.14.x` or `5.x`.
2. **F\* Compiler**:
   - Installation via opam: `opam install fstar`
   - Or native binary release from GitHub.
3. **Z3 Solver Binary**:
   - F\* relies on a specific pinned version of the Z3 SMT solver (e.g., Z3 `4.8.5` or `4.12.x` binary) placed on the environment `PATH` for automated theorem proving.

---

## 3. F\* to F# Extraction Pathways

F\* formally verifies monadic, stateful, and concurrent code, and natively supports extraction to **OCaml**, **F#** (experimental/legacy), and **Kremlin/C** (for low-level system code).

For Zeta's F# DBSP codebase, two extraction pathways exist:
- **ML-Dialect Translation**:
  Extracting to OCaml, then utilizing a transpiler or manual type-mapping to F# (due to the shared ML lineage). F# can compile most pure OCaml structures natively.
- **Direct F# Target**:
  Maintaining custom F\* code wrappers that compile cleanly as F# files by defining F# equivalents of the F\* standard library primitives.

---

## 4. Feasibility Recommendation

> [!WARNING]
> **Status: HOLD / DEFERRED**
> Due to the missing F\* compiler toolchain, local verification cannot be executed in this workspace instance. We recommend deferring F\* extraction until a dockerized development container or environment with the full OCaml + F\* + Z3 toolchain is provisioned.
