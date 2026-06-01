// DynamicValue — the C# oracle (#3 of TS/F#/C#/Rust) for the universal self-describing-payload
// primitive. Conforms to the F# canonical shape (src/Core/DynamicValue.fs): a self-describing
// runtime value tree for shapes NOT known at compile time. The case set
// Null | Bool | Int | Float | String | Bytes | Array | Object is exactly the common
// self-describing core shared by CBOR / msgpack / JSON / YAML; schema-required formats join via a
// runtime schema registry (schema-id -> lookup -> current shape at runtime), producing the SAME
// runtime DynamicValue. Distinct from the static serializers (known types) and from a JSON-only
// tree (Int is split from Float; Bytes is native, not base64-in-a-string).

using System.Collections.Immutable;
using System.Globalization;
using System.Text;

namespace Zeta.Core.CSharp;

/// <summary>
/// The format-agnostic dynamic / self-describing-payload primitive — the C# oracle conforming to
/// the F# canonical shape (<c>src/Core/DynamicValue.fs</c>). A closed record hierarchy of eight
/// shapes; <see cref="Type"/> is the runtime tag, the <c>Try*</c> accessors lazily bind to a static
/// shape (strict — no widening), and <see cref="Get(string)"/> navigates a property path
/// (<c>"a.b[3].c"</c>). Equality is structural and hand-written for the collection shapes:
/// <see cref="Bytes"/> compares CONTENTS (not the <see cref="ImmutableArray{T}"/> reference);
/// <see cref="Array"/> / <see cref="Object"/> recurse; <see cref="Object"/> is order-sensitive
/// (insertion order is preserved; a canonical wire encoder sorts keys when byte-locking).
/// </summary>
public abstract record DynamicValue
{
    private protected DynamicValue() { }

    /// <summary>The runtime tag — QueryInterface ("what shape are you?").</summary>
    public abstract DynamicValueType Type { get; }

    /// <summary>True only for the <see cref="Null"/> shape.</summary>
    public bool IsNull => this is Null;

    /// <summary>Bind to a <see cref="bool"/>, or <c>null</c> on shape mismatch.</summary>
    public bool? TryBool() => this is Bool b ? b.Value : null;

    /// <summary>Bind to an <see cref="long"/>, or <c>null</c> on shape mismatch (strict: an
    /// <see cref="Int"/> is not a <see cref="Float"/>).</summary>
    public long? TryInt() => this is Int i ? i.Value : null;

    /// <summary>Bind to a <see cref="double"/>, or <c>null</c> on shape mismatch.</summary>
    public double? TryFloat() => this is Float f ? f.Value : null;

    /// <summary>Bind to a <see cref="string"/>, or <c>null</c> on shape mismatch.</summary>
    public string? TryString() => this is String s ? s.Value : null;

    /// <summary>Bind to the raw bytes, or <c>null</c> on shape mismatch.</summary>
    public ImmutableArray<byte>? TryBytes() => this is Bytes b ? b.Value : null;

    /// <summary>Bind to the array items, or <c>null</c> on shape mismatch.</summary>
    public ImmutableArray<DynamicValue>? TryArray() => this is Array a ? a.Items : null;

    /// <summary>Bind to the object pairs, or <c>null</c> on shape mismatch.</summary>
    public ImmutableArray<KeyValuePair<string, DynamicValue>>? TryObject() => this is Object o ? o.Pairs : null;

    /// <summary>Look up a field by key in an <see cref="Object"/> (first match wins; insertion
    /// order). <c>null</c> if this isn't an object or the key is absent.</summary>
    /// <param name="key">the field name (ordinal comparison).</param>
    public DynamicValue? TryField(string key)
    {
        if (this is Object o)
        {
            foreach (var kv in o.Pairs)
            {
                if (string.Equals(kv.Key, key, StringComparison.Ordinal))
                {
                    return kv.Value;
                }
            }
        }

        return null;
    }

    /// <summary>Index into an <see cref="Array"/>. <c>null</c> if this isn't an array or the index
    /// is out of range (negative indices are out of range).</summary>
    /// <param name="index">the zero-based index.</param>
    public DynamicValue? TryItem(int index) =>
        this is Array a && index >= 0 && index < a.Items.Length ? a.Items[index] : null;

    /// <summary>Navigate a property path (<c>"a.b[3].c"</c>). Returns <c>null</c> on a malformed
    /// path, a missing key, an out-of-range index, or a type mismatch along the way. An empty path
    /// returns this value.</summary>
    /// <param name="path">the dotted/indexed path.</param>
    public DynamicValue? Get(string path)
    {
        var steps = TryParsePath(path);
        if (steps is null)
        {
            return null;
        }

        DynamicValue? current = this;
        foreach (var step in steps)
        {
            if (current is null)
            {
                return null;
            }

            current = step.IsIndex ? current.TryItem(step.Index) : current.TryField(step.Key);
        }

        return current;
    }

    private readonly record struct Step(bool IsIndex, string Key, int Index);

    private static List<Step>? TryParsePath(string path)
    {
        var steps = new List<Step>();
        var key = new StringBuilder();

        void FlushKey()
        {
            if (key.Length > 0)
            {
                steps.Add(new Step(false, key.ToString(), 0));
                key.Clear();
            }
        }

        int i = 0;
        while (i < path.Length)
        {
            char c = path[i];
            if (c == '.')
            {
                FlushKey();
                i++;
            }
            else if (c == '[')
            {
                FlushKey();
                int next = TryReadIndex(path, i, out int idx);
                if (next < 0)
                {
                    return null;
                }

                steps.Add(new Step(true, string.Empty, idx));
                i = next;
            }
            else if (c == ']')
            {
                return null;
            }
            else
            {
                key.Append(c);
                i++;
            }
        }

        FlushKey();
        return steps;
    }

    /// Reads "[&lt;digits&gt;]" starting at <paramref name="open"/> (the '['). Returns the offset
    /// just past ']' and the parsed index, or -1 on a malformed bracket (no digits, unterminated,
    /// or an index that overflows Int32 — TryParse, never an OverflowException escaping Get).
    private static int TryReadIndex(string path, int open, out int index)
    {
        index = 0;
        int start = open + 1;
        int j = start;
        while (j < path.Length && char.IsDigit(path[j]))
        {
            j++;
        }

        if (j == start || j >= path.Length || path[j] != ']')
        {
            return -1;
        }

        return int.TryParse(path.AsSpan(start, j - start), NumberStyles.None, CultureInfo.InvariantCulture, out index)
            ? j + 1
            : -1;
    }

    // -- the eight shapes (a closed hierarchy: only these nested records derive) --

    /// <summary>The explicit null shape.</summary>
    public sealed record Null : DynamicValue
    {
        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Null;
    }

    /// <summary>A boolean.</summary>
    /// <param name="Value">the bool.</param>
    public sealed record Bool(bool Value) : DynamicValue
    {
        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Bool;
    }

    /// <summary>A 64-bit signed integer.</summary>
    /// <param name="Value">the integer.</param>
    public sealed record Int(long Value) : DynamicValue
    {
        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Int;
    }

    /// <summary>A 64-bit IEEE-754 float.</summary>
    /// <param name="Value">the float.</param>
    public sealed record Float(double Value) : DynamicValue
    {
        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Float;
    }

    /// <summary>A UTF-16 string.</summary>
    /// <param name="Value">the string.</param>
    public sealed record String(string Value) : DynamicValue
    {
        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.String;
    }

    /// <summary>A raw byte payload. Equality compares CONTENTS, not the
    /// <see cref="ImmutableArray{T}"/> reference.</summary>
    public sealed record Bytes : DynamicValue
    {
        /// <summary>Initializes the byte payload.</summary>
        /// <param name="value">the bytes.</param>
        public Bytes(ImmutableArray<byte> value) => Value = value;

        /// <summary>The raw bytes.</summary>
        public ImmutableArray<byte> Value { get; }

        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Bytes;

        /// <summary>Structural equality: same length and same bytes.</summary>
        /// <param name="other">the other byte payload.</param>
        public bool Equals(Bytes? other) =>
            other is not null && Value.AsSpan().SequenceEqual(other.Value.AsSpan());

        /// <inheritdoc/>
        public override int GetHashCode()
        {
            var hash = default(HashCode);
            foreach (var b in Value)
            {
                hash.Add(b);
            }

            return hash.ToHashCode();
        }
    }

    /// <summary>An ordered array of values. Equality recurses element-wise, in order.</summary>
    public sealed record Array : DynamicValue
    {
        /// <summary>Initializes the array.</summary>
        /// <param name="items">the items, in order.</param>
        public Array(ImmutableArray<DynamicValue> items) => Items = items;

        /// <summary>The items, in order.</summary>
        public ImmutableArray<DynamicValue> Items { get; }

        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Array;

        /// <summary>Structural equality: same length, element-wise equal in order.</summary>
        /// <param name="other">the other array.</param>
        public bool Equals(Array? other) => other is not null && Items.SequenceEqual(other.Items);

        /// <inheritdoc/>
        public override int GetHashCode()
        {
            var hash = default(HashCode);
            foreach (var item in Items)
            {
                hash.Add(item);
            }

            return hash.ToHashCode();
        }
    }

    /// <summary>An ordered key → value object. Equality is order-sensitive and recurses (the value
    /// tree preserves insertion order; a canonical wire encoder sorts keys when byte-locking).
    /// </summary>
    public sealed record Object : DynamicValue
    {
        /// <summary>Initializes the object.</summary>
        /// <param name="pairs">the key → value pairs, in order.</param>
        public Object(ImmutableArray<KeyValuePair<string, DynamicValue>> pairs) => Pairs = pairs;

        /// <summary>The key → value pairs, in order.</summary>
        public ImmutableArray<KeyValuePair<string, DynamicValue>> Pairs { get; }

        /// <inheritdoc/>
        public override DynamicValueType Type => DynamicValueType.Object;

        /// <summary>Structural, order-sensitive equality (ordinal keys; values recurse).
        /// Explicit pairwise comparison — <see cref="KeyValuePair{TKey,TValue}"/> has no
        /// <c>Equals</c> override, so <c>SequenceEqual</c> would fall back to reflection.</summary>
        /// <param name="other">the other object.</param>
        public bool Equals(Object? other)
        {
            if (other is null || Pairs.Length != other.Pairs.Length)
            {
                return false;
            }

            for (int k = 0; k < Pairs.Length; k++)
            {
                if (!string.Equals(Pairs[k].Key, other.Pairs[k].Key, StringComparison.Ordinal)
                    || !Pairs[k].Value.Equals(other.Pairs[k].Value))
                {
                    return false;
                }
            }

            return true;
        }

        /// <inheritdoc/>
        public override int GetHashCode()
        {
            var hash = default(HashCode);
            foreach (var kv in Pairs)
            {
                hash.Add(kv.Key, StringComparer.Ordinal);
                hash.Add(kv.Value);
            }

            return hash.ToHashCode();
        }
    }
}
