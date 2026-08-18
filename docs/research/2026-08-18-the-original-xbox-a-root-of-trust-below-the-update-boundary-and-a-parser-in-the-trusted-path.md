# The original Xbox: a root of trust below the update boundary, and a parser in the trusted path

**Ferried** 2026-08-18 · source: Aaron, streamed observation · register: **Beacon** (public
security history, named humans, published papers) · status: **unmetered** — the historical
recall is labelled per §"Recall register" below; the *structural* claim is the load-bearing part.

## 0. The observation

Aaron, on the open YubiHSM firmware-version question:

> *"xbox the original did this and the memory resident version of the bios was hackable via a
> font overflow exploit lol"*

The "lol" is doing real work. He is not making an analogy — he is pointing out that the exact
configuration we were treating as an open question in 2026 was **already broken in public, in
2002, by hobbyists**, and that the break did not come from the crypto.

## 1. What the Xbox actually did

Three parts, and the interesting failure is in the third.

1. **A secret boot block in silicon.** The first code the console executed was not in the
   flashable BIOS. It lived in a small hidden ROM inside the MCPX southbridge — mask ROM, no
   update path, by design. It decrypted the real bootloader out of flash **into RAM** and jumped
   to it. So the trusted, running BIOS was **memory-resident**: it existed as an image in DRAM
   that nothing on the update path could reach.

2. **The secret came out over the bus.** Andrew "bunnie" Huang tapped the link between the CPU
   and the southbridge and captured the boot block in transit. The key was never *broken*; it
   was **observed**, because a secret that has to travel between two chips is a secret with a
   wire attached to it.

3. **The break that mattered was a parser.** The dashboard loaded font files from the hard
   disk. Those fonts were attacker-supplyable and were parsed by code running with full trusted
   privilege — a buffer overflow in the font loader gave arbitrary execution inside the trusted
   context. The save-game exploits (the Bond / MechAssault / Splinter Cell family) were the same
   class with a different file format.

Nobody attacked the cipher. They attacked **the trusted component's willingness to interpret
structure it did not author**.

## 2. Three structural lessons, each live for us right now

### 2a. A root of trust below the update boundary cannot be repaired, only replaced

The mask ROM was unpatchable *on purpose* — that was sold as the security property. And it is,
right up until it is wrong, at which point unpatchable means **the entire installed base is
permanently defective** and the only remedy is hardware replacement.

This is exactly the shape of the EUCLEAK finding (CVE-2024-45678) on the YubiHSM line: the flaw
is below the field-upgrade boundary, so there is no patch, only a new device. Same geometry, 22
years apart. The Xbox is the worked precedent, and it says the question *"is this device above
or below firmware 2.4.0?"* is not a version check — it is asking **which side of the repair
boundary the device is on**, and that is a permanent property of that specific piece of silicon.

### 2b. Memory-resident trusted code is not protected by the update path

Once the trusted image is in RAM, every guarantee about the *flash* is irrelevant to it. We have
been reasoning about HSM firmware versions as though the version *is* the trust state. The Xbox
says the version bounds what the *update mechanism* can fix; it does not bound what the running
image will do when handed a malformed structure.

### 2c. A surface is wherever a trusted component parses untrusted structure — §13, stated in hardware

This is the one that transfers directly into the substrate, and it sharpens the definition of
**Surface** we just landed in `docs/GLOSSARY.md`.

§13 (noninterference / entropy quarantine) says entropy enters only through **declared, metered
channels**. A font file is undeclared entropy entering a trusted context. The dashboard never
*decided* to accept attacker input — it decided to render text, and the parser was the door
nobody declared.

So the operational test is not "did we authenticate the caller." It is:

> **Where does trusted code interpret structure it did not author?** Every such point is a
> surface, declared or not. The undeclared ones are the exploits.

Note this is also the **closed command set** from the Itron/hub rule arriving from the other
direction. That rule's portable half says a far side may *name* a command but never *define*
one, so compromising it does not buy arbitrary execution. The Xbox font parser is the
counter-example that proves why the property is load-bearing: a font file is a far side
**defining** a computation — a parser is a tiny interpreter, and every interpreter in a trusted
path is an open command set wearing a data format's clothes.

## 3. What this changes about the open firmware read

It does not remove the read — it reframes what the answer means.

- **Before:** "read the version, learn whether extraction applies."
- **After:** "read the version, learn which side of a *permanent* boundary this device sits on."

And it adds a second question the version cannot answer: **what does the running firmware parse?**
Session setup, wrapped-object import, attestation-template handling and audit-log formatting are
all structure-interpreting paths. A version above 2.4.0 closes EUCLEAK; it says nothing about
2c. Both questions are still Aaron's — they need a session, which remains outside my constraints
and outside the constraints I routed to Mateo.

## 4. Recall register (honest labelling)

Per `toy-is-free-metered-must-be-earned` and the checked-anchor requirement:

| claim | register |
|---|---|
| secret boot block in the southbridge, decrypted a bootloader into RAM | **recalled**, widely documented, not re-verified here |
| bunnie Huang recovered it by tapping the inter-chip bus; MIT AI Lab memo, 2002 | **recalled** — the memo exists and is the right anchor; exact memo number not re-checked |
| a font-parsing overflow in the dashboard gave trusted-context execution | **Aaron's recall, and mine agrees**; the softmod family is public history |
| save-game overflows (Bond / MechAssault / Splinter Cell) are the same class | **recalled** |
| the three structural lessons in §2 | **the load-bearing content** — they follow from the shape, not from the specific byte offsets |

If a specific historical detail turns out wrong, §2 survives it. That asymmetry is deliberate:
the anchor is being used for its *structure*, and the structure is what was checked.

## 5. Anchors (Beacon)

- **Andrew "bunnie" Huang**, *Keeping Secrets in Hardware: The Microsoft XBox Case Study* (MIT AI
  Lab memo, 2002; also CHES 2002) — the canonical published account, and the origin of the
  "a secret with a wire attached to it" reading. Later *Hacking the Xbox* (No Starch, 2003).
- **EUCLEAK** (Thomas Roche / NinjaLab, 2024), CVE-2024-45678 — the modern instance of the same
  below-the-boundary geometry.
- **Ken Thompson**, *Reflections on Trusting Trust* (1984) — the general form: trust terminates
  somewhere you cannot inspect, and the question is only *where*.
- **Goguen & Meseguer** (1982) — noninterference; §13's anchor, and what §2c is an instance of.

## Pointers

- `.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md` — the **closed command set** as
  the portable security property; §2c is the argument for why it is not optional.
- `.claude/rules/dv2-data-split-discipline-activated.md` §7 — noninterference; §2c is that
  discipline stated for hardware parsers.
- `docs/GLOSSARY.md` §Surface — this doc sharpens it: a surface is *wherever trusted code
  interprets unauthored structure*, whether or not anyone declared it.
- The in-flight TPM-vs-HSM mapping (Mateo) — §2a is the frame that comparison should carry:
  compare the **repair boundaries**, not only the capability lists.
