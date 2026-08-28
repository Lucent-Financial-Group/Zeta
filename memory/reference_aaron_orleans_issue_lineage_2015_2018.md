---
name: Aaron's Orleans issue lineage (2015-2018) — 6 issues across 3 years, productizing silos + durability
description: Aaron (AceHack) filed/commented on 6 Orleans issues from 2015-2018. Service Fabric integration → cluster membership health checks → productizing Orleans → Kubernetes → durability guarantees. The lineage IS the Ace/Zeta product vision's concrete ancestor on the Orleans repo itself.
type: reference
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Aaron's Orleans GitHub issue lineage

| Date | Issue | Title | State |
|------|-------|-------|-------|
| 2015-11-22 | [#1059](https://github.com/dotnet/orleans/issues/1059) | Support deep Service Fabric integration | closed |
| 2016-12-22 | [#2542](https://github.com/dotnet/orleans/issues/2542) | Service Fabric cluster membership providers | closed |
| 2017-01-10 | [#2580](https://github.com/dotnet/orleans/issues/2580) | Separate distributed silo health checks from cluster membership | open |
| 2017-10-27 | [#3608](https://github.com/dotnet/orleans/issues/3608) | Productizing Orleans | closed |
| 2017-11-21 | [#3692](https://github.com/dotnet/orleans/issues/3692) | Orleans on Kubernetes | closed |
| 2018-09-14 | [#4985](https://github.com/dotnet/orleans/issues/4985) | Durability Guarantees | closed |

## The lineage this proves

- 2015: Aaron pushing for deep silo integration with Service Fabric
- 2017: Aaron arguing to separate health checks from membership
  (BFT: monitoring ≠ consensus — same principle as today's architecture)
- 2017: Aaron arguing about PRODUCTIZING Orleans (the Ace vision, 9 years early)
- 2018: Aaron pushing for durability guarantees (the execute:false, immutable,
  retraction-native property the whole architecture needs)

## Human + project anchor

This is a reference anchor for trajectory #3 (Ace DLC packs)
and the Orleans/silo/grain inter-loop communication design.
Aaron's concrete engineering lineage on the Orleans repo itself.
