module Zeta.Tests.Limit.LimitTests

open System
open Xunit
open Zeta.Core


let private mustOk result =
    match result with
    | Ok value -> value
    | Error error -> failwithf "expected Ok, got %A" error


let private assertError (expected: LimitValidationError) result =
    match result with
    | Error actual -> Assert.Equal<LimitValidationError>(expected, actual)
    | Ok value -> failwithf "expected Error %A, got Ok %A" expected value


[<Fact>]
let ``default Limit boundary is deny all`` () =
    let operation = mustOk (LimitOperation.tryCreate "send-message")
    let boundary = LimitBoundary.defaultLimit

    Assert.Equal(PermissionState.Deny, boundary.Default)
    Assert.True(boundary.ExplicitGrants.IsEmpty)
    Assert.Equal(PermissionState.Deny, LimitBoundary.checkOperation operation boundary)


[<Fact>]
let ``blank operation is malformed and cannot become an allow`` () =
    assertError LimitValidationError.BlankOperation (LimitOperation.tryCreate "   ")

    let operation = mustOk (LimitOperation.tryCreate "read-ledger")
    Assert.Equal(
        PermissionState.Deny,
        LimitBoundary.checkOperation operation LimitBoundary.defaultLimit)


[<Fact>]
let ``blank grant evidence is rejected and leaves boundary denied`` () =
    let operation = mustOk (LimitOperation.tryCreate "open-actuator")

    assertError
        LimitValidationError.BlankGrantId
        (LimitBoundary.tryWithGrant operation "" DateTimeOffset.UnixEpoch LimitBoundary.defaultLimit)

    Assert.Equal(
        PermissionState.Deny,
        LimitBoundary.checkOperation operation LimitBoundary.defaultLimit)


[<Fact>]
let ``grant for another operation does not allow this operation`` () =
    let readOperation = mustOk (LimitOperation.tryCreate "read-ledger")
    let writeOperation = mustOk (LimitOperation.tryCreate "write-ledger")

    let boundary =
        LimitBoundary.tryWithGrant readOperation "grant-read-ledger" DateTimeOffset.UnixEpoch LimitBoundary.defaultLimit
        |> mustOk

    Assert.Equal(PermissionState.Allow, LimitBoundary.checkOperation readOperation boundary)
    Assert.Equal(PermissionState.Deny, LimitBoundary.checkOperation writeOperation boundary)


[<Fact>]
let ``valid explicit grant allows matching operation`` () =
    let operation = mustOk (LimitOperation.tryCreate "publish-event")

    let boundary =
        LimitBoundary.tryWithGrant operation "grant-publish-event" DateTimeOffset.UnixEpoch LimitBoundary.defaultLimit
        |> mustOk

    Assert.Equal(PermissionState.Allow, LimitBoundary.checkOperation operation boundary)
    Assert.Single(boundary.ExplicitGrants) |> ignore
