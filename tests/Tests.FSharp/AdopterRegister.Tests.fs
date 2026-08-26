namespace Zeta.Tests

open Xunit
open FsUnit.Xunit
open Zeta.Core

module AdopterRegisterTests =

    [<Fact>]
    let ``AdopterRegister - fold computes active net support properly`` () =
        let events = [
            AdopterRegister.Adopted "alice"
            AdopterRegister.Adopted "bob"
            AdopterRegister.Retracted "alice"
            AdopterRegister.Adopted "charlie"
        ]
        
        let reg = AdopterRegister.fold events
        let count = AdopterRegister.activeCount reg
        count |> should equal 2
        
        let active = AdopterRegister.activeAdopters reg
        active |> should contain "bob"
        active |> should contain "charlie"
        active |> should not' (contain "alice")
        
    [<Fact>]
    let ``AdopterRegister - Gate refuses license when N_eff threshold not met`` () =
        let events = [
            for i in 1..9 do
                yield AdopterRegister.Adopted $"user-{i}"
        ]
        let reg = AdopterRegister.fold events
        
        // n = 9, rho = 0.0 -> N_eff = 9.0
        // Required is 10.0
        AdopterRegister.isPromotionLicensed reg 0.0 |> should equal false

    [<Fact>]
    let ``AdopterRegister - Gate grants license when threshold met (independent)`` () =
        let events = [
            for i in 1..10 do
                yield AdopterRegister.Adopted $"user-{i}"
        ]
        let reg = AdopterRegister.fold events
        
        // n = 10, rho = 0.0 -> N_eff = 10.0
        // Required is 10.0
        AdopterRegister.isPromotionLicensed reg 0.0 |> should equal true
        
    [<Fact>]
    let ``AdopterRegister - Gate refuses license when correlation drops N_eff below threshold`` () =
        let events = [
            for i in 1..10 do
                yield AdopterRegister.Adopted $"user-{i}"
        ]
        let reg = AdopterRegister.fold events
        
        // n = 10, rho = 1.0 (clones) -> N_eff = 1.0
        AdopterRegister.isPromotionLicensed reg 1.0 |> should equal false
