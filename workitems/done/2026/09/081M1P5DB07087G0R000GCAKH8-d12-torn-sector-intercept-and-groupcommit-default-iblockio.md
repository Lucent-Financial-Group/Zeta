---
id: 081M1P5DB07087G0R000GCAKH8
type: task
state: done
priority: P1
slug: d12-torn-sector-intercept-and-groupcommit-default-iblockio
title: "D12 torn-sector intercept and GroupCommit default IBlockIo"
created: 2026-09-04T12:13:34.599Z
completed: 2026-09-04T12:20:27.046Z
depends_on: []
composes_with: []
---

# D12 torn-sector intercept and GroupCommit default IBlockIo

D12 names four intercepts: crash-mid-write, reorder, corrupt-last-write,
torn sector. The fourth is this peel.

`ArmTornSector(path, sectorBytes)`: next matching WriteAt/Write longer
than `sectorBytes` overlays only that prefix of the NEW bytes; the rest
of the range stays OLD; the write **acks**. Distinct from crash (throws)
and corrupt (full write, XOR tail).

`GroupCommitDiskDeltaLog` default is the **device door** (`IBlockIo` /
`FileSystemBlockIo` / `ZGL2`). That is how WAL *bytes* hit disk. It is
not event-streaming vs materialized views — both doors write the same
framed records. The POSIX append door (`OpenFile(Append)` + Dispose)
stays as `useBlockIo = false` for tests that still arm whole-file
Dispose or poke a `FileStream`. No production reason to append through
POSIX streams.

Recovery peel (does not promote out of `toy`): `BlockCas.Put` skips a
key that already exists, so a second freeze of the same ContentId does
not rewrite bits (D9 pointer-not-copy, CAS half).

Native NVMe is not claimed. Crash recovery stays `toy`.

## Acceptance

- FileSystemBlockIo / SimulatedBlockIo: rewrite an LBA of 1s with 2s
  under `ArmTornSector(512)` acks; first 512 are 2s, rest stay 1s.
- Polyfill freeze: first freeze, torn-sector the second, second acks,
  reopen first is readable.
- GroupCommit default constructor is the device door; POSIX append
  tests pass `useBlockIo = false`.
- Second `BlockCas.Put` of the same key does not grow payload.
