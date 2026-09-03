"""Independent Python oracle for the finite English-seed coverage audit.

This file does not import TypeScript results.  It separately parses the declared
JSON, tokenizes the fixed documentation scope, and computes the aggregate receipt.
Its scope is the current BMP-only heading catalogue; it intentionally refuses a
non-BMP ordering case rather than silently claiming JavaScript UTF-16 equivalence.
"""

import json
import re
import unicodedata
from pathlib import Path


ALLOWANCES = {"a", "an", "the", "of", "to", "in", "on", "at", "with", "from", "for", "and", "or"}


def tokenize(text):
    normalized = unicodedata.normalize("NFKC", text).lower()
    out = []
    current = []
    for index, character in enumerate(normalized):
        next_is_alnum = index + 1 < len(normalized) and normalized[index + 1].isalnum()
        if character.isalnum():
            current.append(character)
        elif character in "'’-" and current and next_is_alnum:
            current.append(character)
        else:
            if current:
                out.append("".join(current))
                current = []
    if current:
        out.append("".join(current))
    return out


def entries_from_markdown(markdown):
    entries = []
    heading = None
    body = []

    def emit():
        if heading is None:
            return
        joined = " ".join(body).strip()
        match = re.match(r"^(.+?[.!?])(?:\s|$)", joined)
        entries.append((heading, match.group(1) if match else joined))

    for line in markdown.splitlines():
        match = re.match(r"^#{2,4}\s+(.+?)\s*$", line)
        if match:
            emit()
            heading = match.group(1)
            body = []
        elif heading is not None and line.strip() and not line.lstrip().startswith("<!--"):
            body.append(line.strip())
    emit()
    return entries


def lexemes(seed):
    seen_ids = set()
    seen_forms = set()
    out = []
    for entry in seed["entries"]:
        identifier = entry["id"]
        if identifier in seen_ids:
            raise ValueError("DUPLICATE-ID:" + identifier)
        seen_ids.add(identifier)
        for form in [entry["exponent"], *entry["allolexes"]]:
            tokens = tuple(tokenize(form))
            canonical = " ".join(tokens)
            if not canonical or canonical in seen_forms:
                raise ValueError("DUPLICATE-OR-EMPTY-FORM:" + canonical)
            seen_forms.add(canonical)
            out.append((identifier, tokens))
    return sorted(out, key=lambda item: (-len(item[1]), item[0]))


def measure(seed, sources):
    for entry_id, _ in sources:
        if any(ord(character) > 0xFFFF for character in entry_id):
            raise ValueError("NON-BMP-ORDERING-OUT-OF-SCOPE")
    known_total = 0
    considered_total = 0
    lexical_forms = lexemes(seed)
    for _, source in sorted(sources):
        tokens = tokenize(source)
        considered_total += len(tokens)
        index = 0
        while index < len(tokens):
            candidate = next((candidate for candidate in lexical_forms if tuple(tokens[index:index + len(candidate[1])]) == candidate[1]), None)
            if candidate is not None:
                known_total += len(candidate[1])
                index += len(candidate[1])
            else:
                if tokens[index] in ALLOWANCES:
                    known_total += 1
                index += 1
    return {
        "seedVersion": seed["version"],
        "entryCount": len(sources),
        "totalConsideredTokenCount": considered_total,
        "totalKnownTokenCount": known_total,
        "coverage": 0 if considered_total == 0 else known_total / considered_total,
    }


def main():
    root = Path(__file__).resolve().parents[3]
    seed = json.loads((root / "docs/linguistic-seed/english/seed.json").read_text(encoding="utf-8"))
    sources = []
    for relative in ("docs/GLOSSARY.md", "docs/SEED-VOCABULARY.md"):
        sources.extend(entries_from_markdown((root / relative).read_text(encoding="utf-8")))
    fixture = [("fixture", "something is good")]
    mutated_seed = dict(seed)
    mutated_seed["entries"] = [entry for entry in seed["entries"] if entry["id"] != "good"]
    report = {
        "coverage": measure(seed, sources),
        "fixture": measure(seed, fixture),
        "removedGoodMutation": measure(mutated_seed, fixture),
    }
    print(json.dumps(report, separators=(",", ":"), allow_nan=False))


if __name__ == "__main__":
    main()
