/// Does the in-memory filesystem agree with the real one about WHEN TWO PATHS ARE THE
/// SAME FILE?
///
/// -- THE DEFECT THIS WAS WRITTEN FOR ------------------------------------------------
/// `InMemoryFileSystem` keys a `ConcurrentDictionary<string, byte[]>` on the path string,
/// and a dictionary is exact where a filesystem is not. On Windows BOTH `\` and `/` are
/// directory separators (`Path.DirectorySeparatorChar` = `\`,
/// `AltDirectorySeparatorChar` = `/`), so `/store/cas` and `/store\cas` name one file to
/// Win32 and named two entries here.
///
/// MEASURED on run 33831226282: `ZetaFsFreezeTests."Journaled freeze ContentId matches
/// the mutbuf snapshot, not a later pwrite"` asserted `Exists "/freeze-mem/cas"` while
/// `ZetaFsFreeze.fs:670` created that file with `Path.Combine(storeDir, "cas")` --
/// `/freeze-mem\cas` on Windows. It was the ONLY failing test on either Windows lane,
/// and those lanes were red in 35/59 (`windows-2025`) and 33/59 (`windows-11-arm`)
/// executions, holding `drift (loud)` red and #16533 out of merge.
///
/// A double that disagrees with the thing it doubles is worse than no double: the test
/// it breaks is testing the mock, not the code.
///
/// -- WHY THESE ASSERTIONS ARE PLATFORM-SPLIT AND NOT SKIPPED ------------------------
/// The obvious shape -- assert the fold, skip on Unix -- would leave the Unix runners
/// with a test that reports nothing, and this repository already treats a check that did
/// not run as the failure mode it most wants to avoid. So BOTH branches assert, and they
/// assert OPPOSITE things, because the correct behaviour genuinely is opposite:
///
///   Windows: `\` is a separator      -> the two spellings MUST be one entry
///   Unix:    `\` is a legal FILENAME -> the two spellings MUST be two entries
///
/// The Unix half is not filler. Folding `\` to `/` unconditionally would invent a
/// collision the real filesystem does not have, silently merging two different files --
/// a worse defect than the one being fixed, and this is what refuses it.
module Zeta.Tests.InMemoryFileSystemPathIdentityTests

open System.IO
open System.Text
open global.Xunit
open Zeta.Core

/// True where the platform treats `\` as a directory separator.
let private backslashIsSeparator = Path.DirectorySeparatorChar = '\\'

[<Fact>]
let ``two spellings of one path agree with the platform's own idea of file identity`` () =
    let fs = InMemoryFileSystem() :> IFileSystem
    let slash = "/store/cas"
    let backslash = "/store\\cas"

    use stream = fs.OpenWrite(backslash, false)
    let payload = Encoding.UTF8.GetBytes "block"
    stream.Write(payload, 0, payload.Length)
    stream.Flush()
    stream.Dispose()

    if backslashIsSeparator then
        // The regression. Win32 resolves both spellings to one file, so the double must
        // too -- otherwise production code using `Path.Combine` writes under one key and
        // any caller spelling the path with `/` cannot see it.
        Assert.True(
            fs.Exists slash,
            "on a platform where '\\' is a separator, '/store\\cas' and '/store/cas' are the same file"
        )
        Assert.Equal<byte[]>(payload, fs.ReadAllBytes slash)
    else
        // '\' is a legal filename character here, so these are genuinely two files and
        // folding them together would manufacture a collision the OS does not have.
        Assert.False(
            fs.Exists slash,
            "on a platform where '\\' is an ordinary filename character, these are two different files"
        )

[<Fact>]
let ``GetFiles normalises the PREFIX as well as the stored keys`` () =
    // Normalising one side only moves the defect rather than fixing it: entries keyed
    // through `Path.Combine` would stay invisible to a caller who spells the directory
    // with the other separator.
    let fs = InMemoryFileSystem() :> IFileSystem
    use stream = fs.OpenWrite("/store\\objects\\ab", false)
    stream.WriteByte 1uy
    stream.Flush()
    stream.Dispose()

    let found = fs.GetFiles("/store/objects", "*")
    if backslashIsSeparator then Assert.Single found |> ignore else Assert.Empty found

[<Fact>]
let ``normalizeKey is idempotent, so applying it twice is always safe`` () =
    // Relied on directly: `publish` and `existingBytes` normalise even though their
    // callers already have. That is deliberate -- requiring every call site to remember
    // is the include-list defect -- and it is only sound because of this property.
    for path in [ "/store/cas"; "/store\\cas"; "plain"; ""; "/a\\b/c\\d" ] do
        let once = InMemoryFileSystem.NormalizeKey path
        Assert.Equal<string>(once, InMemoryFileSystem.NormalizeKey once)
