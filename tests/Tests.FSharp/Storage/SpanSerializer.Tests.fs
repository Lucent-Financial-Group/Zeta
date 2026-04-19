module Zeta.Tests.Storage.SpanSerializerTests
#nowarn "0893"

open System
open System.Buffers
open System.Buffers.Binary
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ═══════════════════════════════════════════════════════════════════
// SpanSerializer<'K> — Tier 1 raw-span serializer for blittable
// primitive 'K. Zero-copy by definition: the Z-set's backing array
// IS the wire payload. Requires 'K : unmanaged; same-host endian
// only per the docstring.
//
// Wire format: [4B count little-endian][count × sizeof(ZEntry<'K>)
// bytes]. Round-trip must preserve the full Z-set including negative
// weights (retraction-native invariant on the wire).
// ═══════════════════════════════════════════════════════════════════


let private freshWriter () : ArrayBufferWriter<byte> =
    ArrayBufferWriter<byte> ()


let private roundTrip (zset: ZSet<int64>) : ZSet<int64> =
    let ser = SpanSerializer<int64>() :> ISerializer<int64>
    let writer = freshWriter ()
    ser.Write(writer, zset)
    ser.Read(writer.WrittenSpan)


[<Fact>]
let ``empty Z-set round-trips to empty`` () =
    let result = roundTrip ZSet<int64>.Empty
    ZSet.isEmpty result |> should be True


[<Fact>]
let ``single-entry Z-set round-trips with positive weight`` () =
    let original = ZSet.ofSeq [ 42L, 1L ]
    let result = roundTrip original
    result.[42L] |> should equal 1L


[<Fact>]
let ``negative weights survive the round-trip (retraction-native)`` () =
    // Tier 1's raw-span path is a memcpy of ZEntry<int64> records;
    // the invariant is that int64 negative weights on the wire come
    // back unchanged. A serializer that silently clamped here would
    // break every DBSP operator that emits -Δ.
    let original = ZSet.ofSeq [ 1L, 3L ; 2L, -1L ; 3L, -5L ]
    let result = roundTrip original
    result.[1L] |> should equal 3L
    result.[2L] |> should equal -1L
    result.[3L] |> should equal -5L


[<Fact>]
let ``larger Z-set round-trips with all weights preserved`` () =
    let original =
        [ for i in 0 .. 99 ->
            let k = int64 i
            let w = if i % 3 = 0 then int64 (-i) - 1L else int64 i + 1L
            k, w ]
        |> ZSet.ofSeq
    let result = roundTrip original
    for i in 0 .. 99 do
        let k = int64 i
        let expected = if i % 3 = 0 then int64 (-i) - 1L else int64 i + 1L
        result.[k] |> should equal expected


[<Fact>]
let ``length-header prefix is 4 little-endian bytes encoding count`` () =
    // Wire-format smoke: the first 4 bytes of the written buffer are
    // a little-endian int32 whose value equals the entry *count*
    // (distinct from Arrow's total-payload length; Tier 1's count
    // multiplied by sizeof<ZEntry<int64>> is the payload length).
    let ser = SpanSerializer<int64>() :> ISerializer<int64>
    let writer = freshWriter ()
    ser.Write(writer, ZSet.ofSeq [ 7L, 1L ; 8L, -2L ])
    let bytes = writer.WrittenMemory.ToArray ()
    bytes.Length |> should be (greaterThan 4)
    let count =
        BinaryPrimitives.ReadInt32LittleEndian(ReadOnlySpan(bytes, 0, 4))
    count |> should equal 2


[<Fact>]
let ``wire size equals 4 + count times sizeof ZEntry`` () =
    // Zero-copy claim (docstring line 43): the Z-set's backing array
    // IS the wire payload. The total written size therefore equals
    // the 4-byte header plus count × sizeof<ZEntry<int64>> exactly —
    // no framing overhead, no per-entry padding.
    let ser = SpanSerializer<int64>() :> ISerializer<int64>
    let writer = freshWriter ()
    let original = ZSet.ofSeq [ 10L, 1L ; 20L, -3L ; 30L, 7L ]
    ser.Write(writer, original)
    let totalBytes = writer.WrittenMemory.Length
    let expected = 4 + 3 * sizeof<ZEntry<int64>>
    totalBytes |> should equal expected


[<Fact>]
let ``serializer name is span`` () =
    let ser = SpanSerializer<int64>() :> ISerializer<int64>
    ser.Name |> should equal "span"


[<Fact>]
let ``empty input reads as empty Z-set`` () =
    // Defensive read: a length-0 byte span (below the 4-byte header
    // minimum) must decode to the empty Z-set, not crash. The
    // implementation returns ZSet<'K>.Empty for bytes.Length < 4.
    let ser = SpanSerializer<int64>() :> ISerializer<int64>
    let empty = ReadOnlySpan<byte>(Array.empty)
    let result = ser.Read(empty)
    ZSet.isEmpty result |> should be True
