//! Forward-only, pull-based, zero-copy UTF-8 JSON token reader — the
//! `Utf8JsonReader` model (System.Text.Json / ASP.NET Core).
//!
//! Single pass, forward only. It NEVER materializes the whole document, so it can
//! stream arbitrarily large / unbounded JSON, processing token-by-token and
//! discarding as it goes. State is bounded by nesting DEPTH (a small container
//! stack), not by document size — so a million-element array reads in constant
//! memory. Tokens BORROW from the input buffer (zero-copy); only an escaped string
//! allocates (`Cow::Owned`); numbers are returned as their raw `&str` slice
//! (zero-copy, lossless — parse on demand).
//!
//! This is the streaming PRIMITIVE. The DOM `Json` parse (json.rs) is a convenience
//! layer that *could* be built on top of this reader (unification tracked in
//! B-0867.29). Operator observation 2026-05-31: "our json parser needs to ... be
//! like dotnet ... one pass forward only ... never needs the whole object at once ...
//! deserialize infinite json streams" + "think aspnet json speed requirements".
//!
//! Day-one scope: this reader operates over a complete `&[u8]` buffer — the common
//! `Utf8JsonReader`-over-a-span case. The perf-hardening roadmap (B-0867.29):
//! a multi-segment / `BufRead`-refill variant for truly infinite socket streams
//! (re-feed bytes across reads), SIMD-vectorized whitespace/structural scanning,
//! and a criterion benchmark vs serde_json to prove ASP.NET-grade throughput.

use std::borrow::Cow;

use crate::json::JsonError;

/// A single forward-only token. Borrows from the input buffer where possible.
#[derive(Debug, Clone, PartialEq)]
pub enum JsonToken<'a> {
    /// `{`
    StartObject,
    /// `}`
    EndObject,
    /// `[`
    StartArray,
    /// `]`
    EndArray,
    /// An object key. Zero-copy (`Borrowed`) unless it contained escapes.
    Key(Cow<'a, str>),
    /// A string value. Zero-copy (`Borrowed`) unless it contained escapes.
    Str(Cow<'a, str>),
    /// A number, as its raw source slice (zero-copy, lossless). Use
    /// [`JsonToken::number_as_f64`] to parse on demand.
    Number(&'a str),
    /// `true` / `false`.
    Bool(bool),
    /// `null`.
    Null,
}

impl JsonToken<'_> {
    /// Parse a [`JsonToken::Number`] as f64 (returns `None` for other tokens or an
    /// unparseable slice).
    pub fn number_as_f64(&self) -> Option<f64> {
        match self {
            JsonToken::Number(raw) => raw.parse::<f64>().ok(),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Container {
    Object,
    Array,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum State {
    /// Expect the single top-level (root) value.
    Value,
    /// Just opened a container: expect the first member (key in object / value in
    /// array) or an immediate close.
    FirstMember,
    /// In an object, a key + `:` were just read: expect the value.
    ObjectValue,
    /// After a member: expect `,` (→ next member) or the matching close.
    AfterMember,
    /// The root value has been consumed; only trailing whitespace may remain.
    End,
}

/// A forward-only, pull-based reader over a complete UTF-8 JSON buffer. Call
/// [`read`](JsonReader::read) repeatedly; it yields one [`JsonToken`] per call and
/// `None` at end of input. Memory is bounded by nesting depth, not document size.
pub struct JsonReader<'a> {
    bytes: &'a [u8],
    pos: usize,
    stack: Vec<Container>,
    state: State,
}

impl<'a> JsonReader<'a> {
    /// Create a reader over a complete UTF-8 JSON buffer.
    pub fn new(input: &'a str) -> Self {
        JsonReader { bytes: input.as_bytes(), pos: 0, stack: Vec::new(), state: State::Value }
    }

    /// Current nesting depth (number of open containers). Stays bounded regardless
    /// of document size — the proof of constant-memory streaming.
    pub fn depth(&self) -> usize {
        self.stack.len()
    }

    /// Advance to and return the next token, or `None` at end of input.
    pub fn read(&mut self) -> Result<Option<JsonToken<'a>>, JsonError> {
        self.skip_ws();
        match self.state {
            State::End => {
                if self.pos == self.bytes.len() {
                    Ok(None)
                } else {
                    Err(self.err("trailing characters after JSON value"))
                }
            }
            State::Value => {
                let (tok, is_start) = self.read_value()?;
                self.state = if is_start { State::FirstMember } else { State::End };
                Ok(Some(tok))
            }
            State::ObjectValue => {
                let (tok, is_start) = self.read_value()?;
                self.state = if is_start { State::FirstMember } else { State::AfterMember };
                Ok(Some(tok))
            }
            State::FirstMember => match self.stack.last().copied() {
                Some(Container::Object) => {
                    if self.peek() == Some(b'}') {
                        self.pos += 1;
                        self.stack.pop();
                        self.state = self.pop_state();
                        Ok(Some(JsonToken::EndObject))
                    } else {
                        let key = self.read_key()?;
                        self.state = State::ObjectValue;
                        Ok(Some(JsonToken::Key(key)))
                    }
                }
                Some(Container::Array) => {
                    if self.peek() == Some(b']') {
                        self.pos += 1;
                        self.stack.pop();
                        self.state = self.pop_state();
                        Ok(Some(JsonToken::EndArray))
                    } else {
                        let (tok, is_start) = self.read_value()?;
                        self.state = if is_start { State::FirstMember } else { State::AfterMember };
                        Ok(Some(tok))
                    }
                }
                None => Err(self.err("internal: FirstMember with empty stack")),
            },
            State::AfterMember => match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                    self.skip_ws();
                    match self.stack.last().copied() {
                        Some(Container::Object) => {
                            let key = self.read_key()?;
                            self.state = State::ObjectValue;
                            Ok(Some(JsonToken::Key(key)))
                        }
                        Some(Container::Array) => {
                            let (tok, is_start) = self.read_value()?;
                            self.state = if is_start { State::FirstMember } else { State::AfterMember };
                            Ok(Some(tok))
                        }
                        None => Err(self.err("internal: AfterMember with empty stack")),
                    }
                }
                Some(b'}') if self.stack.last() == Some(&Container::Object) => {
                    self.pos += 1;
                    self.stack.pop();
                    self.state = self.pop_state();
                    Ok(Some(JsonToken::EndObject))
                }
                Some(b']') if self.stack.last() == Some(&Container::Array) => {
                    self.pos += 1;
                    self.stack.pop();
                    self.state = self.pop_state();
                    Ok(Some(JsonToken::EndArray))
                }
                _ => Err(self.err("expected ',' or a closing bracket")),
            },
        }
    }

    fn pop_state(&self) -> State {
        if self.stack.is_empty() { State::End } else { State::AfterMember }
    }

    /// Read a value token. Returns `(token, is_container_start)`; on `{`/`[` it
    /// pushes the container and returns the Start token with `true`.
    fn read_value(&mut self) -> Result<(JsonToken<'a>, bool), JsonError> {
        self.skip_ws();
        match self.peek() {
            Some(b'{') => {
                self.pos += 1;
                self.stack.push(Container::Object);
                Ok((JsonToken::StartObject, true))
            }
            Some(b'[') => {
                self.pos += 1;
                self.stack.push(Container::Array);
                Ok((JsonToken::StartArray, true))
            }
            Some(b'"') => Ok((JsonToken::Str(self.read_string()?), false)),
            Some(b't') | Some(b'f') => Ok((JsonToken::Bool(self.read_bool()?), false)),
            Some(b'n') => {
                self.read_null()?;
                Ok((JsonToken::Null, false))
            }
            Some(b) if b == b'-' || b.is_ascii_digit() => {
                Ok((JsonToken::Number(self.read_number()?), false))
            }
            Some(_) => Err(self.err("unexpected character (expected a value)")),
            None => Err(self.err("unexpected end of input (expected a value)")),
        }
    }

    fn read_key(&mut self) -> Result<Cow<'a, str>, JsonError> {
        self.skip_ws();
        let key = self.read_string()?;
        self.skip_ws();
        if self.peek() == Some(b':') {
            self.pos += 1;
            Ok(key)
        } else {
            Err(self.err("expected ':' after object key"))
        }
    }

    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn err(&self, msg: &str) -> JsonError {
        JsonError { message: msg.to_string(), position: self.pos }
    }

    fn skip_ws(&mut self) {
        while let Some(b) = self.peek() {
            if matches!(b, b' ' | b'\t' | b'\n' | b'\r') {
                self.pos += 1;
            } else {
                break;
            }
        }
    }

    /// Read a string. Fast path: borrow the buffer slice (zero-copy) when there are
    /// no escapes; slow path: build an owned `String` when escapes are present.
    fn read_string(&mut self) -> Result<Cow<'a, str>, JsonError> {
        if self.peek() != Some(b'"') {
            return Err(self.err("expected '\"'"));
        }
        self.pos += 1;
        let start = self.pos;
        while let Some(b) = self.peek() {
            match b {
                b'"' => {
                    let slice = &self.bytes[start..self.pos];
                    self.pos += 1;
                    let s = std::str::from_utf8(slice).map_err(|_| self.err("invalid utf-8 in string"))?;
                    return Ok(Cow::Borrowed(s));
                }
                b'\\' => return self.read_string_escaped(start),
                _ => self.pos += 1,
            }
        }
        Err(self.err("unterminated string"))
    }

    fn read_string_escaped(&mut self, start: usize) -> Result<Cow<'a, str>, JsonError> {
        let mut out: Vec<u8> = Vec::new();
        out.extend_from_slice(&self.bytes[start..self.pos]); // bytes before the first backslash
        loop {
            match self.peek() {
                None => return Err(self.err("unterminated string")),
                Some(b'"') => {
                    self.pos += 1;
                    break;
                }
                Some(b'\\') => {
                    self.pos += 1;
                    match self.peek() {
                        Some(b'"') => out.push(b'"'),
                        Some(b'\\') => out.push(b'\\'),
                        Some(b'/') => out.push(b'/'),
                        Some(b'b') => out.push(0x08),
                        Some(b'f') => out.push(0x0C),
                        Some(b'n') => out.push(b'\n'),
                        Some(b'r') => out.push(b'\r'),
                        Some(b't') => out.push(b'\t'),
                        Some(b'u') => {
                            self.pos += 1;
                            self.push_unicode_escape(&mut out)?;
                            continue;
                        }
                        _ => return Err(self.err("invalid escape")),
                    }
                    self.pos += 1;
                }
                Some(b) => {
                    out.push(b);
                    self.pos += 1;
                }
            }
        }
        String::from_utf8(out)
            .map(Cow::Owned)
            .map_err(|_| self.err("invalid utf-8 in string"))
    }

    fn push_unicode_escape(&mut self, out: &mut Vec<u8>) -> Result<(), JsonError> {
        let hi = self.read_hex4()?;
        let ch = if (0xD800..=0xDBFF).contains(&hi) {
            if self.peek() == Some(b'\\') {
                self.pos += 1;
            } else {
                return Err(self.err("expected low surrogate"));
            }
            if self.peek() == Some(b'u') {
                self.pos += 1;
            } else {
                return Err(self.err("expected low surrogate"));
            }
            let lo = self.read_hex4()?;
            if !(0xDC00..=0xDFFF).contains(&lo) {
                return Err(self.err("invalid low surrogate"));
            }
            let cp = 0x10000 + (((hi - 0xD800) as u32) << 10) + (lo - 0xDC00) as u32;
            char::from_u32(cp).ok_or_else(|| self.err("invalid unicode scalar"))?
        } else {
            char::from_u32(hi as u32).ok_or_else(|| self.err("invalid unicode scalar"))?
        };
        let mut buf = [0u8; 4];
        out.extend_from_slice(ch.encode_utf8(&mut buf).as_bytes());
        Ok(())
    }

    fn read_hex4(&mut self) -> Result<u16, JsonError> {
        let mut value: u16 = 0;
        for _ in 0..4 {
            let b = self.peek().ok_or_else(|| self.err("unexpected end in \\u escape"))?;
            let digit = match b {
                b'0'..=b'9' => b - b'0',
                b'a'..=b'f' => b - b'a' + 10,
                b'A'..=b'F' => b - b'A' + 10,
                _ => return Err(self.err("invalid hex digit")),
            };
            value = value * 16 + u16::from(digit);
            self.pos += 1;
        }
        Ok(value)
    }

    fn read_bool(&mut self) -> Result<bool, JsonError> {
        if self.bytes[self.pos..].starts_with(b"true") {
            self.pos += 4;
            Ok(true)
        } else if self.bytes[self.pos..].starts_with(b"false") {
            self.pos += 5;
            Ok(false)
        } else {
            Err(self.err("invalid literal"))
        }
    }

    fn read_null(&mut self) -> Result<(), JsonError> {
        if self.bytes[self.pos..].starts_with(b"null") {
            self.pos += 4;
            Ok(())
        } else {
            Err(self.err("invalid literal"))
        }
    }

    /// Read a number, returning its raw source slice (zero-copy, lossless).
    fn read_number(&mut self) -> Result<&'a str, JsonError> {
        let start = self.pos;
        if self.peek() == Some(b'-') {
            self.pos += 1;
        }
        while let Some(b) = self.peek() {
            if b.is_ascii_digit() || matches!(b, b'.' | b'e' | b'E' | b'+' | b'-') {
                self.pos += 1;
            } else {
                break;
            }
        }
        std::str::from_utf8(&self.bytes[start..self.pos]).map_err(|_| self.err("invalid number bytes"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tokens(input: &str) -> Vec<JsonToken<'_>> {
        let mut r = JsonReader::new(input);
        let mut out = Vec::new();
        while let Some(t) = r.read().expect("read") {
            out.push(t);
        }
        out
    }

    #[test]
    fn exact_token_sequence_for_nested_doc() {
        let doc = r#"{"a": [1, true, null], "b": "x", "c": {}}"#;
        let got = tokens(doc);
        let want = vec![
            JsonToken::StartObject,
            JsonToken::Key(Cow::Borrowed("a")),
            JsonToken::StartArray,
            JsonToken::Number("1"),
            JsonToken::Bool(true),
            JsonToken::Null,
            JsonToken::EndArray,
            JsonToken::Key(Cow::Borrowed("b")),
            JsonToken::Str(Cow::Borrowed("x")),
            JsonToken::Key(Cow::Borrowed("c")),
            JsonToken::StartObject,
            JsonToken::EndObject,
            JsonToken::EndObject,
        ];
        assert_eq!(want, got);
    }

    #[test]
    fn strings_are_zero_copy_unless_escaped() {
        // No escapes → Borrowed (zero-copy).
        match &tokens(r#""hello world""#)[0] {
            JsonToken::Str(Cow::Borrowed(_)) => {}
            other => panic!("expected Borrowed, got {other:?}"),
        }
        // Escapes → Owned, correctly decoded.
        match &tokens(r#""a\nb\"c""#)[0] {
            JsonToken::Str(Cow::Owned(s)) => assert_eq!(s, "a\nb\"c"),
            other => panic!("expected Owned, got {other:?}"),
        }
    }

    #[test]
    fn empty_containers() {
        assert_eq!(tokens("{}"), vec![JsonToken::StartObject, JsonToken::EndObject]);
        assert_eq!(tokens("[]"), vec![JsonToken::StartArray, JsonToken::EndArray]);
    }

    #[test]
    fn streaming_large_array_is_constant_depth() {
        // A big top-level array of objects. The reader processes it token-by-token;
        // nesting depth never exceeds 2 (array + one object) regardless of length —
        // the proof of constant-memory streaming over arbitrarily large input.
        let n = 50_000usize;
        let mut doc = String::from("[");
        for i in 0..n {
            if i > 0 {
                doc.push(',');
            }
            doc.push_str(r#"{"i":1}"#);
        }
        doc.push(']');

        let mut r = JsonReader::new(&doc);
        let mut objects = 0usize;
        let mut max_depth = 0usize;
        while let Some(t) = r.read().expect("read") {
            max_depth = max_depth.max(r.depth());
            if t == JsonToken::StartObject {
                objects += 1;
            }
        }
        assert_eq!(objects, n);
        assert_eq!(max_depth, 2, "depth must stay bounded by nesting, not array length");
    }

    #[test]
    fn number_slice_parses_on_demand() {
        let toks = tokens("[-12.5e3]");
        assert_eq!(toks[1], JsonToken::Number("-12.5e3"));
        assert_eq!(toks[1].number_as_f64(), Some(-12500.0));
    }
}
