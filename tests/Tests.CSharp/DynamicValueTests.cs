using System.Collections.Immutable;
using System.Linq;
using Xunit;
using Zeta.Core.CSharp;

namespace Zeta.Tests.CSharp;

// DynamicValue — the C# oracle (#3 of TS/F#/C#/Rust). Mirrors the F# canonical-shape tests
// (tests/Tests.FSharp/DynamicValue.Tests.fs) so the C# impl conforms to the same shape, lazy-bind
// accessors, structural equality (incl. native Bytes), and PropertyPath semantics.
public class DynamicValueTests
{
    private static DynamicValue.Bytes Bytes(params byte[] xs) => new(ImmutableArray.Create(xs));

    private static DynamicValue.Array Arr(params DynamicValue[] xs) => new(ImmutableArray.Create(xs));

    private static DynamicValue.Object Obj(params (string Key, DynamicValue Value)[] kvs) =>
        new(kvs.Select(kv => new KeyValuePair<string, DynamicValue>(kv.Key, kv.Value)).ToImmutableArray());

    // { "a": { "b": [10, 20, 30], "n": null }, "flag": true }
    private static readonly DynamicValue Sample =
        Obj(
            ("a", Obj(
                ("b", Arr(new DynamicValue.Int(10L), new DynamicValue.Int(20L), new DynamicValue.Int(30L))),
                ("n", new DynamicValue.Null()))),
            ("flag", new DynamicValue.Bool(true)));

    [Fact]
    public void TypeOfReportsEachShape()
    {
        Assert.Equal(DynamicValueType.Null, new DynamicValue.Null().Type);
        Assert.Equal(DynamicValueType.Bool, new DynamicValue.Bool(true).Type);
        Assert.Equal(DynamicValueType.Int, new DynamicValue.Int(1L).Type);
        Assert.Equal(DynamicValueType.Float, new DynamicValue.Float(1.0).Type);
        Assert.Equal(DynamicValueType.String, new DynamicValue.String("x").Type);
        Assert.Equal(DynamicValueType.Bytes, Bytes(1).Type);
        Assert.Equal(DynamicValueType.Array, Arr().Type);
        Assert.Equal(DynamicValueType.Object, Obj().Type);
    }

    [Fact]
    public void IsNullOnlyForNull()
    {
        Assert.True(new DynamicValue.Null().IsNull);
        Assert.False(new DynamicValue.Bool(false).IsNull);
    }

    [Fact]
    public void TryAccessorsBindMatchingShapeAndDeclineTheRest()
    {
        Assert.True(new DynamicValue.Bool(true).TryBool()!.Value);
        Assert.Null(new DynamicValue.Int(1L).TryBool());

        Assert.Equal(7L, new DynamicValue.Int(7L).TryInt()!.Value);
        Assert.Null(new DynamicValue.Float(7.0).TryInt());

        Assert.Equal(2.5, new DynamicValue.Float(2.5).TryFloat()!.Value);
        Assert.Null(new DynamicValue.Int(2L).TryFloat()); // strict: no widening

        Assert.Equal("hi", new DynamicValue.String("hi").TryString());
        Assert.Null(new DynamicValue.Null().TryString());

        Assert.True(Bytes(9).TryBytes().HasValue);
        Assert.False(new DynamicValue.String("9").TryBytes().HasValue);

        Assert.True(Arr().TryArray().HasValue);
        Assert.False(Obj().TryArray().HasValue);

        Assert.True(Obj().TryObject().HasValue);
        Assert.False(Arr().TryObject().HasValue);
    }

    [Fact]
    public void TryFieldAndTryItem()
    {
        Assert.Equal(new DynamicValue.Bool(true), Sample.TryField("flag"));
        Assert.Null(Sample.TryField("missing"));
        Assert.Null(new DynamicValue.Int(1L).TryField("flag"));

        var arr = Arr(new DynamicValue.Int(10L), new DynamicValue.Int(20L));
        Assert.Equal(new DynamicValue.Int(20L), arr.TryItem(1));
        Assert.Null(arr.TryItem(5)); // out of range
        Assert.Null(arr.TryItem(-1)); // negative
        Assert.Null(Obj().TryItem(0)); // not an array
    }

    [Fact]
    public void StructuralEqualityRecurses()
    {
        var a = Obj(("k", Arr(new DynamicValue.Int(1L), new DynamicValue.String("x"))));
        var b = Obj(("k", Arr(new DynamicValue.Int(1L), new DynamicValue.String("x"))));
        Assert.Equal(a, b);
        Assert.Equal(a.GetHashCode(), b.GetHashCode());
    }

    [Fact]
    public void BytesCompareByContentNotReference()
    {
        var a = new DynamicValue.Bytes(ImmutableArray.Create<byte>(1, 2, 3));
        var b = new DynamicValue.Bytes(ImmutableArray.Create<byte>(1, 2, 3));
        Assert.Equal(a, b);
        Assert.Equal(a.GetHashCode(), b.GetHashCode());

        var c = new DynamicValue.Bytes(ImmutableArray.Create<byte>(1, 2, 4));
        Assert.NotEqual(a, c);
    }

    [Fact]
    public void ObjectEqualityIsOrderSensitive()
    {
        var ab = Obj(("a", new DynamicValue.Int(1L)), ("b", new DynamicValue.Int(2L)));
        var ba = Obj(("b", new DynamicValue.Int(2L)), ("a", new DynamicValue.Int(1L)));
        Assert.NotEqual(ab, ba);
    }

    [Fact]
    public void DifferentShapesAreNotEqual()
    {
        Assert.NotEqual(new DynamicValue.Int(1L), (DynamicValue)new DynamicValue.Float(1.0));
        Assert.NotEqual(new DynamicValue.String("1"), (DynamicValue)new DynamicValue.Int(1L));
        Assert.NotEqual(new DynamicValue.Null(), (DynamicValue)new DynamicValue.Bool(false));
    }

    [Fact]
    public void GetNavigatesDottedAndIndexedPaths()
    {
        Assert.Equal(new DynamicValue.Int(20L), Sample.Get("a.b[1]"));
        Assert.Equal(new DynamicValue.Bool(true), Sample.Get("flag"));
        Assert.Equal(new DynamicValue.Null(), Sample.Get("a.n"));
    }

    [Fact]
    public void GetReturnsTheValueItselfForAnEmptyPath()
    {
        Assert.Equal(Sample, Sample.Get(""));
    }

    [Fact]
    public void GetDeclinesMissOutOfRangeAndTypeMismatch()
    {
        Assert.Null(Sample.Get("a.missing")); // key absent
        Assert.Null(Sample.Get("a.b[9]")); // index out of range
        Assert.Null(Sample.Get("flag.x")); // descend into a non-object
    }

    [Fact]
    public void GetSupportsABareLeadingIndex()
    {
        var arr = Arr(new DynamicValue.String("zero"), new DynamicValue.String("one"));
        Assert.Equal(new DynamicValue.String("one"), arr.Get("[1]"));
    }

    [Fact]
    public void GetDeclinesMalformedPaths()
    {
        Assert.Null(Sample.Get("a.b[")); // unterminated bracket
        Assert.Null(Sample.Get("a.b[x]")); // non-digit index
        Assert.Null(Sample.Get("a]b")); // stray close bracket
        Assert.Null(Sample.Get("a.b[99999999999999999999]")); // index overflows Int32 -> null, not an exception
    }
}
