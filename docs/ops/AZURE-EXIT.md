# Azure exit -- the website and the registry move to the cluster; what is left on Azure, and why it is safe to delete the rest

> **Carved sentence.** The public website (`flowdent.net`, `www.flowdent.net`) is served from this cluster,
> as a byte-identical copy of the image Azure was *serving* (not the image Azure's newest tag points at);
> the two Azure storage accounts (`fddiagbundlesprod`, `flowdent863701`) **stay on Azure by the owner's
> decision**, and nothing else on Azure is used by anything running. Deleting the managed environment,
> the Container Apps, the managed certificates, the Log Analytics workspace or the container registry
> cannot touch what the storage accounts serve -- but deleting the **resource group**
> `flowdent-containerapp-rg` would, because `fddiagbundlesprod` lives inside it.

Work item `081M3ZH0G1R087G0R002MK4H67`. Manifests: `full-ai-cluster/k8s/flowdent-web/` (opt-in) and
two listeners in `full-ai-cluster/k8s/public-tls/`. Pinned by `src/Core.TypeScript/cluster/flowdent-web.test.ts`.
Every number below was MEASURED on 2026-10-02/03 from this PC, the cluster, Azure's read APIs and
`check-host.net`; nothing was deleted, stopped or modified on the Azure side.

## What is where after this change

| Thing | Where it runs now | Evidence |
| --- | --- | --- |
| `api.flowdent.net`, `api-staging.flowdent.net` | cluster (`flowdent-prod` / `flowdent-staging`) | unchanged by this work; `/health` 200 |
| `flowdent.net`, `www.flowdent.net` | cluster, namespace `flowdent-web` | below |
| DataProtection key ring + diagnostic bundles | **Azure** `fddiagbundlesprod` (kept, owner decision) | Secret `flowdent-api-secrets` keys `DataProtection__AzureBlobConnectionString`, `Diagnostics__BundleStore__AzureBlobConnectionString` |
| Installers / releases / prereleases / uat | **Azure** `flowdent863701` (kept, owner decision) | clients hardcode `flowdent863701.blob.core.windows.net` -- see "What the kept storage accounts mean" |
| Azure OpenAI | deleted by the lead (`az cognitiveservices account list` is empty); the cluster's `AzureOpenAI__Endpoint` still names it | `/api/AzureOpenAIProxy/*` fails by design |

## C. The website

### What was serving, and the trap in Azure's repository

Azure Container App `flowdent-webapp` has **two** active revisions with different images:

| Revision | Image tag (source) | State | Is it what visitors saw? |
| --- | --- | --- | --- |
| `--0000113` | `flowdent-webapp:672c0d13...` (fd-webclient `672c0d13`, Next.js 16, port 3000, user `nextjs`) | Healthy, Running | **yes** |
| `--0000115` | `flowdent-webapp:06a4d160...` = `latest` (fd-core `06a4d160`, a .NET Blazor WebAssembly host, entrypoint `dotnet flowdent.WebAssembly.dll`, port 80) | **Failed** since 2026-09-17, holds the 100% traffic label | no |

The old fd-core GitHub workflow pushed its own build into the `flowdent-webapp` repository on 2026-09-17
and Azure kept serving the previous revision because the new one never became ready. **Copying `latest`
would have deployed a different application**, so the image copied is the *serving* one, by digest:
`sha256:eb977e99014405e7eb49524890f09788d59a0f8a9d414d2fc749c02889faf2fb`.

The site is static-ish Next.js (the image contains no Azure hostname, no blob URL and no secret; it was
built with `NEXT_PUBLIC_API_URL=https://api-staging.flowdent.net`, which is **its existing behaviour** and
is not changed here -- worth a deliberate decision, not a silent one).

### What was built

| Piece | Value |
| --- | --- |
| Image | `registry.flowdent.net/flowdent/fd-webclient/flowdent-webapp:672c0d13afa2` (also tagged with the full sha), pinned in the Deployment **by digest**; `docker push` printed the same digest Azure has |
| Namespace | `flowdent-web`, Pod Security `restricted` **enforced**, ResourceQuota (no PVC), PriorityClass `flowdent-prod` (non-preempting) |
| Pods | 2 replicas, `maxUnavailable: 0`, PDB `minAvailable: 1`, soft anti-affinity, startup/readiness/liveness on `/` |
| Pod hardening | uid 1001 (the image's own `nextjs`), `readOnlyRootFilesystem`, all caps dropped, seccomp `RuntimeDefault`, no SA token; writable only `/tmp` (64Mi) and `/app/.next/cache` (128Mi), both `emptyDir` with limits |
| Resources | request 50m / 128Mi / 64Mi ephemeral, limit 512Mi / 256Mi ephemeral (Azure had 0.25 CPU / 0.5Gi) |
| Gateway | listeners `https-flowdent-web` (index 7, `flowdent.net`) and `https-flowdent-web-www` (index 8, `www.flowdent.net`) on `zeta-public-gateway`, **each with its own cert-manager Certificate** via the existing Cloudflare DNS-01 solver |
| Routes | one HTTPS route per name + one `:80` route that only 301-redirects |
| Pull credential | GitLab **group** deploy token `cluster-pull-web` (`read_registry`), as Secret `flowdent-registry` in `flowdent-web` (not in git). The existing `flowdent-registry` token is scoped to the fd-core project and got `insufficient_scope` on the fd-webclient path -- measured, then fixed with a group-scoped token |

Resource cost: 100m CPU / 256Mi memory *requested* in total.

### Proof it is the same site

Local read-only container run of the pushed image vs. the live Azure site, ten paths (`/`, `/pricing`,
`/robots.txt`, `/sitemap.xml`, `/logo.png`, ...): **status and body md5 identical on all ten**. Then
through the cluster Gateway (`curl --resolve flowdent.net:443:192.168.1.240` and `www.`): the same four
paths returned the same md5s over a valid Let's Encrypt certificate (`CN=flowdent.net`, issued ~90 s after
the listener appeared). Certificates `flowdent-web-tls` and `flowdent-web-www-tls` were `Ready` 95 s after
the listeners existed.

### Cutover and what the 525 was

**The apex `525` was Azure's, and it was a certificate that never existed.** Evidence:

- `az containerapp show`: custom domain `flowdent.net` has `bindingType: Disabled` (no certificate bound);
  `www.flowdent.net` has `SniEnabled` with a managed certificate.
- `az containerapp env certificate list`: `mc-flowdent-envir-flowdent-net-7580` (the apex) is in state
  **`Failed`**; the other three are `Succeeded`. Why it failed is inferred, not observed: Azure validates an
  apex managed certificate against an A record to the environment IP, and that record was Cloudflare-**proxied**.
- `curl --resolve flowdent.net:443:48.223.241.141`: *Connection reset* during the TLS handshake (no cert
  for that SNI), while `www.flowdent.net` against the same IP returned 200. Cloudflare reports a failed
  origin handshake as `525`.

So the apex has been down on Azure since its certificate failed; moving it could not make it worse.

Cloudflare changes (zone `flowdent.net`; both records stay **proxied**; the origin is the router's public IP,
which forwards `:443` to the node):

| Record | Before (rollback value) | After |
| --- | --- | --- |
| `A flowdent.net` | `48.223.241.141` proxied, ttl auto | `66.10.240.234` proxied, ttl auto |
| `www.flowdent.net` | `CNAME flowdent-webapp.graycliff-20a1aa77.eastus.azurecontainerapps.io` proxied | `A 66.10.240.234` proxied |

Order: apex first (already broken), verified from outside, then `www`. Cloudflare's SSL mode could not be
read (the DNS token lacks Zone Settings); it is Full or Full (strict), because Azure's `allowInsecure: false`
redirect would loop under Flexible -- and a valid public certificate satisfies both.

### Verification from outside (check-host.net HTTP, 20 probes x several rounds)

| Target | Result |
| --- | --- |
| apex after cutover | 77 / 80 probes `200`; the 3 failures were `520` x2 and one probe error |
| `www` after cutover | 54 / 60 probes `200`; failures `520` / `525` from a few Asia-Pacific probes |
| `www` while still on Azure (baseline) | 68 returned, 0 failed (12 still pending) |
| `api.flowdent.net/health` (DNS-only, same origin path) | 74 / 80 and 9-10 / 10 in single rounds |
| raw TCP to `66.10.240.234:443` | 18-19 of 20 probes connect; one Russian probe never does |

**Honest finding: there is a measurable intermittent failure from some Cloudflare edges to this origin
(roughly 4-10% of cold probes), at a rate comparable to every other public name served from the same
residential origin, and visible only as `520`/`525` because Cloudflare reports the origin leg.** It is not
specific to the website: the node's own counters are clean (`TcpExtListenOverflows 0`,
`ListenDrops 18`), the cause is upstream of the node (the consumer router / path), and Azure's datacentre
origin did not have it. The structural fix is a Cloudflare Tunnel (`cloudflared` dialling *out* from the
cluster, as `studio.flowdent.net` already does), which removes the inbound port-forward from the path --
it needs a tunnel credential this work does not hold, so it is recorded here and **not done**.

After the cutover the Azure web app's `Requests` metric fell to ~0 (bursts at 00:23-00:32 UTC were my own
pre-switch probes of `www`; one request at 00:38).

### Bring-up and rollback

```bash
# 1. the pull Secret (never in git): a group deploy token with read_registry on registry.flowdent.net
kubectl create ns flowdent-web   # or let the Application's CreateNamespace do it
# create Secret flowdent-registry (type kubernetes.io/dockerconfigjson) in flowdent-web
# 2. opt in, once
kubectl apply -f full-ai-cluster/k8s/flowdent-web/Application.yaml
# 3. on a node whose platform-public-tls Application was rendered before this change, append listeners 7 and 8
#    (a node rebuild re-renders them from argocd-application.yaml.in): see "Gateway listeners on the live node"
```

Rollback (website only), in this order:

1. Cloudflare: `A flowdent.net` back to `48.223.241.141` (proxied). Note it returns `525` again.
2. Cloudflare: delete `A www.flowdent.net`, recreate `CNAME www.flowdent.net` ->
   `flowdent-webapp.graycliff-20a1aa77.eastus.azurecontainerapps.io` (proxied). Valid only while the Azure
   web app and its managed certificate still exist.
3. The in-cluster site can stay up; it receives no traffic. The values are also in the session scratchpad
   as `dns-rollback-web.json`.

### Gateway listeners on the live node

`platform-public-tls` on this node is created by a k3s addon from a NixOS-rendered template, so a live
change is an appended inline patch (exactly as for the api listeners):

```json
{"op":"add","path":"/spec/source/kustomize/patches/-","value":{
  "target":{"group":"gateway.networking.k8s.io","kind":"Gateway","name":"zeta-public-gateway"},
  "patch":"[{\"op\":\"add\",\"path\":\"/spec/listeners/7/hostname\",\"value\":\"flowdent.net\"},{\"op\":\"add\",\"path\":\"/spec/listeners/8/hostname\",\"value\":\"www.flowdent.net\"}]"}}
```

It was applied together with `targetRevision: feat/azure-exit` so the listeners and the patch arrived in
one render; after the PR merged, `targetRevision` was set back to `main`. Applying the patch *before* the
base has listeners 7 and 8 is a render error (nothing changes); applying the base *before* the patch would
briefly put two hostname-less `:443` listeners on the Gateway, which Gateway API marks `Conflicted`.

**Cost to other installs, stated:** an install with a public domain now also gets an apex listener and a
Certificate for the bare domain. Like the api listeners, it costs only that name when DNS does not point
at the cluster.

## D. The registry `flowdentacr`

`Basic` SKU, admin user enabled, anonymous pull off, created 2025-08-18. **6.26 GB, 235 tags in 3
repositories.** No webhooks, no tasks, no tokens, no scope maps beyond the built-in, no connected
registries, no cache rules, no replication.

| Repository | Tags | Newest | Used by | In `registry.flowdent.net` |
| --- | --- | --- | --- | --- |
| `flowdent-webapp` | 115 | `672c0d13` = what was serving; `06a4d160` = `latest` = the Failed Blazor build | the web app (revisions `--0000113`, `--0000115`) | **`flowdent/fd-webclient/flowdent-webapp:672c0d13afa2`** (+ full sha), digest `sha256:eb977e99...` identical |
| `flowdent-services` | 119 | `06a4d160` | the two API apps (`flowdent-api`, `flowdent-api-staging`) | `flowdent/fd-core/azure-archive/flowdent-services:06a4d160b6fe`, digest `sha256:8e84c3af...` identical -- the last image Azure ran in production, kept as evidence, not as a rollback path |
| `flowdent-api` | 1 (`staging-9242a07`, 2026-05-19) | -- | nothing | not copied |

Not copied, on purpose: the other ~230 tags are historical builds of source that exists in git (the fd-core
`06a4d160` and fd-webclient `672c0d13` commits are both in GitLab). The cluster builds its own API image from
GitLab CI (`registry.flowdent.net/flowdent/fd-core:<sha>`); nothing in the cluster references
`azurecr.io` (scan below).

**What you lose by deleting `flowdentacr`:** the 235 historical image tags and nothing else -- no
tasks, webhooks, tokens or pipelines hang off it. The GitHub workflows that push to it
(`deploy-to-container-apps.yml`, `promote-to-prod.yml`, `azure-container-app-deploy.yml`) would fail, and
they target apps that are being deleted.

## E. Dependency table -- what remains on Azure, what uses it, and whether it is safe to delete

Scan behind the "nothing still uses it" claims -- every ConfigMap, Deployment, StatefulSet, DaemonSet,
CronJob, Job and **every key of every Secret** in the cluster, searched for Azure hostnames
(`azurecr.io`, `azurecontainerapps.io`, `database.windows.net`, `openai.azure.com`,
`cognitiveservices.azure.com`, `blob.core.windows.net`, `z13.web.core`, `applicationinsights`):

| Where | Match |
| --- | --- |
| `flowdent-api-secrets` (prod and staging) `DataProtection__AzureBlobConnectionString` | `blob.core.windows.net` -> `fddiagbundlesprod` (**kept**) |
| `flowdent-api-secrets` (prod and staging) `Diagnostics__BundleStore__AzureBlobConnectionString` | `blob.core.windows.net` -> `fddiagbundlesprod` (**kept**) |
| `flowdent-api-secrets` (prod and staging) `AzureOpenAI__Endpoint` | `cognitiveservices.azure.com` -> the AI account (deleted) |
| ArgoCD `argocd-ssh-known-hosts-cm` | `ssh.dev.azure.com` host key (Azure DevOps); a stock ArgoCD entry, not a dependency |
| anything else | **none** -- no `azurecr.io`, `azurecontainerapps.io`, `database.windows.net` anywhere |

GitLab CI variables (all 9 projects + the group): none contains an Azure credential
(`FLOWDENT_DEPLOYER_TOKEN`, `FLOWDENT_PULL_*`, `REGISTRY_INSECURE` only). Cloudflare: no remaining record
points at an Azure host (`asuid.flowdent.net` is an Azure *verification* TXT, see below). Azure side: no
CDN profile, no DNS zone, no action group, no metric alert, no diagnostic setting on either storage account
(`az monitor diagnostic-settings list` empty), no resource lock, no private endpoint.

| Azure resource | Used by (evidence) | Safe to delete? | After deleting |
| --- | --- | --- | --- |
| Container App `flowdent-webapp` | was `flowdent.net`/`www`; **no longer**: DNS points at the cluster, `Requests` metric ~0 since the cutover | **yes**, once you are satisfied with the cluster site | frees a 0.25-CPU always-on replica (the largest remaining Container Apps cost) |
| Container Apps `flowdent-api`, `flowdent-api-staging` | nothing: `api*.flowdent.net` are A records to the cluster | **already deleted by the lead** (2026-10-03: `az containerapp list` shows only `flowdent-webapp`) | the archived image is in `registry.flowdent.net` |
| Managed certificates `mc-...-api-flowdent-net-8816`, `-api-staging-...-7697`, `-www-flowdent-net-0045`, `-flowdent-net-7580` (Failed) | only the custom-domain bindings of the three apps | **yes**, after the apps | none; deleting the app unbinds first |
| Managed environment `flowdent-environment` (`eastus`, Consumption, **no VNet**, static IP `48.223.241.141`) | hosts only those three apps | **yes**, after the apps (Azure refuses while apps exist) | releases the static IP. **Does not affect either storage account** (below) |
| Log Analytics `workspace-flowdentcontainerapprgZIrZ` (PerGB2018, 30-day retention) | only the environment's `appLogsConfiguration` (destination `log-analytics`); no diagnostic setting anywhere points at it | **yes**, after the environment | old container logs are gone; none are needed (the cluster logs to Loki) |
| ACR `flowdentacr` | pulled by the three apps; pushed by GitHub workflows (service principal `AcrPush`) | **yes**, after the apps | section D |
| Storage `fddiagbundlesprod` (`flowdent-containerapp-rg`) | **API prod+staging, via two connection strings** | **NO -- kept by decision** | holds the DataProtection key ring that decrypts the 84 stored Plaid tokens |
| Storage `flowdent863701` (`flowdent-installers-rg`) | **installed clients and the release pipeline** | **NO -- kept by decision** | see below |
| Azure SQL `flowdent` / `FlowdentService` | cluster uses Postgres | **already deleted by the lead** (`az sql server list` is empty) | rollback to Azure SQL no longer exists |
| AI account `flowdent-ai` (+ project `fd_agents`, 3 deployments) | `AzureOpenAI__Endpoint` in the cluster Secrets | **already deleted by the lead** (accounts are soft-deleted; purge to free the name) | the metered model proxy (`/api/AzureOpenAIProxy/*`, which expects Azure-style `/openai/deployments/{name}/...` routes, so a local model server needs an adapter) and background defect description stay broken until a replacement exists |
| Entra service principals with role assignments (GitHub deploy SPs: `Contributor` / `AcrPush` on `flowdent-containerapp-rg` and `flowdent-installers-rg`; one `Storage Blob Data Contributor` on installers) | the GitHub release workflows | delete the ones scoped to `flowdent-containerapp-rg` after the ACR; **keep** the installers ones while releases are still published to `flowdent863701` | -- |
| Cloudflare TXT `asuid.flowdent.net` | Azure custom-domain verification for the apex | removable after `flowdent-webapp` is deleted | none |

### Safe deletion order (not run -- commands for the lead)

Delete **individual resources**; never the resource group `flowdent-containerapp-rg` while
`fddiagbundlesprod` is inside it.

```bash
export MSYS_NO_PATHCONV=1
RG=flowdent-containerapp-rg
# 0. take the safety copies you want first (SQL .bacpac, an offsite copy of keys.xml + the PFX).
# 1. the apps (webapp last, after you have looked at the cluster site)
az containerapp delete -g $RG -n flowdent-api-staging --yes
az containerapp delete -g $RG -n flowdent-api         --yes
az containerapp delete -g $RG -n flowdent-webapp      --yes
# 2. managed certificates (they only back the app bindings)
for c in $(az containerapp env certificate list -g $RG -n flowdent-environment --query '[].name' -o tsv); do
  az containerapp env certificate delete -g $RG -n flowdent-environment --certificate $c --yes
done
# 3. the environment, then its log workspace
az containerapp env delete -g $RG -n flowdent-environment --yes
az monitor log-analytics workspace delete -g $RG -n workspace-flowdentcontainerapprgZIrZ --yes --force true
# 4. the registry
az acr delete -g $RG -n flowdentacr --yes
# 5. Cloudflare: remove TXT asuid.flowdent.net
# NEVER:  az group delete -n flowdent-containerapp-rg      (contains fddiagbundlesprod)
#         az group delete -n flowdent-installers-rg        (contains flowdent863701)
```

### What the kept storage accounts mean (so nobody deletes them by accident)

- **`fddiagbundlesprod`** holds the ASP.NET DataProtection key ring for production
  (`dataprotection-prod/keys.xml`, 3.9 KB). The 84 stored Plaid access tokens are encrypted with keys in
  it, protected by a PFX that lives in cluster Secret `flowdent-api-secrets`. **Losing or replacing that
  blob makes those tokens unreadable.** Keep an offsite copy of `keys.xml` *and* the PFX.
- **`flowdent863701`**: installed clients hardcode `https://flowdent863701.blob.core.windows.net/releases`
  as the stable update source (`UpdateConfiguration.cs:19`, shipped `appsettings.json:156`, the web
  installer `installer/FlowDent-Web.iss:25`), poll `.../releases/latest.json`, will not follow redirects
  (`AllowAutoRedirect=false`), and only download from an allow-list that contains that host. Beta/alpha come
  from fd-core's `/api/v1/updates/access`, which returns an Azure SAS URL signed with the account key. The
  prod `UpdateAccess` store is `unconfigured-placeholder` (so beta/alpha are denied and clients fall back to
  stable), identically on Azure and on the cluster. **That account must stay until a new client release
  points elsewhere.** Neither account depends on the managed environment or the registry: no VNet rules,
  no private endpoints, no firewall rules (`defaultAction: Allow`), no managed identity.

## Known limits of this change

- The pod, the Gateway listeners and the certificates are proven on the live node; the `check-host`
  failure rate above is an *upstream path* measurement, not a fix.
- `NEXT_PUBLIC_API_URL` in the served bundle is `https://api-staging.flowdent.net` -- preserved, not changed.
- The image is a copy, not a rebuild. A rebuild from `flowdent/fd-webclient` (its `feat/gitlab-ci` MR) needs
  `NEXT_PUBLIC_API_URL` as a build argument (the Dockerfile fails without it by design, ADR-088); until it
  lands, update by pushing a new digest and changing the pin in `deployment.yaml`.
- Local `bun test src/Core.TypeScript/cluster` on Windows has pre-existing path-separator failures
  (`ENOENT ... '\D:\...'`, `...\Application.yam`); the new tests and the affected suites
  (`flowdent-platform`, `public-tls`, `public-tls-dns01`, `secret-reference-audit`) pass.
