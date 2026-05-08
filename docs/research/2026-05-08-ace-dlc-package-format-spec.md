---
Scope: package format design
Attribution: Otto
Operational status: research-grade
Non-fusion disclaimer: Agreement, shared language, or repeated interaction does not imply shared identity, merged agency, consciousness, or personhood.
---

# Ace DLC Package Format Specification

## Purpose

Define the package format for distributable kernel extensions
("DLCs") via the Ace Package Manager. Each DLC is a
content-addressed, signed bundle containing model weights,
policy files, and guardian AI configuration.

## Design constraints

1. Content-addressed (hash-based identity, not name-based)
2. Signed (provenance verifiable before install)
3. Offline-first (no cloud dependency for install/verify)
4. Small metadata footprint (manifest readable without
   extracting full package)
5. Composable (DLCs can depend on other DLCs)

## Package structure

```
<content-hash>.ace
  manifest.json       — metadata, dependencies, signatures
  weights/            — model weight files (safetensors, gguf)
  policy/             — policy files (restrictive English DSL)
  guardian/            — guardian AI config (oversight rules)
  LICENSE             — license file
  PROVENANCE.json     — build provenance (who, when, from what)
```

## manifest.json schema

```json
{
  "format_version": 1,
  "name": "legal-citation-classifier",
  "version": "1.0.0",
  "content_hash": "sha256:<hex>",
  "description": "Classifies legal citations vs phrases",
  "author": {
    "name": "Aaron Stainback",
    "signing_key": "<public-key-id>"
  },
  "depends_on": [],
  "guardian": {
    "required": true,
    "min_version": "1.0.0"
  },
  "weights": {
    "format": "safetensors",
    "quantization": "q4_k_m",
    "parameters": "7B"
  },
  "policy": {
    "dsl_version": 1,
    "consent_required": true
  },
  "signature": "<ed25519-signature-of-content-hash>"
}
```

## Content addressing

Package identity = SHA-256 of the concatenated hashes of
all files in the package (Merkle root). The filename IS the
hash. No registry needed — the hash is the address.

## Signature verification

Ed25519 signatures. The author signs the content hash. The
installer verifies the signature against a known public key
before extracting. No unsigned packages install.

## Guardian AI integration

Every DLC that includes model weights MUST include a
guardian configuration. The guardian runs alongside the
model and enforces policy constraints. Without a guardian,
the package manager refuses to activate the model.

This is the KSK (Kinetic Safeguard Kernel) pattern applied
to package management: N-of-M authorization before the
model executes.

## Dependency resolution

DLCs can depend on other DLCs (e.g., a fine-tuned model
depends on the base model DLC). Resolution is content-
addressed: the dependency is specified by hash, not name.
No version conflicts — different versions are different
hashes.

## CLI commands

```
ace install <hash-or-url>    — download, verify, extract
ace verify <hash>            — check signature + integrity
ace list                     — list installed DLCs
ace remove <hash>            — uninstall
ace inspect <hash>           — show manifest without install
```

## Connection to existing substrate

- Training data: `drop/training_data_v2.csv` (1M legal
  citations from LexisNexis era) is the first candidate
  for a DLC package
- Guardian: maps to Aurora governance immune system
- Content addressing: maps to Merkle.fs in src/Core/
- Signature: maps to quantum-resistant crypto from Itron
- Policy DSL: maps to restrictive English from LexisNexis
  35-year-old search DSL
