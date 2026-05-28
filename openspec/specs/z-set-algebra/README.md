# OpenSpec: Z-Set Algebra

This document specifies the Z-Set and IndexedZSet data structures, which are the foundational building blocks for data representation and manipulation in the Zeta factory.

**Parent:** B-0171.1

## 1. Z-Set

A Z-Set, `ZSet<'K>`, is a mathematical object representing a multiset, or more formally, a finitely-supported map from a key domain `'K` to the integers `ℤ`. It is implemented as an immutable, sorted run of key-weight pairs `(Key: 'K, Weight: int64)`.

### 1.1. Core Properties

- **Immutability:** All Z-Set operations are purely functional and return a new Z-Set.
- **Sorted Keys:** The internal representation is always sorted by key, which allows for efficient merge-joins and lookups.
- **Zero-Weight Pruning:** Keys with a weight of zero are not stored.

### 1.2. Key Operators

The following are the core operators for `ZSet<'K>`.

#### `ZSet.add (a: ZSet<'K>) (b: ZSet<'K>) : ZSet<'K>`
- **Semantics:** Computes the element-wise sum of two Z-Sets. For each key `k`, the new weight is `a[k] + b[k]`.
- **Implementation:** A linear-time sorted merge.

#### `ZSet.neg (a: ZSet<'K>) : ZSet<'K>`
- **Semantics:** Negates the weights of all elements in the Z-Set. For each key `k`, the new weight is `-a[k]`.

#### `ZSet.scale (n: int64) (a: ZSet<'K>) : ZSet<'K>`
- **Semantics:** Multiplies the weight of every element by a scalar `n`. For each key `k`, the new weight is `n * a[k]`.

#### `ZSet.map (f: 'K -> 'K2) (a: ZSet<'K>) : ZSet<'K2>`
- **Semantics:** Applies a function `f` to each key in the Z-Set, grouping the results and summing the weights of the new keys.

#### `ZSet.filter (predicate: 'K -> bool) (a: ZSet<'K>) : ZSet<'K>`
- **Semantics:** Returns a new Z-Set containing only the elements whose keys satisfy the `predicate`.

#### `ZSet.join (keyA: 'A -> 'K) (keyB: 'B -> 'K) (combine: 'A -> 'B -> 'C) (a: ZSet<'A>) (b: ZSet<'B>) : ZSet<'C>`
- **Semantics:** Performs an equi-join on two Z-Sets, `a` and `b`, based on the key functions `keyA` and `keyB`. For each pair of matching elements, their weights are multiplied, and the `combine` function is used to produce the output element.

## 2. IndexedZSet

An `IndexedZSet<'K, 'V>` is a Z-Set of pairs `('K * 'V)` that is indexed by the key `'K`. This provides efficient access to the inner Z-Set of values for a given key. It is represented as a sorted run of `KeyGroup<'K, 'V>` structs.

### 2.1. Key Operators

#### `IndexedZSet.indexWith (key: 'A -> 'K) (value: 'A -> 'V) (z: ZSet<'A>) : IndexedZSet<'K, 'V>`
- **Semantics:** The primary constructor. It transforms a flat `ZSet<'A>` into an `IndexedZSet<'K, 'V>` by applying the `key` and `value` extractor functions to each element.

#### `IndexedZSet.add (a: IndexedZSet<'K, 'V>) (b: IndexedZSet<'K, 'V>) : IndexedZSet<'K, 'V>`
- **Semantics:** Performs a key-wise merge of two IndexedZSets. For keys present in both sets, the inner `ZSet<'V>` values are added together.

#### `IndexedZSet.join (combine: 'K -> 'VA -> 'VB -> 'C) (a: IndexedZSet<'K, 'VA>) (b: IndexedZSet<'K, 'VB>) : ZSet<'C>`
- **Semantics:** Performs an efficient join on two IndexedZSets that share the same key space `'K`. The join is performed on the inner `ZSet`s for each matching key.

## 3. Algebraic Properties

The Z-Set algebra satisfies several important algebraic properties which are leveraged by the DBSP calculus.
- **`add` is associative and commutative.** `(a + b) + c = a + (b + c)` and `a + b = b + a`.
- **`empty` is the identity for `add`.** `a + empty = a`.
- **`neg` provides the inverse for `add`.** `a + (-a) = empty`.
- Together, `(ZSet, add, empty)` forms an **Abelian group**.
- **`scale` distributes over `add`.** `n*(a + b) = n*a + n*b`.

(This section would be expanded with more properties.)
