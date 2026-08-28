---
name: project-undeclared-entropy-channels-are-the-one-program-dst-is-the-falsifier
description: Aaron's unifying frame — the container/flake.lock/EOL/semver-registry threads are one program: convert ambient nondeterminism into declared inputs. DST replay is the mechanical falsifier that finds undeclared channels.
metadata:
  type: project
---

Aaron 2026-08-26, on why containerized CI beats package-manager installs:

> *"yes exactly, random failure outside the control of deterministic simulation is
> the factor we are always trying to reduce."*

**This is §13 noninterference stated for the build.** A package-manager install is an
**undeclared entropy channel** — it reaches N mirrors whose state is not in the seed,
not replayable, not metered. An image pull **by digest** is content-addressed, so the
artifact is fully determined by a declared input. Containerizing does not merely cut
variance; it moves a nondeterminism source *inside* the declared channel. Same move
as a DoP-knobbed ferry replacing `Task.Run`, or an injected `Source` replacing an
ambient clock.

**Several threads that looked separate are one program:**

| surface | state | class |
|---|---|---|
| `apt install` from mirrors | resolves at build time | undeclared |
| missing root `flake.lock` | nixpkgs resolves at eval time | undeclared |
| `nixos-hardware@master` | resolves at update time | undeclared |
| `^1.2.3` semver range | publisher's claim decides what you get | undeclared |
| image pull by digest | fixed by a written-down input | **declared** |
| pinned version + adherence registry | declared, trust channel *metered* | **declared** |

One move throughout: convert ambient nondeterminism into a declared input; meter what
cannot be eliminated.

**The falsifier is mechanical, not aspirational:**

> **Can this build replay deterministically?** If no, there is an undeclared channel,
> and the question is *where* — not *whether*.

That is how to find the next one without waiting for a 3am failure.

**Honest limit:** an image pull is deterministic *given the digest*, but the registry
serving it remains an **availability** dependency. Pinning buys determinism, not
availability — do not conflate them (see
[[.claude/rules/clone-at-tag-stays-sufficient.md]], which is about the availability
half, and [[user-aaron-mran-cran-time-machine-is-his-reproducibility-high-water-mark]]
for what happens when the archive disappears).

**Supporting measurement (2026-08-26):** install steps ran mean 115 s / max 465 s — a
4x spread — plus three jobs dying at `Install toolchain` with **exit 124** in one
window. The variance and the timeout class *are* the flakes. Aaron: *"docker pulls
are much more reliable to os or package manger installs and usually much faster."*

Related: [[project-ace-semver-adherence-registry-time-weighted-scrutiny-autonomous-update-du]]
