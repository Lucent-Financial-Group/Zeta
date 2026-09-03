module Zeta.Tests.Support.ZetaFsAmbientFileSystemCollection

open global.Xunit

/// Tests that replace `FileSystem.Current` must not overlap another test
/// collection. `FileSystem` uses AsyncLocal rather than a process-wide field,
/// but asynchronous work inherits execution context and the tests deliberately
/// replace the provider while exercising storage transactions.
[<CollectionDefinition("ZetaFsAmbientFileSystem", DisableParallelization = true)>]
type ZetaFsAmbientFileSystemCollection () = class end
