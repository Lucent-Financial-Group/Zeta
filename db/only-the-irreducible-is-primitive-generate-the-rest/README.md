# only-the-irreducible-is-primitive-generate-the-rest/

**Carved sentence:** Keep only the irreducible substrate primitive; generate richer forms by lawful composition.

## Meaning

This node names the ZSet unification rule: the primitive should be the smallest
structure that cannot be derived without losing the algebra. Specialized forms,
schemas, migrations, and optimized views should be generated from that root
instead of becoming separate parallel primitives.

For the ZSet work, this means the semiring-weighted sorted-array core is the
candidate primitive. The int64 hot path, schema-as-events, and migration flows
must then appear as specializations or folds over that same core, with benchmark
evidence before any performance-critical specialization is collapsed.
