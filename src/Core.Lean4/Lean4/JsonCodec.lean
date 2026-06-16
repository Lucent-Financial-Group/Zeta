import Lean4.DynamicValue

/-- Simplified JSON AST covering the 6 locked shapes of DynamicValue v1. -/
inductive Json where
  | null
  | bool (b : Bool)
  | int (i : Int)
  | string (s : String)
  | array (l : List Json)
  | object (kv : List (String × Json))
  deriving Repr

mutual
  /-- Predicate characterizing DynamicValues representable in plain JSON (Float/Bytes deferred). -/
  def IsRepresentableInJson : DynamicValue → Prop
    | .null => True
    | .bool _ => True
    | .int _ => True
    | .float _ => False
    | .string _ => True
    | .bytes _ => False
    | .array l => IsRepresentableList l
    | .object l => IsRepresentablePairs l

  /-- Predicate characterizing lists of DynamicValues representable in plain JSON. -/
  def IsRepresentableList : List DynamicValue → Prop
    | [] => True
    | x :: xs => IsRepresentableInJson x ∧ IsRepresentableList xs

  /-- Predicate characterizing association lists representable in plain JSON. -/
  def IsRepresentablePairs : List (String × DynamicValue) → Prop
    | [] => True
    | pair :: xs => IsRepresentableInJson pair.2 ∧ IsRepresentablePairs xs
end

mutual
  /-- Convert a DynamicValue to its JSON AST counterpart. Returns none for Float/Bytes. -/
  def toJson : DynamicValue → Option Json
    | .null => some .null
    | .bool b => some (.bool b)
    | .int i => some (.int i)
    | .float _ => none
    | .string s => some (.string s)
    | .bytes _ => none
    | .array l => (toJsonList l).map .array
    | .object l => (toJsonPairs l).map .object

  /-- Helper to convert a list of DynamicValues to a list of JSON AST nodes. -/
  def toJsonList : List DynamicValue → Option (List Json)
    | [] => some []
    | x :: xs =>
        match toJson x, toJsonList xs with
        | some j, some js => some (j :: js)
        | _, _ => none

  /-- Helper to convert a list of key-value pairs to JSON object key-value pairs. -/
  def toJsonPairs : List (String × DynamicValue) → Option (List (String × Json))
    | [] => some []
    | (k, v) :: xs =>
        match toJson v, toJsonPairs xs with
        | some j, some js => some ((k, j) :: js)
        | _, _ => none
end

mutual
  /-- Convert JSON AST back to DynamicValue. -/
  def fromJson : Json → DynamicValue
    | .null => .null
    | .bool b => .bool b
    | .int i => .int i
    | .string s => .string s
    | .array l => .array (fromJsonList l)
    | .object l => .object (fromJsonPairs l)

  /-- Helper to convert a list of JSON nodes back to DynamicValues. -/
  def fromJsonList : List Json → List DynamicValue
    | [] => []
    | j :: js => fromJson j :: fromJsonList js

  /-- Helper to convert JSON object key-value pairs back to F# style association list. -/
  def fromJsonPairs : List (String × Json) → List (String × DynamicValue)
    | [] => []
    | (k, j) :: js => (k, fromJson j) :: fromJsonPairs js
end

/-! ## Round-trip verification -/

mutual
  /-- **JSON Round-Trip Theorem.** For any representable DynamicValue,
      toJson succeeds and fromJson is a perfect inverse. -/
  theorem json_roundtrip : (v : DynamicValue) → IsRepresentableInJson v → ∃ j : Json, toJson v = some j ∧ fromJson j = v
    | .null, _ => ⟨.null, rfl, rfl⟩
    | .bool b, _ => ⟨.bool b, rfl, rfl⟩
    | .int i, _ => ⟨.int i, rfl, rfl⟩
    | .float _, h => False.elim h
    | .string s, _ => ⟨.string s, rfl, rfl⟩
    | .bytes _, h => False.elim h
    | .array l, h =>
        match toJsonList_roundtrip l h with
        | ⟨js, h1, h2⟩ => ⟨.array js, by simp [toJson, h1], by simp [fromJson, h2]⟩
    | .object l, h =>
        match toJsonPairs_roundtrip l h with
        | ⟨js, h1, h2⟩ => ⟨.object js, by simp [toJson, h1], by simp [fromJson, h2]⟩

  /-- Auxiliary helper theorem for lists of representable values. -/
  theorem toJsonList_roundtrip : (l : List DynamicValue) → IsRepresentableList l → ∃ js : List Json, toJsonList l = some js ∧ fromJsonList js = l
    | [], _ => ⟨[], rfl, rfl⟩
    | x :: xs, h =>
        match json_roundtrip x h.1, toJsonList_roundtrip xs h.2 with
        | ⟨jx, hjx, hdec_x⟩, ⟨jxs, hjxs, hdec_xs⟩ =>
            ⟨jx :: jxs, by simp [toJsonList, hjx, hjxs], by simp [fromJsonList, hdec_x, hdec_xs]⟩

  /-- Auxiliary helper theorem for representable object key-value pairs. -/
  theorem toJsonPairs_roundtrip : (l : List (String × DynamicValue)) → IsRepresentablePairs l → ∃ js : List (String × Json), toJsonPairs l = some js ∧ fromJsonPairs js = l
    | [], _ => ⟨[], rfl, rfl⟩
    | (k, v) :: xs, h =>
        match json_roundtrip v h.1, toJsonPairs_roundtrip xs h.2 with
        | ⟨jv, hjv, hdec_v⟩, ⟨jxs, hjxs, hdec_xs⟩ =>
            ⟨(k, jv) :: jxs, by simp [toJsonPairs, hjv, hjxs], by simp [fromJsonPairs, hdec_v, hdec_xs]⟩
end
