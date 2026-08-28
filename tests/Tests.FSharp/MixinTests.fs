namespace Zeta.Tests

open Xunit
open System
open System.Runtime.CompilerServices
open Zeta.Core
open Zeta.Core.CSharp

type DummyKey(name: string) =
    member _.Name = name

type DummyValue(value: int) =
    member _.Value = value

type MixinTests() =

    [<Fact>]
    member _.``F# WeakMap basic set get delete operations`` () =
        let map = Zeta.Core.WeakMap<DummyKey, DummyValue>()
        let key1 = DummyKey("k1")
        let key2 = DummyKey("k2")
        let val1 = DummyValue(100)
        let val2 = DummyValue(200)

        // Set
        map.Set(key1, val1)
        map.Set(key2, val2)

        // TryGet
        Assert.Equal(Some val1, map.TryGet(key1))
        Assert.Equal(Some val2, map.TryGet(key2))

        // Get with factory
        let val3 = map.Get(key1, fun _ -> DummyValue(300))
        Assert.Equal(100, val3.Value) // Returns existing

        let key3 = DummyKey("k3")
        let val4 = map.Get(key3, fun _ -> DummyValue(400))
        Assert.Equal(400, val4.Value) // Invokes factory

        // Delete
        Assert.True(map.Delete(key1))
        Assert.Equal(None, map.TryGet(key1))
        Assert.False(map.Delete(key1)) // Already deleted

    [<Fact>]
    member _.``C# WeakMap basic set get delete operations`` () =
        let map = Zeta.Core.CSharp.WeakMap<DummyKey, DummyValue>()
        let key1 = DummyKey("k1")
        let key2 = DummyKey("k2")
        let val1 = DummyValue(100)
        let val2 = DummyValue(200)

        // Set
        map.Set(key1, val1)
        map.Set(key2, val2)

        // TryGet
        let (found, outVal) = map.TryGet(key1)
        Assert.True(found)
        Assert.Equal(val1, outVal)

        // Get with factory
        let val3 = map.Get(key1, fun _ -> DummyValue(300))
        Assert.Equal(100, val3.Value)

        let key3 = DummyKey("k3")
        let val4 = map.Get(key3, fun _ -> DummyValue(400))
        Assert.Equal(400, val4.Value)

        // Delete
        Assert.True(map.Delete(key1))
        let (foundAfterDelete, _) = map.TryGet(key1)
        Assert.False(foundAfterDelete)

    // Helper method marked with NoInlining to prevent key references from being held on the stack
    [<MethodImpl(MethodImplOptions.NoInlining)>]
    static member private RunGCScenario(map: Zeta.Core.WeakMap<DummyKey, DummyValue>) =
        let key = DummyKey("collectible")
        let value = DummyValue(999)
        map.Set(key, value)
        let weakRef = WeakReference(key)
        // THE PRECONDITIONS BELONG HERE, NOT IN THE CALLER.
        //
        // `key` is reachable from this frame, so its liveness is GUARANTEED at this point.
        // The caller used to assert `weakRef.IsAlive` after this method returned, where the
        // key is unreachable and liveness is guaranteed by nothing — that assertion was
        // really asserting THE GC HAS NOT RUN YET, which no runtime promises. It duly failed
        // on `ubuntu-24.04-arm` (2026-08-28, e42dcac8f6, MixinTests.fs:91) when a background
        // GC collected the key before the test's own explicit `GC.Collect()`, and it had been
        // seen failing locally the same day. A test that passes only while the GC is idle is
        // measuring the runner's load, not the WeakMap.
        //
        // They are preconditions, not decoration: without them `Assert.False(weakRef.IsAlive)`
        // below passes trivially if the key was never stored or the weak reference never
        // observed a live object. That anti-vacuity role is why they are kept and moved
        // rather than deleted.
        Assert.True(weakRef.IsAlive, "precondition: the weak reference must observe a live key")
        Assert.True((map.TryGet key).IsSome, "precondition: the map must actually hold the key while it is alive")
        // Keeps `key` provably reachable across both assertions above.
        GC.KeepAlive key
        (weakRef, value)

    [<Fact>]
    member _.``F# WeakMap elements are garbage collected when key has no strong references`` () =
        let map = Zeta.Core.WeakMap<DummyKey, DummyValue>()
        // Preconditions are asserted inside the scenario, where liveness is guaranteed.
        let (weakRef, value) = MixinTests.RunGCScenario(map)

        // Trigger garbage collection
        GC.Collect()
        GC.WaitForPendingFinalizers()
        GC.Collect()

        // THE PROPERTY UNDER TEST: the map's key reference is weak, so a key with no strong
        // references outside the map does not survive collection. This direction is the sound
        // one — after an explicit blocking `GC.Collect()` an unreachable object IS collected.
        Assert.False(weakRef.IsAlive)
        // `value` is held to the end so the VALUE never becomes unreachable during the test:
        // the claim is about the KEY being weakly held, and a collected value would make the
        // result ambiguous about which reference was weak.
        GC.KeepAlive value
