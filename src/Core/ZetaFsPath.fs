namespace Zeta.Core

/// Path algebra for the ZetaFS namespace: POSIX-shaped, host-independent, pure.
///
/// -- WHY THIS EXISTS ---------------------------------------------------------------
/// The ZetaFS modules build every path they touch and then hand it to
/// `FileSystem.Current`, which is an ABSTRACTION -- it may be the host filesystem, and it
/// may be `InMemoryFileSystem`, and neither the module nor its caller can tell. They were
/// building those paths with `System.IO.Path.Combine`, which is a function of the HOST:
/// it joins with `\` on Windows and `/` everywhere else.
///
/// So the namespace of a filesystem that is supposed to be the substrate's own took its
/// shape from whichever machine happened to be running. That is ambient state in a
/// namespace (§13 noninterference), and it breaks the DST property that the same inputs
/// produce the same outputs regardless of host: a key written on Windows and a key
/// written on Linux were literally different strings for the same file.
///
/// MEASURED 2026-09-04, before the fix: 27 `Path.Combine` calls across five ZetaFs
/// modules, plus four `Path.GetDirectoryName`. The observable symptom was one test --
/// `ZetaFsFreezeTests."Journaled freeze ContentId matches the mutbuf snapshot"` asserted
/// `Exists "/freeze-mem/cas"` while the code created `/freeze-mem\cas` -- which held both
/// Windows lanes red in 35/59 and 33/59 executions (081M1N854ED087G0R002JP5V5N). That
/// test was fixed at the double; this module fixes it at the source.
///
/// -- WHY A `/`-JOIN IS ALSO CORRECT FOR REAL HOST PATHS -----------------------------
/// Win32 accepts BOTH separators: `Path.AltDirectorySeparatorChar` is `/` on Windows
/// precisely because the API treats it as one. So `C:\store` joined to `objects` as
/// `C:\store/objects` opens the same file as `C:\store\objects`. The join is therefore
/// safe for a real Windows path and REQUIRED for a virtual one -- there is no case where
/// `Path.Combine` is right and this is wrong.
///
/// -- WHY `directoryName` IS HERE RATHER THAN `Path.GetDirectoryName` ----------------
/// Not because that function is known to be wrong, but because its behaviour on a
/// `/`-shaped path under Windows is a thing this codebase would have to ASSUME. A pure
/// substring split on `/` needs no assumption and is testable identically on every
/// platform, which is worth more than reusing a framework call whose contract we would
/// be reading rather than checking.
module ZetaFsPath =

    /// The one separator in this namespace. Never `Path.DirectorySeparatorChar`.
    [<Literal>]
    let Separator = '/'

    /// Join path segments with `/`, collapsing separators at the seams.
    ///
    /// Empty segments are DROPPED rather than producing `//`. A doubled separator is not
    /// an error in POSIX -- `/a//b` and `/a/b` name the same file -- but they are
    /// different dictionary keys to `InMemoryFileSystem`, and this module exists to stop
    /// one file having two names.
    ///
    /// A LEADING `/` IS PRESERVED, because it is the difference between an absolute path
    /// in the ZetaFS namespace and a relative one. Trimming it would silently reparent
    /// every store.
    let join (segments: string seq) : string =
        let parts =
            segments
            |> Seq.filter (fun s -> not (System.String.IsNullOrEmpty s))
            |> Seq.toArray

        if parts.Length = 0 then
            ""
        else
            let head = parts.[0]
            let rooted = head.StartsWith("/", System.StringComparison.Ordinal)

            let cleaned =
                parts
                |> Array.map (fun p -> p.Trim('/'))
                |> Array.filter (fun p -> p.Length > 0)

            let body = System.String.Join(string Separator, cleaned)
            if rooted then string Separator + body else body

    /// `join` for the common two- and three-segment cases, so call sites read like the
    /// `Path.Combine` they replace.
    let combine2 (a: string) (b: string) : string = join [ a; b ]

    let combine3 (a: string) (b: string) (c: string) : string = join [ a; b; c ]

    let combine4 (a: string) (b: string) (c: string) (d: string) : string = join [ a; b; c; d ]

    /// The parent of a path, or `""` when there is none.
    ///
    /// Pure substring split on `/` -- see the module header for why this does not defer
    /// to `Path.GetDirectoryName`. `/a` yields `/` (the root is a real parent); `a`
    /// yields `""` (a bare name has none).
    let directoryName (path: string) : string =
        if System.String.IsNullOrEmpty path then
            ""
        else
            let trimmed = path.TrimEnd('/')

            match trimmed.LastIndexOf Separator with
            | -1 -> ""
            | 0 -> "/"
            | i -> trimmed.Substring(0, i)
