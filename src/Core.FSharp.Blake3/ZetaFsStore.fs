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

    /// Create `.zetafs` under `parentDir` (idempotent). No git repo required.
    let init (parentDir: string) : string =
        let dir = Path.Combine(Path.GetFullPath parentDir, DirName)
        Directory.CreateDirectory dir |> ignore
        Directory.CreateDirectory(Path.Combine(dir, "objects")) |> ignore
        Directory.CreateDirectory(Path.Combine(dir, "refs", "heads")) |> ignore
        let head = Path.Combine(dir, "HEAD")
        if not (File.Exists head) then
            File.WriteAllText(head, "ref: refs/heads/main")
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
