/// The ZetaFS path algebra: POSIX-shaped, host-independent, pure.
///
/// Every assertion here holds identically on every platform — that is the property being
/// tested. `System.IO.Path.Combine` could not satisfy one of these on Windows, which is
/// why these call sites moved off it (081M1N854ED087G0R002JP5V5N).
module Zeta.Tests.ZetaFsPathTests

open global.Xunit
open Zeta.Core

[<Fact>]
let ``join uses '/' on every host, which Path.Combine does not`` () =
    // The defect in one line. On Windows `Path.Combine("/store", "cas")` is `/store\cas`,
    // so the same file had two names depending on where the code ran.
    Assert.Equal<string>("/store/cas", ZetaFsPath.combine2 "/store" "cas")
    Assert.Equal<string>("/store/objects/ab/cd", ZetaFsPath.combine4 "/store" "objects" "ab" "cd")
    Assert.DoesNotContain("\\", ZetaFsPath.combine3 "/store" "log" "freeze")

[<Fact>]
let ``a leading slash is preserved, because it is absolute-vs-relative`` () =
    // Trimming it would silently reparent every store — an absolute ZetaFS path and a
    // relative one are different locations, not different spellings.
    Assert.Equal<string>("/a/b", ZetaFsPath.combine2 "/a" "b")
    Assert.Equal<string>("a/b", ZetaFsPath.combine2 "a" "b")

[<Fact>]
let ``separators collapse at the seams, so one file never gets two names`` () =
    // `/a//b` and `/a/b` name the same file to POSIX and are different DICTIONARY KEYS to
    // `InMemoryFileSystem`. Collapsing here is what stops that divergence being
    // reintroduced by a segment that already carries a slash.
    Assert.Equal<string>("/a/b", ZetaFsPath.combine2 "/a/" "b")
    Assert.Equal<string>("/a/b", ZetaFsPath.combine2 "/a" "/b")
    Assert.Equal<string>("/a/b", ZetaFsPath.combine2 "/a/" "/b/")
    Assert.Equal<string>("/a/b/c", ZetaFsPath.join [ "/a/"; "/b/"; "/c" ])

[<Fact>]
let ``empty segments are dropped rather than producing a doubled separator`` () =
    Assert.Equal<string>("/a/b", ZetaFsPath.join [ "/a"; ""; "b" ])
    Assert.Equal<string>("", ZetaFsPath.join [])
    Assert.Equal<string>("", ZetaFsPath.join [ ""; "" ])

[<Fact>]
let ``join is associative over its segments`` () =
    // The property that lets a caller build a path in pieces without the result depending
    // on WHERE it split — the same order-independence discipline as everything else here.
    let direct = ZetaFsPath.join [ "/store"; "objects"; "ab"; "cd" ]
    let leftFirst = ZetaFsPath.combine2 (ZetaFsPath.combine3 "/store" "objects" "ab") "cd"
    let rightFirst = ZetaFsPath.combine2 "/store" (ZetaFsPath.combine3 "objects" "ab" "cd")
    Assert.Equal<string>(direct, leftFirst)
    Assert.Equal<string>(direct, rightFirst)

[<Fact>]
let ``directoryName splits on '/' and distinguishes the root from a bare name`` () =
    Assert.Equal<string>("/store/objects", ZetaFsPath.directoryName "/store/objects/ab")
    Assert.Equal<string>("/", ZetaFsPath.directoryName "/a")
    Assert.Equal<string>("", ZetaFsPath.directoryName "a")
    Assert.Equal<string>("", ZetaFsPath.directoryName "")
    // A trailing slash names the same directory, so it must yield the same parent.
    Assert.Equal<string>("/store", ZetaFsPath.directoryName "/store/objects/")

[<Fact>]
let ``directoryName then join round-trips a path built by join`` () =
    // Closes the loop between the two functions: whatever `join` produces, `directoryName`
    // must be able to take apart. A pair that disagreed would put a file in one place and
    // create its parent directory in another.
    let full = ZetaFsPath.combine3 "/store" "objects" "ab"
    Assert.Equal<string>(full, ZetaFsPath.combine2 (ZetaFsPath.directoryName full) "ab")

[<Fact>]
let ``a backslash is an ordinary character here, never a separator`` () =
    // The inverse of the Windows defect. This algebra is the ZetaFS namespace's own, so a
    // `\` in a name is data — treating it as a separator would merge two different files,
    // which is the mistake that the platform-conditional fix in `InMemoryFileSystem`
    // exists to avoid making unconditionally.
    Assert.Equal<string>("/store/a\\b", ZetaFsPath.combine2 "/store" "a\\b")
    Assert.Equal<string>("/store", ZetaFsPath.directoryName "/store/a\\b")
