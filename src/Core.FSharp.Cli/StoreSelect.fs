module Zeta.Cli.StoreSelect

open System.IO
open LibGit2Sharp
open Zeta.Core
open Zeta.Core.FSharp.Blake3
open Zeta.Core.FSharp.Git

/// Open a DvKey log. Prefers `.zetafs` (no LibGit2Sharp). Git is the
/// v1 fallback when no ZetaFS store is in the walk.
let dvCodec () = CborEntryCodec<DvKey>(DvKey.value, DvKey.ofValue)

let tryZetaFs (cwd: string) : IRefDeltaLog<DvKey> option =
    match ZetaFsStore.discover cwd with
    | Some dir -> Some(ZetaFsStore.deltaLog dir (dvCodec ()) :> IRefDeltaLog<DvKey>)
    | None -> None

let tryGit (cwd: string) : (IRefDeltaLog<DvKey> * Repository) option =
    match Repository.Discover cwd with
    | null -> None
    | repoPath ->
        let repo = new Repository(repoPath)
        let credSource = EnvTokenCredentialSource() :> CredentialSource
        let log = GitDeltaLog<DvKey>(repo, dvCodec (), credSource = credSource)
        Some(log :> IRefDeltaLog<DvKey>, repo)

let init (cwd: string) : string = ZetaFsStore.init cwd
