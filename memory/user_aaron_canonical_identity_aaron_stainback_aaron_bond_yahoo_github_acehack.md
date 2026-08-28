---
name: aaron-canonical-identity-aaron-stainback
description: "Aaron's canonical identity (corrected 2026-06-09): name = Aaron Stainback; git email = aaron_bond@yahoo.com; GitHub = AceHack. Shares surname with Addison Stainback (family). Supersedes older factory values (Lior / lior@zeta.dev / acehack00@gmail.com)."
metadata: 
  node_type: memory
  type: user
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-09 — canonical identity (he corrected it himself):

- **Name:** **Aaron Stainback** (he first mis-said the name field should be the email, then corrected:
  *"sorry Aaron Stainback i was wrong"*).
- **Git email:** **aaron_bond@yahoo.com** (confirmed; he chose it over the older `acehack00@gmail.com` seen in
  prior commit trailers).
- **GitHub account:** **AceHack** (the authed `gh` account; `git@github.com:acehack/Zeta` is his personal fork /
  backup remote).
- **Shares surname with Addison Stainback** (`Addisons820`) — **family.**

**Git config set (2026-06-09):** `user.name = "Aaron Stainback"`, `user.email = "aaron_bond@yahoo.com"` — applied
**globally** (`~/.gitconfig`) and in **both Zeta checkouts** (otto clone + shared). Supersedes the old factory
identities `Lior <lior@zeta.dev>` and `otto-cli@zeta.local`.

**SSH:** his operator pubkey (`ssh-ed25519 …DGTU+Cghue… acehack@Mac.lan`, `SHA256:pnxJA3D5…`) is published at
`maintainers/aaron/ssh-pubkeys.txt` + baked into node trust (`operator-ssh-keys.txt`, #7249).

**How to apply:** use **Aaron Stainback / aaron_bond@yahoo.com** as his identity going forward (commit trailers,
persona records, attribution). GitHub handle is **AceHack**. He has no separate GPG key (commit-signing via the SSH
key is the recommended path).
