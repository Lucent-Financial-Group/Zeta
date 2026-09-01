namespace Zeta.Core.FSharp.Blake3

open System
open System.IO
open Zeta.Core

/// Composition root for the tamper-evident ZetaFS store.
///
/// Core never takes the Blake3 NuGet (hexagonal — same isolation as
/// `Core.FSharp.Git` / LibGit2Sharp). `ContentHasher.defaultHasher` stays
/// XxHash128 for that reason. Callers that want the git-replacement hash
/// select this module; they do not omit the hasher and hope.
[<RequireQualifiedAccess>]
module ZetaFsStore =

    /// Directory name walked from cwd, same shape as `.git`.
    [<Literal>]
    let DirName = ".zetafs"

    /// Tamper-evident log. Selects the **own** spec hasher (`OwnBlake3Hasher`).
    /// The NuGet adapter is a test oracle, not this root.
    let deltaLog<'K when 'K: comparison> (dir: string) (codec: IEntryCodec<'K>) : ZetaFsDeltaLog<'K> =
        ZetaFsDeltaLog(dir, codec, OwnBlake3Hasher.hasher)

    let deltaLogWithEnv<'K when 'K: comparison>
        (dir: string)
        (codec: IEntryCodec<'K>)
        (env: ISimulationEnvironment)
        : ZetaFsDeltaLog<'K> =
        ZetaFsDeltaLog(dir, codec, hasher = OwnBlake3Hasher.hasher, env = env)

    /// Create `.zetafs` under `parentDir` (idempotent). No git repo required.
    /// New stores write FORMAT `zetafs/2` (`ns=git-trees; body=jumprope; hash=blake3-256`).
    /// A v1 store (HEAD present, no FORMAT) is left as v1 — no silent convert.
    let init (parentDir: string) : string =
        let fs = FileSystem.Current
        let dir = Path.Combine(Path.GetFullPath parentDir, DirName)
        fs.CreateDirectory dir
        fs.CreateDirectory(Path.Combine(dir, "objects"))
        fs.CreateDirectory(Path.Combine(dir, "refs", "heads"))
        fs.CreateDirectory(Path.Combine(dir, ZetaFsMutbuf.DirName))
        let head = Path.Combine(dir, "HEAD")
        let formatPath = Path.Combine(dir, ZetaFsFormat.FileName)
        let headExisted = fs.Exists head

        if not headExisted then
            FileSystemIo.writeAllText fs head "ref: refs/heads/main"

        if not (fs.Exists formatPath) && not headExisted then
            ZetaFsFormat.write fs dir ZetaFsFormat.pr6Default

        let rootPath = Path.Combine(dir, ZetaFsNamespace.RootFileName)

        if not (fs.Exists rootPath) && not headExisted then
            let ns =
                ZetaFsNamespace.create (ZetaFsNamespace.Entropy(fun () -> SystemEnvironment.Default.NextInt64()))
            FileSystemIo.writeAllText fs rootPath (ZetaFsNamespace.EntityId.format ns.Root)

        dir

    /// Walk `startDir` and parents for a `.zetafs` directory. Nearest wins.
    let discover (startDir: string) : string option =
        let mutable dir = Path.GetFullPath startDir
        let mutable found: string option = None
        let mutable go = true
        while go do
            let candidate = Path.Combine(dir, DirName)
            if Directory.Exists candidate then
                found <- Some candidate
                go <- false
            else
                let parent = Directory.GetParent dir
                if isNull parent then
                    go <- false
                else
                    let next = parent.FullName
                    if String.Equals(next, dir, StringComparison.Ordinal) then
                        go <- false
                    else
                        dir <- next
        found
