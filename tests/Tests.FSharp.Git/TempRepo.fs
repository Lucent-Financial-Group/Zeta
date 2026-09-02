/// Deleting a git repository from .NET on Windows, done so it actually succeeds.
///
/// THE DEFECT THIS EXISTS FOR. Every fixture in this project does the same two things:
///
///     if Directory.Exists dir then Directory.Delete(dir, true)   // setup   — UNGUARDED
///     finally try Directory.Delete(dir, true) with _ -> ()       // teardown — SWALLOWED
///
/// `Directory.Delete(recursive = true)` cannot remove a git repository on Windows. Git writes
/// loose objects under `objects/xx/…` READ-ONLY (mode 444), and the Win32 delete refuses a
/// read-only file with `UnauthorizedAccessException`. So the teardown throws on every run, and
/// its `with _ -> ()` swallows it — the one place the failure could have been reported.
///
/// The directory names are a per-process counter (`saga-0001`, `ddl-0002`, …), not unique, so the
/// surviving directory is exactly the path the NEXT run picks. That run reaches the setup delete,
/// which is NOT guarded, and dies before the test body starts — attributing a stale-temp-directory
/// problem to whatever test happened to be first.
///
/// MEASURED (Windows 11, .NET 10.0.400, 2026-09-02): a clean temp directory gives 35/38 with 20
/// directories left behind; the next run gives 15/38; every run after that stays there until the
/// temp tree is cleared by hand. The suite passes at most ONCE per temp-directory lifetime, and
/// the first-run pass is what makes it look fine on a fresh machine and on CI, which starts clean
/// every time. Linux is unaffected: POSIX unlink needs write permission on the DIRECTORY, not on
/// the file, so read-only objects delete without complaint.
///
/// THE FIX IS TO CLEAR THE ATTRIBUTE, NOT TO CATCH THE ERROR. Catching harder would preserve the
/// leak; this removes it. Retries cover the unrelated Windows case where an indexer or scanner
/// holds a transient handle — bounded, and the last attempt is allowed to throw so a genuine
/// failure is still reported rather than swallowed a second time.
module Zeta.Tests.Git.TempRepo

open System.IO
open System.Threading

/// Clear `ReadOnly` on every file in the tree, so the delete below cannot be refused for it.
let private clearReadOnly (dir: string) =
    for path in Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories) do
        let attrs = File.GetAttributes path
        if attrs.HasFlag FileAttributes.ReadOnly then
            File.SetAttributes(path, attrs &&& ~~~FileAttributes.ReadOnly)

/// Recursively delete a directory that may contain a git repository. No-op when absent.
///
/// Safe in both positions the fixtures use it: as the setup guard (where the old unguarded call
/// was the proximate failure) and inside the teardown's `finally`.
let deleteRepoDir (dir: string) =
    if Directory.Exists dir then
        let attempts = 3
        let mutable remaining = attempts
        let mutable spent = false
        while not spent do
            remaining <- remaining - 1
            try
                clearReadOnly dir
                Directory.Delete(dir, true)
                spent <- true
            with _ when remaining > 0 ->
                // A transient handle (indexer, AV, a just-exited git). Give it up and retry;
                // the final attempt is deliberately left to throw.
                Thread.Sleep 50
