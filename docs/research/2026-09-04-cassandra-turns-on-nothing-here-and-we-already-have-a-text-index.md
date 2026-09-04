# Cassandra turns on nothing here, and we already have a text index

*2026-09-04. Answers to four questions from the maintainer, each measured against the
pinned charts rather than against documentation. Where a claim needs a live check that
nobody has run, it says so.*

Aaron 2026-09-04:

> i've seen a few charts that can work with cassandra … can you see for any of our
> existing charts if cassandra would turn on new features [or] it's just one of n storage
> backends … also do we have some sort of search index somewhere like maybe in our
> observablity stack, do we have our own observablity stack setup including tracing,
> metrics, and logs? for application level searching and building our own search indexes
> do we need anything extra[?] and we are looking to stay on open source versions of
> things not ones we need to licese.

## 1. Cassandra: one chart offers it, and there it is strictly WORSE

Measured across every chart in the tree at its pinned version — the string `cassandra`
appears **zero** times in the values of `loki` 18.11.7, `tempo` 2.3.0 and
`mimir-distributed` 6.2.0. The modern Grafana stack is object-storage-native; the
Cassandra index/chunk backends those projects once had are gone.

**The only chart in this tree that can use Cassandra is `temporal`**, and it is 1-of-N
there in the weakest sense:

| Temporal store | backends |
| --- | --- |
| default (history, matching) | Cassandra, MySQL, PostgreSQL |
| **visibility** | SQL or Elasticsearch — **not Cassandra** |

This is not inferred. The Application's own header records it, checked at the tag:
Temporal 1.27.2 ships `schema/cassandra/` with exactly one subtree, `temporal/`, while
`schema/postgresql/v12/` carries **both** `temporal/` and `visibility/`. So choosing
Cassandra buys a new 3-node stateful service **and still leaves the visibility store
needing SQL or Elasticsearch** — two new services, not one.

And the direction of travel is against it: `temporal` 1.6.0 **drops the bundled cassandra
subchart entirely** (verified by unpacking both versions), so the bump we already want
for other reasons removes the option rather than modernising it.

### The horizontal-scale argument is real and does not discriminate here

Cassandra's masterless ring genuinely scales out better than a single-writer SQL box.
But the comparator in this tree is not a single-writer SQL box — it is **CockroachDB**,
which is already deployed, already runs 3 Raft members, and is also horizontally
scalable. So the axis Cassandra would win on is one we are already on.

What adding it would actually cost, against zero feature gain: a second stateful system,
a second operator, a second backup story (and we have
none yet— 081M1N0VTP0087G0R0034E7Y0G), and a second failure domain to
reason about on a single node.

**Verdict: no.** Not "not yet" — there is no feature behind the door.

## 2. Observability: yes, complete, and all of it OSI open source

| signal | what runs it | chart pin |
| --- | --- | --- |
| **metrics** | Prometheus (+ Alertmanager, Grafana) | `kube-prometheus-stack` 88.6.3 |
| **metrics, long-term** | Mimir | `mimir-distributed` 6.2.0 |
| **logs** | Loki | `loki` 18.11.7 |
| **traces** | Tempo | `tempo` 2.3.0 |
| **collection** | Alloy (OTel-compatible) | `alloy` 1.12.1 |

That is the full LGTM stack plus Prometheus. **Tracing, metrics and logs are all
present**, and Grafana is the single pane over all three.

### Licensing, since it was asked

Nothing here needs a licence purchased, and nothing here is under a
non-OSI "source-available" licence:

| component | licence | note |
| --- | --- | --- |
| Prometheus, Alertmanager, Alloy | Apache-2.0 | permissive |
| Grafana, Loki, Mimir, Tempo | **AGPLv3** | OSI-approved, free — but **copyleft over a network**: modify one and offer it as a service, and the modified source must be offered too. Running them unmodified, as we do, carries no obligation. |
| Weaviate | BSD-3-Clause | permissive |

The one to keep in view is AGPL: it is open source and costs nothing, and it is *not*
the same as Apache-2.0 if we ever fork Loki or Mimir into a product surface.

### One asymmetry worth knowing

`loki` and `mimir` are configured against **seaweedfs** (S3). `tempo` is configured
`backend: local` on a 20Gi **Longhorn** PVC. Traces do persist — the volume is real — so
this is not a data-loss defect. But it does mean traces alone do not share the
object-store retention and scale-out story the other two have, and a local-backend Tempo
does not fan out to multiple ingesters. Filed rather than changed.

## 3. Search: we already have a text index, and it is not in the observability stack

**The observability stack is the wrong place to look, by design.** Loki deliberately does
not build a full-text index — it indexes labels and brute-force greps the rest, which is
the whole reason it is cheap. Mimir and Tempo index metric and trace identifiers. None of
them is a general-purpose document index, and using them as one fights their design.

**Weaviate is.** The chart's own values describe a hybrid query surface —
*"Performs a hybrid search combining vector similarity and keyword matching (BM25) on a
collection"* — so the deployment already carries an inverted index with BM25 scoring
alongside the vector index, and hybrid search over both.

That answers "do we need anything extra" for most application-level search: **probably
not**. Weaviate gives keyword search, vector search, and the hybrid of the two in one
engine we already run.

**The honest limit:** this is read from the chart's values and from Weaviate's documented
feature set. **Nobody in this tree has run a BM25 query against a collection**, so the
capability is *declared and unexercised*. The check is small — create a collection, index
a handful of documents, run a keyword query and a hybrid query — and it should be run
before anyone plans on it.

### If a dedicated text engine is ever needed, the licence constraint decides it

| engine | licence | fit |
| --- | --- | --- |
| **OpenSearch** | **Apache-2.0** | the license-safe Elasticsearch fork; heavy but complete |
| **Quickwit** | Apache-2.0 | object-storage-native — would sit directly on seaweedfs; also a Jaeger/trace backend |
| **Zoekt** | Apache-2.0 | code search specifically; gitlab 10.3.1 already vendors `gitlab-zoekt` |
| Meilisearch | MIT | small, fast, document search |
| **Elasticsearch** | **SSPL / Elastic License** | **not OSI-approved.** This is exactly the class the maintainer's constraint excludes |
| Typesense | GPL-3.0 | copyleft |
| Manticore | GPL-2.0 | copyleft |

The trap here is specific and worth stating plainly: **Elasticsearch is the obvious name
and the wrong answer** under a no-licence constraint. It has not been OSI open source
since 2021 (SSPL, then dual ELv2/SSPL, and AGPL added in 2024 — AGPL being the only
OSI-approved of the three). OpenSearch is the Apache-2.0 fork that exists precisely
because of that change.

Note also that Temporal's *visibility* store takes "SQL **or Elasticsearch**" — so if that
path is ever taken, OpenSearch compatibility is the question to ask first, not
Elasticsearch availability.

## 4. What was measured, and what was not

| claim | status |
| --- | --- |
| Cassandra absent from loki/tempo/mimir values | **measured** — `helm show values` at each pin, zero hits |
| Temporal's Cassandra visibility gap | **measured** previously, at the tag, and recorded in the Application |
| temporal 1.6.0 drops the cassandra subchart | **measured** — both versions unpacked |
| the observability roster and pins | **measured** — read from the Applications |
| tempo on a local backend + Longhorn PVC | **measured** — read from the Application |
| Weaviate BM25 / hybrid | **read from the chart's values and upstream docs — NOT exercised here** |
| licences | from the projects' own published terms; not legal advice |
