---
name: install-sh-proved-on-wild-mac
description: "2026-06-11: full install.sh ran clean (exit 0, zero sudo prompts) on Aaron's 'wild, very dirty' daily Mac — reproducibility proven on a messy real machine, not a clean VM. The new manifest entries fired live mid-run (dotnet-dump/stack installed by the very run that shipped them)."
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron: "save the update observation — on my wild Mac, it's very dirty, and it worked."

**Why it matters:** the one-install-script claim (GOVERNANCE §24) is usually only ever tested on
clean CI images; surviving a years-dirty daily-driver Mac with zero elevation prompts is the
stronger proof. mise owning runtimes (not brew casks) is WHY sudo never came up.

**How to apply:** keep mise as the runtime owner; treat any new step that would need sudo as a
design smell first; cite this run when someone doubts install.sh portability. Related:
[[machine-setup-must-land-in-install-sh]].
