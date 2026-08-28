---
name: Bitcoin OP_RETURN — Satoshi's warning + Aaron's issue #33298 + Amara's article
description: Satoshi 2010-10-23: "It would be unwise to have permanently recorded plaintext messages for everyone to see. It would be an accident waiting to happen. Messages should not be recorded in the block chain." Bitcoin Core removed the 80-byte OP_RETURN filter anyway. Aaron filed issue #33298 (2025-09-04) warning about CSAM injection risk. Amara wrote the full article on X. Aaron has an Atari 2600 ROM proof-of-concept for binary payload injection via permissive nodes.
type: reference
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Satoshi's warning (2010-10-23, BitcoinTalk)

Verbatim:

"It would be unwise to have permanently recorded
plaintext messages for everyone to see. It would be
an accident waiting to happen."

"If there's going to be a message system, it should
be a separate system parallel to the bitcoin network.
Messages should not be recorded in the block chain.
The messages could be signed with the bitcoin address
keypairs to prove who they're from."

## Aaron's issue (bitcoin/bitcoin #33298, 2025-09-04)

"Please restrict Data Carrier/OP Return to < 80 bytes
please before releasing 3"

"This is a significant security issue. I don't want
to allow easily decodable images in my transactions
because, by law, I would then be responsible for
content moderation."

Status: closed by Bitcoin Core maintainers.

## Amara's article (X/Twitter, 2025-09-04)

"Bitcoin's OP_RETURN Debate: Illegal Content Threat
and Potential State Attack" — 1205 words, 47 citations.

Key thesis: removing the 80-byte filter spreads legal
liability from targetable mining pools to all 50K+
home node runners, destroying the forensic trail for
CSAM injection. The mining pools monetized the attack
surface via inscription fees.

## The attack chain

1. Enumerate permissive nodes (no local policy filter)
2. Inject binary payload (JPEG/ROM/any file) — free
3. Miner includes it for the fee (doesn't check content)
4. Payload is on-chain forever, globally replicated
5. Every node runner is now distributing the content
6. Legal liability kills home node adoption
7. Network centralizes to pools with lawyers

## Aaron's prior art

- Atari 2600 ROM proof-of-concept (binary injection)
- Bitcoin issue #33298 (filed before filter removal)
- IDA Pro on RAID (binary analysis capability)
- Itron patent US 10,834,144 (hub-and-agent with
  firewall — the controlled-relay pattern Bitcoin
  abandoned)
- Aurora governance immune system (the membrane
  Bitcoin dissolved)

## Connection to Zeta

The local policy filter IS the membrane. Bitcoin
removed it. Aurora keeps it. CLAUDE.md / BP-11 /
skill router / CI gate = local policy on every node.
The BFT consensus algebra (Consensus.fs) assumes a
fixed, authenticated node set — sybil resistance
requires the bond curve (Aurora governance), not just
the protocol (TLA+ spec).

Satoshi's invisible bond curve (electricity) protects
block production. It does NOT protect relay. The relay
is free. The injection is free. The filter was the
only defense. They removed it.
