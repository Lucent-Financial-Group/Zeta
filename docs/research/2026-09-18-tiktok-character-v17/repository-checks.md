# Repository checks for the v17 study

The claim was cut from refreshed origin/main before testing.
`local-checks.ts` reported 78 passed, 5 failed, 15 not applicable,
1 slow check not attempted and 13 could not run.

The failures were chart snapshot age (13 days), history-growth audit refusing
this shallow clone, a derived Twitch build invocation with no build script,
a Z3 proof invocation and the native cross-language build. The last two require
separate toolchain diagnosis; no successful proof/build result is inferred.
The system Git/Python shims also require an unaccepted Xcode license; Homebrew
executables were used without accepting the agreement on the user's behalf.

The pre-push quick gate rejected 51 dangling references at claim time. One was
the claim's future research path, now created; the other paths were outside this
change. The documented `ZETA_SKIP_PREFLIGHT=1` exception was used to publish the
coordination claim. This is not an all-green repository claim or a CI bypass.

Blender-specific saved-scene attachment, finite-coordinate and source-surface
checks are recorded separately in validation.json. Visual failures are recorded
in README.md even where those numerical checks pass.
