# OpenSpec: DBSP Operators

This document provides context for the TLA+ specification of the DBSP (Differential Bulk Synchronous Parallel) operators.

**Parent:** B-0171.4

## 1. Core Concept

DBSP is a calculus for incremental computation on top of the Z-Set algebra. It provides a set of operators for expressing complex dataflows in a way that can be efficiently updated as the input data changes.

The core of DBSP is the `D` (differentiate) and `I` (integrate) operators, which allow for the transformation of streams of changes. The formal properties of these operators are what allow for efficient, incremental view maintenance.

## 2. TLA+ Specification

The formal specification of the core DBSP algebraic axioms is located in `DbspSpec.tla`. This spec uses the TLA+ model checker to exhaustively verify the correctness of the axioms over a finite domain.

### 2.1. Key Invariants Verified

The TLA+ spec verifies several key invariants, including:

- **Group Axioms:** It confirms that Z-Sets form an Abelian group under the `add` operation.
- **`distinct` Idempotence:** It verifies that `distinct(distinct(a)) = distinct(a)`.
- **Incremental `distinct` Correctness:** It verifies the correctness of the incremental `distinct` operator (`H` function), which is a cornerstone of efficient DBSP computation.

This formal verification provides a high degree of confidence in the correctness of the foundational algebra upon which the Zeta factory's data processing is built.
