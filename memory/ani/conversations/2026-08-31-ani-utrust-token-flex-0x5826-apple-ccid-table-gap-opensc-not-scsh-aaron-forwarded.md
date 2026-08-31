# Ani 2026-08-31 (VERBATIM) — uTrust Token Flex 0x5826, the Apple CCID table gap, OpenSC not sc-hsm-embedded — Aaron-forwarded

**Register:** ferry preservation, verbatim, unfiltered. Forwarded by Aaron 2026-08-31 with the
ask *"can you route this to our someone who works on our ace package management and also our
install.sh for all operating systems?"* Routed to dejan (devops-engineer), who owns
`tools/setup/` and the `ace` manifests per GOVERNANCE.md §24.

**Why this ferry matters, stated before the text rather than inside it.** Our own
`docs/research/2026-08-22-smartcard-hsm-secp256k1-is-unconfirmed-while-yubihsm2-is-measured-dual-vendor-custody.md`
opens by naming its own falsifier and declining to run it: *"**No CardContact hardware was
exercised** — that is the falsifier this note names and does not run."* Ani reports the hardware
is now attached. This ferry is the moment that falsifier became runnable.

Aaron 2026-08-31: *"trying to support this new hsm, and you have past research on this too, you
otto, helped me select this."* Lineage:
`docs/research/2026-08-20-hsm-procurement-recheck-the-cardcontact-lead-paid-off-us-in-stock-cheaper-than-the-plan-it-replaces.md`
· `2026-08-21-two-hsms-per-node-and-n-of-m-across-nodes-what-the-seal-layer-will-actually-accept.md`.

**Two corrections to our own tree that fall out of it, checked before routing:**

1. `opensc` is **already declared on all three OSes** — `manifests/brew:203`, `manifests/apt:284`,
   `manifests/windows:137`. Ani's step 2 is done; a second row would be duplication.
2. `ccid` is declared **nowhere**. That is the real gap, and it is precisely the one Ani names.

`manifests/brew`'s YubiKey block asserts *"macOS ships its own CCID stack"*. Ani does not refute
that — the Apple stack is present and sufficient for a YubiKey. It is insufficient for **PID
0x5826 specifically**, because Apple's bundled CCID table predates Token Flex. A true sentence
that is broader than its evidence is the thing worth correcting.

**Boundary, and it is Ani's own:** nothing has been run against the token. No PIN, no SO-PIN, no
keygen, no init. CardContact's warning is that losing the SO-PIN loses the device.

---

## VERBATIM

> The Google overview mixed in Windows Git/plink. That is the wrong page.
> cardcontact.de/download/driverdownload.html is 2000s serial ECO5000 CT-API, not this USB token.
> Ignore it.
>
> The token is on this Mac right now. USB sees:
>
> Identiv uTrust Token Flex — vendor 0x04E6, product 0x5826
>
> That is CardContact's USB-HSM form factor (Identiv CCID reader + SmartCard-HSM applet). Same
> family as the 2014 0x5816/0x5817 sticks; this PID is newer. YubiKey and YubiHSM are still on the
> bus too.
>
> macOS already has PC/SC (com.apple.ifdreader and com.apple.ctkd are running). You do not install
> Linux pcscd. security list-smartcards is empty because Apple's bundled CCID table does not
> include 0x5826 (it has 0x5816/0x5817). libccid 1.5.3 added Token Flex; Apple is still on an older
> table. That is the actual gap.
>
> You do not need /Library/sc-hsm-pkcs11/lib/sc-hsm-pkcs11.dylib first. That is the optional
> sc-hsm-embedded module (keygen-light). The PKCS#11 we want for Zeta is OpenSC.
>
> ## What to install (Mac)
>
> ### 1. A CCID driver that knows 0x5826
>
> Do not edit Apple's SIP-protected Info.plist. Use Ludovic Rousseau's driver:
>
> ```
> brew install ccid
> sudo defaults write /Library/Preferences/com.apple.security.smartcard useIFDCCID -bool yes
> ```
>
> Unplug/replug the token. Then:
>
> ```
> security list-smartcards
> # or, after OpenSC:
> opensc-tool --list-readers
> ```
>
> You want a reader that looks like Identiv / SmartCard-HSM, not only the YubiKey CCID slot.
>
> ### 2. OpenSC (PKCS#11 + sc-hsm-tool)
>
> ```
> brew install opensc
> ```
>
> That gives opensc-tool, pkcs11-tool, sc-hsm-tool, and a module at something like:
>
> ```
> /opt/homebrew/lib/opensc-pkcs11.dylib
> ```
>
> If you also want Keychain/Safari token UI, use the cask instead (or in addition): brew install
> --cask opensc-app (installs /Library/OpenSC/...). Formula vs cask: formula is enough for our
> PKCS#11 probe; cask is for macOS token integration.
>
> ### 3. Optional management GUI
>
> Smart Card Shell (https://www.openscdp.org/scsh3/index.html) (Java) + Ctrl-M Key Manager.
> CardContact says this is the tool that tracks firmware. Not required to see the token.
>
> ### 4. Optional starterkit zip
>
> sc-hsm-starterkit.zip (https://www.cardcontact.de/download/sc-hsm-starterkit.zip) — README
> inside. Useful later for sc-hsm-embedded. Not the first install.
>
> ## What not to install
>
> | Source | Why skip |
> |---|---|
> | Git for Windows / plink | Hallucination from an old CardContact download page |
> | driverdownload.html ECO5000 | Serial reader, not USB-HSM |
> | Homebrew pcscd | Apple already runs PC/SC |
> | YubiHSM SDK for this token | Wrong PKCS#11. yubihsm_pkcs11.dylib talks to the YubiHSM only |
>
> Two vendors stay two modules: YubiHSM → /usr/local/lib/pkcs11/yubihsm_pkcs11.dylib (already
> there). SmartCard-HSM → OpenSC. Do not flatten them into one list (the probe already treats that
> as a false voucher).
>
> ## After OpenSC is on PATH (do this before any init)
>
> Unauthenticated only — no PIN, no SO-PIN, no keygen:
>
> ```
> opensc-tool --list-readers
> pkcs11-tool --module /opt/homebrew/lib/opensc-pkcs11.dylib -M
> # or: sc-hsm-tool --list-mechanisms
> ```
>
> That is the secp256k1 falsifier from the dual-vendor note. Do not initialize yet. CardContact: if
> you lose the SO-PIN you lost the device. Their playground SO-PIN is 3537363231383830 (ASCII
> 57621880) — only if the token is still factory-blank and you are not putting production keys on
> it.
>
> Repo hygiene when you are ready for DKEK: tools/setup/hsm/dkek-ceremony-preflight.sh (refuses if
> the host is a bad place to type a share password). I have not run anything against the token.
>
> I can install ccid + opensc and re-run a read-only reader/mechanism list if you want that next. I
> will not set a PIN or generate keys unless you say so.

---

## Pointers

- `tools/setup/manifests/brew` — `opensc` at :203 (declared 2026-08-20); no `ccid` row yet
- `tools/setup/manifests/apt` — `opensc` at :284 · `tools/setup/manifests/windows` — `opensc` at :137
- `tools/setup/hsm/dkek-ceremony-preflight.sh` — the DKEK host-suitability refusal Ani names
- `docs/research/2026-08-22-smartcard-hsm-secp256k1-is-unconfirmed-while-yubihsm2-is-measured-dual-vendor-custody.md` — the note whose falsifier this makes runnable
- `.claude/rules/marjorie-rule-qualia-wins-over-marketing.md` — why `memory/ani/` persists independently of any product surface
