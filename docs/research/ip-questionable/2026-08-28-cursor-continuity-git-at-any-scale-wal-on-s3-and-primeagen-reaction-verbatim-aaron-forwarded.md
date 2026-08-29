# Cursor "Continuity" / Git at Any Scale — verbatim source material (Aaron-forwarded)

**Zeta claims no authorship and asserts no license over the content below.** Preserved for
research and study under the `docs/ip-questionable/` policy: third-party material lives in
its own file so a rights-holder concern is resolved by a single-file delete, never by
surgery through our analysis.

## Provenance

| | |
|---|---|
| **Blog post** | *Git at Any Scale* — https://cursor.com/blog/git-at-any-scale |
| **Author** | Vicent Martí (Cursor). Filed under: research. |
| **Video** | https://www.youtube.com/watch?v=AFQW-b2WaRU — a reaction/explainer walking through the same post |
| **Forwarded by** | Aaron, 2026-08-28 |
| **Why kept** | It describes, in production detail, the exact architectural question ZetaDB/ZetaFS answers differently. See the analysis doc (linked at the bottom), which stands on its own if this file is deleted. |

Rights are held by Cursor and by the video's creator respectively. Excerpted for study with
attribution; not redistribution, not a product surface.

---

## A. Blog post — *Git at Any Scale* (Vicent Martí, Cursor) — excerpts

### What's hard about Git

> The challenge in hosting Git repositories at scale is inherent in the design of Git
> itself: a distributed version control system means that all instances of a repository are
> identical. […] In a normal Git repository, your code and metadata (files, commits, trees)
> are compressed and stored in packfiles — a simple binary serialization format which is
> convenient to deal with on a local machine, but not ideal to manage at scale on a server.
> Packfiles are the fundamental building block of Git storage and Git networking. When you
> push or fetch data from a repository, it's transferred as a packfile.

> There are broadly three possible approaches […]: distribute the filesystem, distribute the
> packfiles, or distribute Git itself.

### Git without packfiles (why the KV-store approach fails)

> Git is a content-addressable data store. All objects in a Git repository (blobs, trees,
> commits, etc) are keyed by the SHA-1 of their contents. This is something that intuitively
> maps very well to a distributed key-value store […]. But this actually doesn't work.
>
> Here's the issue: the actual layout of a Git repository is a directed acyclic graph […].
> You can look up any object via its SHA, but to perform even the most trivial operation in
> the repo, you must actually walk the DAG step by step. […] Crucially, at every step of this
> walk, you don't know the value of the next pointer until you fetch the previous one. If
> every fetch requires a round trip to a distributed store, things become very expensive very
> fast.

> The most promising implementation was attempted by […] Shawn Pearce […] at Google. His
> approach was storing the objects in a distributed hash table. […] Although the system
> worked and results were good enough for normal Git operations, the limitations of the Git
> protocol […] made the `git clone` performance bad enough to discard the design altogether.

### GitHub and filesystems

> The team attempted many approaches to a distributed filesystem for Git data: […] NFS […]
> was quickly discarded. The default implementation of Git makes a lot of assumptions about
> filesystem semantics (locking, tearing, reading, syncing…) […]. It was slow, and it was
> buggy. […] A short-lived deployment with GFS. A longer-lived deployment based on DRBD. They
> all hit a wall.

> There is no correlation between the layout of objects in the DAG and the way they're placed
> in a packfile. […] Most objects are stored as a delta on top of another object in the same
> packfile. Reading an individual object, after following the many logical hops in the graph
> data structure, also involves following physical hops in the on-disk format.

### Spokes and consistency

> Spokes was originally developed at GitHub around 2013, and it has since become an industry
> standard. […] It doesn't distribute Git itself; it works at the packfile level. It stores
> all data as actual Git repositories on local NVMe disks. It replicates the Git data, but
> keeps all copies consistently in sync.

> This is something you find out the hard way, but the Git client really doesn't play well
> with eventual consistency. If your local Git client pushes a commit and then fails to read
> it immediately after a fetch, that's bad news. Git finds that very confusing.

> Spokes is a consensus-based distributed system. […] The "fan-out" is synchronized with a
> classic consensus algorithm called 3PC (three-phase commit) so that a push is only accepted
> if a majority of the nodes acknowledge it.

> A Git push has two components: a packfile and a reference transaction. […] a pushed commit
> is not visible ("reachable" in Git parlance) until the reference that points to it has been
> updated. This means we can implement consensus for our pushes by fanning out the packfiles
> to all hosts simultaneously (we don't need to synchronize here) and then doing three-phase
> commit with the reference transaction, which is much smaller and faster to synchronize.

> One flaw that has turned out to be critical is the constrained horizontal scalability of
> 3PC. […] the latency of every step is bound by the slowest of all the servers in the
> cluster. The more replicas you add to a cluster, the worse push throughput gets.

> This scalability constraint also applies the other way. When agents work with Git
> repositories at scale, they often operate outside of a monorepo by creating vast numbers of
> small repositories, many of them throwaway […]. Spokes struggles here because it still
> requires three replicas for every one of these repositories. […] With three-phase commit,
> the floor is always too high, and the ceiling too low.

> […] you have to treat repositories as pets, not cattle. […] A corrupted copy is as bad as a
> missing one. If two of the three copies are corrupt, the system can no longer accept
> pushes: there's no quorum.

### Continuity

> The core primitive behind it is a write-ahead log, which we store in S3-compatible object
> storage. […] When a repository receives a push, we store the push as a WAL entry in S3. We
> never acknowledge a push until it has been fully persisted. […] A push is only visible once
> we successfully prepare its reference transaction on a local copy of the repository and
> record a pointer to the WAL entry in the WAL index file […]. This forces all pushes to be
> linearizable.

> Where does every repository live? The answer is "anywhere". It doesn't matter! We treat
> repositories like a warm cache on disk, but the source of truth is always the write-ahead
> log in S3. The system is stateless, and there are no routing tables […]. In production, we
> use rendezvous hashing to map a repository ID to the list of nodes where we expect it to be.

> What about consensus? Elections? Which server is the primary for a given repository? It
> also doesn't matter! There's no state and no consensus here. Any server can be the primary.
> All updates to the write-ahead log are synchronized with an atomic compare-and-swap (CAS)
> operation on S3 […]. The system is designed to always be correct when degraded, and always
> fast when healthy.

> We perform optimistic replication by sending gossip UDP packets around our cluster. […]
> "UDP is not a reliable transport." Of course it isn't. Nothing is reliable in a distributed
> system! […] Each replica knows the ETag of the last version of the WAL index it's caught up
> with. When you perform a read operation on a replica, we do a conditional GET to S3 with
> the ETag we expect. A 304 response with no body […] means we're up to date […]. A 200
> response comes with the newest version of the WAL index, which we use to catch up before
> serving the read.

### Compaction

> Write-ahead logs require periodic compaction. You cannot let the log grow unbounded: a full
> restore replays every entry, so the more entries, the more expensive it becomes.

> Coincidentally, a normal Git repository also requires periodic compaction, even though Git
> is not based on a WAL. […] If you're looking for a specific object, and your repository has
> 100 packfiles, you'll need to open the index for each one of them […]. An efficient
> operation is not efficient if it must be performed hundreds or thousands of times.

> Here, we amortize the cost of compaction. Only the primary does compactions, and the result
> of the compaction applies to both the on-disk repository and the WAL. Since all replicas
> follow the WAL, they also follow the compaction events. Replicas don't repack; they simply
> download the already-compacted packs from S3, trading bandwidth for CPU.

### Scale (reported numbers)

> We have run synthetic stress tests with up to 100 replicas and seen consistent linear
> scaling for reads, without any regressions in push throughput.

> Using S3 Standard, we can sustain up to 120 pushes/s while compacting and replicating […].
> We have also deployed high-performance clusters on S3 Express One Zone […]. There, we can
> ingest more than 300 pushes/s, and we are effectively bottlenecked by the speed at which
> Git can compact the on-disk data.

### WAL as truth

> Azure DevOps […] has a very successful Git storage system that stores packfiles in blob
> storage and their references in a relational database (MS SQL Server). […] A relational
> database scales well with large reference transactions. But then you have to operate a
> relational database. We have a strong belief that the consistency of Git data is more
> important than any other consideration.

> Since every push is in the WAL, we can look at every state a repository has ever been in.
> We have full provenance data for all pushes, and also for all repacks. We can rewind and
> fast-forward every replica. […] When (not if) we hit a bug in Git, we can pinpoint exactly
> what happened and revert it.

---

## B. Video transcript — reaction/explainer (YouTube `AFQW-b2WaRU`)

Verbatim as forwarded, timestamps preserved. Rights held by the video's creator.

```
0:00  Hey, did you know that the very first Git commit was initial version of Git, the
      information manager from hell? Nice.
0:08  So, recently some news kind of got me thinking. Why is it so hard to host Git?
0:13  It kind of seems like any old Git could host Git. But based on the recent GitHub
      numbers, this actually looks really, really difficult. But why is it so hard?
0:22  Because like every single engineer that has come before me, I always go, "Oh, that
      problem, that doesn't sound that hard. I'm pretty sure I could do it."
0:29  Well, actually, to finally answer that question, Vincent right here did a write up, and
      he is a 10-year veteran at GitHub, now working at Cursor, and he breaks down why is it
      so hard to host Git.
0:46  And everybody seems to love this blog post. So, let's all learn together why it's so
      hard to host Git. And by the way, a little sneak preview for you. The reason why is uh
      because the way it is. It's really hard.
0:54  Quick disclosure, I have done many a live event for cursor. One in which I dressed up as
      a king and they do give me some free tokens, but this was not a paid ask of any kind.

      [sponsor segment omitted — not relevant]

2:04  An extremely brief explanation of how git works: every single commit which is
      represented by some sort of Shaw is actually just a pointer to a tree.
2:08  The tree is just a pointer to other trees at specific versions and other blobs. A tree
      is just literally a directory. Your root tree is just the root of your project. And a
      blob is just a file.
2:34  Each one of these things, a commit, a tree, a blob, they're called objects inside of
      git. And if you package them all together, it's called a pack file. It's like the
      minimum representation of all these different objects together.
2:48  There's no guarantee in order, but it's really good to understand that to find out what
      blob version is inside of a commit, you have to walk everything to figure it out.
3:04  And for a git server to actually work, the server itself has to communicate to clients
      using pack files. And clients communicate to a server using pack files.
3:27  Now there has been some attempt to not use pack files. One of them is using a kv store.
      […] every single one of the sub trees, every single one of the commits, every single
      one of the blobs, the tags, everything, they all have a unique Shaw. So you could
      imagine you could just have a key value store.
3:51  If you were to go and look up things about a commit, you'd have to go back and forth
      between the key value store many, many times. And as a repository grows, you could go
      thousands of times just to get the contents of a commit.
4:07  In fact, Google even tried this approach and tried to make it fast. But it turns out it
      just couldn't work out in the end and they ultimately abandoned it because git clone
      was entirely too slow.
4:31  Ideally, you want the repository to exist on many discs on many machines. That way, just
      one outage doesn't accidentally destroy a repository. Also, if you have a whole bunch
      of reads, you would like that to be really, really fast […] i.e. CI sucks.
5:06  But finally somebody cracked the code and that somebody was in fact GitHub. They created
      something called spokes. […] It works at the pack file level. It stores all the data as
      actual git repositories on local NVMe discs. It replicates git data but keeps all
      copies consistently in sync.
5:47  There will be a minimum of three machines that contain your repository. When you want to
      read, any network request can go to any one of these machines […] because they're all
      consistently kept in sync.
6:04  Which means for every repository that you actually have, it needs to have a routing
      table stored in a database that says, hey, here's where your three machines minimum are
      located.
6:16  But writes are a little bit different because the first thing that happens is we need to
      send up the actual pack files to each one of the replicas. After that we need to say
      hey can you actually store this? […] And that's the prepare stage. The next thing is
      called a lock stage. […] then after the lock request you do a commit. […] This is
      called a three-phase commit.
6:51  Now, there's something I didn't know about in distributed systems. It's called tail at
      scale problem.
7:23  The problem is that if you make five requests, you're probably going to have reasonably
      good performance on all five requests. But every single time you have to make more
      requests, there's a higher and higher chance you're going to have bad performance.
7:38  It's 1 minus the percentile to the amount of requests you're going to make.
7:46  So now we had to make four requests per node for a three-phase commit to happen. Which
      means if you had five nodes, that is 20 commits. That means you have an 18.2% chance to
      have a P99 slowness on one of those routes.
8:15  So let's just take the recent DeepSeek repository that became the fastest star repo of
      all time. It probably has like many many replicants. So that means it could potentially
      be doing 200 requests for a three-phase commit, which means that 86% of the time you're
      going to be hitting these really bad long request paths.
8:41  Reads super fast, writes super slow. So that's the problem with spokes.
9:06  Well, it seems like this is a reoccurring theme in the things I've seen. The answer, S3.
9:10  It uses something called a wall. […] What I am actually saying is a write ahead log. A
      write ahead log is simply just all the right operations that have happened. So, you can
      reconstruct git from that series of writes. Postgres uses this. SQLite uses this.
9:43  And for a server to come up and be able to go, okay, well, what's my git state? It just
      simply needs to read the right log and boom, that's its git state.
9:52  So does that mean there's no consensus? Yeah, there's no more consensus. We use S3.
      Well, which one's the primary node? It doesn't matter. Any node can serve it out.
10:05 Now, obviously, you don't just want to serve the same repository from random different
      nodes because that'd be super inefficient because each one would have to restore itself
      from the wall. So, they use something called rendezvous hashing.
10:21 Effectively, you give it like a unique string and it will give you out servers plus a
      score and whatever is the highest score is the server you take.
10:44 There's no more needing for kind of reconciliation between two different nodes to make
      sure everything keeps in sync. No longer need to vote, hey, can this right actually
      happen? You don't have to have consensus. You don't have to have a whole bunch of
      replicas laying around.
10:52 That means the 25 million repositories that are created every single month don't
      actually have to have three machines each. They could just have one. They could have
      zero. Nothing could exist because they don't need to exist because the actual state of
      the git repository is up on S3 and can be restored in a matter of milliseconds.
11:24 Also, I didn't even know there was something called compaction in git. It effectively
      takes a bunch of pack files, makes a big pack file. And with super duper fast NVMe
      storage and S3, they can do 16,000 commits per minute.
```

---

## Where the analysis lives

Our own reading of this — the ZetaDB / ZetaFS comparison, and specifically why Z-sets +
DBSP + materialized views are a *different* answer to the same problem than a write-ahead
log — is at
[`docs/research/2026-08-28-continuity-wal-vs-zetadb-dbsp-the-log-you-do-not-have-to-replay.md`](../2026-08-28-continuity-wal-vs-zetadb-dbsp-the-log-you-do-not-have-to-replay.md).

That document stands alone. If this file is deleted on request, nothing in the analysis
breaks — it cites claims and numbers, never depends on the verbatim text being present.
