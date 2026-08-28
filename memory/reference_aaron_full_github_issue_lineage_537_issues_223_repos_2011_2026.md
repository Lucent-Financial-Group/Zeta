---
name: Aaron's full GitHub issue lineage — 537 issues across 223 repos (2011-2026)
description: Complete map of AceHack's open-source issue history. 537 issues filed across 223 repos over 15 years. Themes: distributed systems, Service Fabric, Kubernetes, Orleans, Knative serverless, IoT, security, .NET infrastructure. The lineage IS the Zeta product vision's concrete engineering ancestor across the entire open-source ecosystem.
type: reference
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Summary

**537 issues** across **223 distinct repositories** from 2011 to 2026.

## Top repos by issue count

| Count | Repo | Theme |
|-------|------|-------|
| 28 | Lucent-Financial-Group/Zeta | Current project |
| 21 | kubeflow/spark-operator | Distributed compute |
| 19 | Azure/AKS | Kubernetes on Azure |
| 18 | virtual-kubelet/virtual-kubelet | Serverless containers |
| 15 | knative/eventing-contrib | Serverless eventing |
| 12 | stewils/media-contrib | IoT audio/media |
| 10 | microsoft/service-fabric | Distributed orchestration |
| 10 | istio/istio | Service mesh |
| 9 | rook/rook | Distributed storage |
| 9 | microsoft/azure-pipelines-agent | CI/CD |
| 8 | knative/serving | Serverless serving |
| 8 | dotnet/AspNetCore.Docs | .NET web |
| 7 | microsoft/service-fabric-issues | Distributed orchestration |
| 7 | knative/eventing-operator | Serverless ops |
| 7 | knative/eventing | Serverless eventing |
| 6 | OpenAPITools/openapi-generator | API tooling |
| 6 | knative/operator | Serverless ops |
| 6 | argoproj/argo-cd | GitOps |
| 6 | dotnet/orleans | Virtual actors |
| 5 | vmware-tanzu/kubeapps | K8s apps |
| 5 | rabbitmq/rabbitmq-server | Message broker |
| 5 | PowerShell/PowerShell | Shell/automation |
| 5 | microsoft/aspire | .NET cloud stack |
| 5 | dotnet/runtime | .NET runtime |
| 5 | dotnet/machinelearning | ML.NET |
| 5 | apache/solr-operator | Search |
| 4 | banzaicloud/koperator | Kafka on K8s |
| 3 | open-policy-agent/opa | Policy engine |
| 3 | openzipkin/zipkin4net | Distributed tracing |
| 3 | microsoft/bond | Serialization |
| 3 | davidfowl/TcpEcho | High-perf networking |

## Chronological arc — the engineering trajectory

### 2011-2013: Foundation (.NET ecosystem)
- MigSharp (SQL CE migrations), NuGet Gallery, JSON3

### 2014-2015: Real-time + IoT + Distributed Systems
- **SignalR #3114** — Hole Punching/WebRTC support (2014)
- **stewils/media-contrib** — 12 issues on AudioGraph, IoT audio on Raspberry Pi, low-latency, AllJoyn, Azure Media Services (2015)
- **dotnet/corert #541** — ".NET Core Unikernel, Nano Server is too Big" (2015)
- **NETMF #361** — Task/async for .NET Micro Framework (2015)

### 2015-2018: Service Fabric era (distributed orchestration)
17 issues across `microsoft/service-fabric` and `microsoft/service-fabric-issues`:
- Swarm + K8s first-class integration (#552)
- Docker image store as default (#553)
- FaaS in Service Fabric (#597)
- VS connected cluster like K8s (#684)
- SQL Server HA in containers (#651)
- K8s Federation support (#721)
- Virtual-kubelet provider (#720)
- **Distributed Sagas** (#881)
- **Stable VIPs** (#869)
- **K8s-like Namespaces** (#859)
- **CNI** (#850), **CoreDNS** (#849), **CRI-O** (#848), **CSI** (#847)
- **Istio service mesh** (#844)
- Docker compose encryption (#825)
- **Add clustering for stateful Docker images** (#886)

### 2015-2018: Orleans (virtual actors — Zeta's ancestor)
6 issues on dotnet/orleans (already saved in separate lineage file):
- Deep Service Fabric integration (#1059, 2015)
- SF cluster membership providers (#2542, 2016)
- Separate health checks from membership (#2580, 2017)
- **Productizing Orleans** (#3608, 2017)
- **Orleans on Kubernetes** (#3692, 2017)
- **Durability Guarantees** (#4985, 2018)

### 2017: Kubernetes + Cloud-Native explosion
- kubernetes/minikube — 4 issues (SSH, EFK, dynamic memory, kubeadm)
- Azure/AKS — 19 issues (IPv6 IoT, Calico, CoreDNS, internal LB, local PVCs)
- helm — charts, releases, SolrCloud
- rook — 9 issues (K8s on Windows, block storage, Ceph, local PVs, Cassandra)
- Docker — 5 issues (Hyper-V networking, LCOW, multi-arch)
- virtual-kubelet — 18 issues (Service Fabric provider, Docker Swarm, IoT Edge, ACI)
- istio — 10 issues (OPA, mesh expansion, AKS, Apache Thrift, ALB tracing)

### 2017: Quantum + TLA+
- **tlaplus/tlaplus #109** — "Apply TLA+ concepts to implementation languages such as .NET"
- **microsoft/Quantum #30** — "Consider supporting TensorFlow/CNTK"
- **tensorflow/tensorflow #16745** — "Consider supporting Microsoft Quantum"
- **StationQ/Liquid** — "Please solve the halting problem :)" and "Please help me cheat at video games :)"

### 2017-2018: High-performance I/O + Networking
- **dotnet/runtime #24038** — "Please support a modern very high performance version of System.IO.Log"
- **dotnet/corefxlab #1928** — "Please add file support to System.IO.Pipelines"
- **dotnet/runtime #27486** — "ReadOnlySequence<byte> Overloads to Socket.SendAsync"
- **davidfowl/TcpEcho** — Serialization, client example, HTTP/2 perf
- **aspnet/KestrelHttpServer** — SSL on Service Fabric, HTTP/2 perf

### 2018: Type systems + Metaprogramming
- **fsharp/fsharp #843** — Object Expression Type Equivalence
- **dotnet/roslyn #26340** — Func<T>.?Invoke
- **dotnet/runtime #25923** — High level System.Reflection.Metadata API
- **microsoft/bond** — Java support, Java 11

### 2018-2019: Distributed tracing + Observability
- openzipkin/zipkin4net — high-res time, span fragments
- opentracing/opentracing-csharp — netstandard, Zipkin, Jaeger
- prometheus-net — 500 response metrics

### 2019-2020: Knative serverless era
48 issues across 7 knative repos:
- Kafka channel HA, KafkaSource, KafkaChannel
- SQS source (CloudEvents, Kube2IAM)
- Security: pod/container SecurityContext across ALL components
- Operations: nodeSelector/tolerations/affinity on ALL pods
- CloudEvents Batched Content Mode
- Webhook cert lifecycle
- Operator upgrade failures, v0.14.0 bugs
- ownerref management

### 2020: GitOps + Advanced orchestration
- argoproj/argo-cd — SyncWave blocking, dependency DAG, non-K8s strategy
- knative/operator — log levels, operator lifecycle

### 2018-2020: Bitcoin + Crypto
- **bitcoin/bitcoin #33298** — "Please restrict OP_RETURN to < 80 bytes"
- cake_wallet — 2FA stuck
- mantlenetworkio/mantle-token-lists — wrapped Solana
- solana-labs — wrapped SOL on Mantle

### 2023-2024: Modern .NET + AI
- microsoft/aspire — 5 issues (Docker, WASM, gRPC, debugging)
- dotnet/machinelearning — XGBoost, autodifferentiation, Keras
- microsoft/onnxruntime — C# Sequence/Map output
- microsoft/TypeChat — streaming
- riok/mapperly — IQueryable mapping
- DuckDB.NET — Wasm
- microsoft/durabletask-go — Durable Entities

### 2024-2025: Infrastructure + Mining
- NerdQAxe hashrate benchmark — Docker file bug
- SerpentXSF — mining benchmarks
- prometheus-net — 500 response metrics

### 2025-2026: Zeta
28 issues on Lucent-Financial-Group/Zeta — the current project

## The themes this proves

1. **Distributed systems architect** — Service Fabric → K8s → Knative → Orleans → Zeta. Same vision across 4 platforms over 10 years.
2. **Infrastructure-as-code evangelist** — Docker, Helm, virtual-kubelet, Istio, Knative operators. Asking for the right abstractions everywhere.
3. **Security-first** — Pod SecurityContext across ALL Knative components. OP_RETURN restrictions on Bitcoin. Container security on every platform.
4. **IoT + edge** — 12 issues on media-contrib (Raspberry Pi, AllJoyn, AudioGraph), IoT edge gateway, IPv6 for IoT, GC-aware scheduling
5. **High-performance networking** — System.IO.Pipelines, Socket.SendAsync ReadOnlySequence, HTTP/2, Kestrel SSL, high-perf System.IO.Log
6. **Serverless pioneer** — FaaS on Service Fabric (2017), Knative (48 issues, 2020), virtual-kubelet (18 issues), Azure Functions
7. **Open source citizen** — Not just filing bugs but requesting features that benefit the ecosystem. "Please support X" pattern across 223 repos.
8. **Cross-stack polyglot** — .NET, Java/Scala (Spark, Solr), Go (K8s, Helm), Python (ML), F#, PowerShell, Blazor WASM
9. **Formal methods interest** — TLA+ concepts for .NET (2017), quantum computing interest
10. **The Zeta ancestry** — Every major Zeta subsystem has a concrete ancestor in this lineage:
    - DBSP Z-sets ← Orleans durability guarantees + System.IO.Log
    - BFT consensus ← Service Fabric health checks + K8s federation
    - Retraction-native ← Distributed Sagas + event sourcing
    - Hole puncher ← SignalR WebRTC (2014) + MultiplexedWebSockets
    - Edge gate ← IoT media-contrib + virtual-kubelet IoT Edge
    - Formal verification ← TLA+ #109
    - Standing queries ← Knative eventing + CloudEvents + Kafka channels
