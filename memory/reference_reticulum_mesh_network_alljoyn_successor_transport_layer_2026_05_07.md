---
name: Reticulum — cryptographic mesh network, AllJoyn's successor, transport layer for grains/silos/Green Lantern
description: Reticulum (reticulum.network) is the cryptographic mesh networking stack. No source addresses (identity = hash), any medium (LoRa/WiFi/packet radio/IP), self-configuring, per-packet ephemeral keys (Curve25519). Aaron identified it as AllJoyn's spiritual successor and the transport for Orleans grains, 16kHz audio, and the Green Lantern ring. Python, porting to Rust.
type: reference
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Reticulum

Aaron 2026-05-07: "this is reticulum" (after the AllJoyn
+ sonar distributions + 16kHz audio on grains discussion).

### What it is

Cryptographic mesh networking stack. Runs in userland.
Any medium: LoRa, packet radio, WiFi, serial, IP.
Self-configuring. Per-packet ephemeral keys (Curve25519
ECDH + AES). No source addresses — identity = hash of
cryptographic identity, not location.

### How it maps

| Concept | Reticulum |
| ------- | --------- |
| AllJoyn peer discovery | Self-configuring mesh |
| Hole puncher | No hub, name-only (identity hash) |
| Green Lantern ring | LoRa mesh transport |
| Aurora poly-boundary | Cryptographic boundary |
| Satoshi wire protocol | Identity = hash, not location |
| Edge gate | Endpoint with local policy |
| 16kHz audio transport | Encrypted link over any medium |

### Lineage

- stewils/media-contrib #15, #16 (2015): AllJoyn audio
- AllJoyn → AllSeen Alliance → OCF (product died)
- Reticulum: same architecture, better crypto, alive
- AllJoyn got -1, Reticulum got +1. μένω.

### Sources

- https://reticulum.network/
- https://github.com/markqvist/Reticulum
- FOSDEM 2026: Rust port underway
