"""Independent finite lexical-correction receipt oracle.

This implementation does not import TypeScript values. It separately applies
NFKC normalization, UTF-8 length-prefix fingerprints, canonical content-ID
ordering, same-surface conflict reporting, and two deliberate control
projections. It assigns no lexical meaning.
"""

import json
import unicodedata


ALGORITHM = "declared-lexical-correction-receipts/v1"


def tokens(value):
    normalized = unicodedata.normalize("NFKC", value).lower()
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


def form(value):
    normalized = " ".join(tokens(value))
    if not normalized:
        raise ValueError("EMPTY-FORM")
    return normalized


def text(value):
    normalized = unicodedata.normalize("NFKC", value).strip()
    if not normalized:
        raise ValueError("EMPTY-TEXT")
    return normalized


def field(value):
    return f"{len(value.encode('utf-8'))}:{value}"


def identity(surface, status, replacement, source, version, reason):
    return "|".join([
        ALGORITHM,
        field(surface),
        field(status),
        field(replacement or ""),
        field(source),
        field(version),
        field(reason),
    ])


def receipt(surface, status, replacement, source, version, reason):
    surface = form(surface)
    source = text(source)
    version = text(version)
    reason = text(reason)
    replacement = None if replacement is None else form(replacement)
    if status == "replaced":
        if replacement is None or replacement == surface:
            raise ValueError("INVALID-REPLACEMENT")
    elif replacement is not None:
        raise ValueError("UNEXPECTED-REPLACEMENT")
    return {
        "surface": surface,
        "status": status,
        "replacement": replacement,
        "source": source,
        "version": version,
        "reason": reason,
        "contentId": identity(surface, status, replacement, source, version, reason),
    }


def canonical(receipts):
    by_id = {item["contentId"]: item for item in receipts}
    ordered = [by_id[key] for key in sorted(by_id)]
    surface_counts = {}
    for item in ordered:
        surface_counts.setdefault(item["surface"], set()).add(item["contentId"])
    conflicts = sorted(surface for surface, ids in surface_counts.items() if len(ids) > 1)
    return {
        "status": "Conflict" if conflicts else "Ready",
        "orderedContentIds": [item["contentId"] for item in ordered],
        "receiptCount": len(ordered),
        "conflictSurfaces": conflicts,
    }


def main():
    accepted = receipt("good", "accepted", None, "english-seed-v0", "0.1.0", "declared-catalogue")
    replaced = receipt("Colour", "replaced", "Color", "editorial-style", "1", "spelling-variant")
    unknown = receipt("zeta", "unknown", None, "manual-audit", "1", "not-in-candidate-seed")
    permutations = [
        [accepted, replaced, unknown], [accepted, unknown, replaced],
        [replaced, accepted, unknown], [replaced, unknown, accepted],
        [unknown, accepted, replaced], [unknown, replaced, accepted],
    ]
    canonical_receipts = {json.dumps(canonical(items), sort_keys=True, ensure_ascii=False) for items in permutations}
    unsorted_orders = {tuple(item["contentId"] for item in items) for items in permutations}
    v1 = receipt("colour", "replaced", "color", "editorial-style", "1", "spelling-variant")
    v2 = receipt("colour", "replaced", "color", "editorial-style", "2", "spelling-variant")
    conflict = canonical([v1, v2, receipt("colour", "unknown", None, "manual-audit", "2", "review-pending")])
    report = {
        "canonical": canonical([accepted, replaced, unknown]),
        "canonicalPermutationCount": len(canonical_receipts),
        "unsortedOrderCount": len(unsorted_orders),
        "conflict": conflict,
        "versionedContentIdsDistinct": v1["contentId"] != v2["contentId"],
        "omittedVersionMutationCollapses": identity(v1["surface"], v1["status"], v1["replacement"], v1["source"], "", v1["reason"]) == identity(v2["surface"], v2["status"], v2["replacement"], v2["source"], "", v2["reason"]),
    }
    print(json.dumps(report, separators=(",", ":"), ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
