"""
src/Core.Python/algebra/interfaces.py — the full algebraic interface stack.

GCF principle: richest shared structure. Python uses Protocol (structural typing)
for compile-time checking and ABC for runtime enforcement. TypeVar for generics.

Same interfaces as TS/C#/Rust/Go — one algebra, seven syntaxes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol, TypeVar

# `T` remains a module-level TypeVar because the subclasses and Protocols below
# (Ring, StarRing, Lattice, ReadPort, WritePort) parameterise on it directly and
# are not themselves PEP 695 declarations. The contravariant `A` and covariant `B`
# TypeVars that used to sit here were never referenced anywhere in the package;
# they were removed rather than renamed to `A_contra`/`B_co` as PLC0105 suggests,
# because renaming an unused declaration only makes dead code better spelled.
T = TypeVar("T")


# ─── ISemiring ───────────────────────────────────────────────────────────


class Semiring[T](ABC):
    """Semiring (rig): Zero/One/Add/Mul — the FREE tier for DBSP weights.

    Deliberately no additive inverse: lawful semirings (tropical min-plus)
    provably cannot always supply one (idempotent => zerosumfree; Vandiver
    1934, Golan 1999). Retraction-capable algebras implement Ring
    (081KWG9JQ9H)."""

    @property
    @abstractmethod
    def zero(self) -> T: ...

    @property
    @abstractmethod
    def one(self) -> T: ...

    @abstractmethod
    def add(self, a: T, b: T) -> T: ...

    @abstractmethod
    def mul(self, a: T, b: T) -> T: ...


# ─── IRing ───────────────────────────────────────────────────────────────


class Ring(Semiring[T]):
    """Ring: the earned quotient over Semiring — adds the additive inverse
    (add(a, negate(a)) == zero), which retraction requires (081KWG9JQ9H)."""

    @abstractmethod
    def negate(self, a: T) -> T: ...


# ─── IStarRing ───────────────────────────────────────────────────────────


class StarRing(Ring[T]):
    """Star-ring: Ring + Conj (involution star, not Kleene star).
    Cayley-Dickson tower floor."""

    @abstractmethod
    def conj(self, a: T) -> T: ...


# ─── IGroup ──────────────────────────────────────────────────────────────


class Group[T](ABC):
    """Group: identity + combine + inverse. Minimal structure for undo/retract."""

    @property
    @abstractmethod
    def identity(self) -> T: ...

    @abstractmethod
    def combine(self, a: T, b: T) -> T: ...

    @abstractmethod
    def inverse(self, a: T) -> T: ...


# ─── IMonoid ─────────────────────────────────────────────────────────────


class Monoid[T](ABC):
    """Monoid: identity + combine. No inverse. The CRDT merge floor."""

    @property
    @abstractmethod
    def identity(self) -> T: ...

    @abstractmethod
    def combine(self, a: T, b: T) -> T: ...


# ─── ILattice ────────────────────────────────────────────────────────────


class JoinSemilattice[T](ABC):
    """Join-semilattice: idempotent, commutative, associative. Monotone growth."""

    @abstractmethod
    def join(self, a: T, b: T) -> T: ...


class Lattice(JoinSemilattice[T]):
    """Full lattice: join (LUB) + meet (GLB)."""

    @abstractmethod
    def meet(self, a: T, b: T) -> T: ...


# ─── ICodec ──────────────────────────────────────────────────────────────


class Codec[T](ABC):
    """Codec: encode/decode pair. The serialization contract."""

    # Note: Python can't express co/contravariance on class methods directly,
    # but the Protocol version below can.

    @abstractmethod
    def encode(self, a: T) -> bytes: ...

    @abstractmethod
    def decode(self, b: bytes) -> T: ...


# ─── IPort ───────────────────────────────────────────────────────────────


class ReadPort[T](Protocol):
    """Read-only port (covariant — can widen output).

    PEP 695 type parameter, not `Protocol[T]` with the module-level invariant `T`.
    The docstrings here always claimed covariance and contravariance, but both
    protocols were parameterised on the INVARIANT `T`, and mypy said so:

        error: Invariant type variable "T" used in protocol where covariant one
               is expected  [misc]

    The file even declared the right TypeVars for this -- a contravariant `A` and a
    covariant `B` -- and then never used them anywhere. Under PEP 695 the variance
    is INFERRED from usage, so `read() -> T` is covariant and `write(value: T)` is
    contravariant automatically, and there is no separate declaration left to drift
    away from the docstring."""

    def read(self) -> T: ...


class WritePort[T](Protocol):
    """Write-only port (contravariant — can narrow input). See ReadPort."""

    def write(self, value: T) -> None: ...


class Port[T](ABC):
    """Hexagonal port: read + write. Invariant on T."""

    @abstractmethod
    def read(self) -> T: ...

    @abstractmethod
    def write(self, value: T) -> None: ...


# ─── Instances ───────────────────────────────────────────────────────────


class RealSemiring(Ring[float]):
    """Float semiring (standard arithmetic)."""

    @property
    def zero(self) -> float:
        return 0.0

    @property
    def one(self) -> float:
        return 1.0

    def add(self, a: float, b: float) -> float:
        return a + b

    def mul(self, a: float, b: float) -> float:
        return a * b

    def negate(self, a: float) -> float:
        return -a


class RealStarRing(StarRing[float]):
    """Float star-ring (conj = identity on reals)."""

    @property
    def zero(self) -> float:
        return 0.0

    @property
    def one(self) -> float:
        return 1.0

    def add(self, a: float, b: float) -> float:
        return a + b

    def mul(self, a: float, b: float) -> float:
        return a * b

    def negate(self, a: float) -> float:
        return -a

    def conj(self, a: float) -> float:
        return a  # identity on reals


class AdditiveGroup(Group[float]):
    """Additive group over floats."""

    @property
    def identity(self) -> float:
        return 0.0

    def combine(self, a: float, b: float) -> float:
        return a + b

    def inverse(self, a: float) -> float:
        return -a


class MaxSemilattice(JoinSemilattice[float]):
    """Max join-semilattice."""

    def join(self, a: float, b: float) -> float:
        return max(a, b)


# Singletons
real_semiring = RealSemiring()
real_star_ring = RealStarRing()
additive_group = AdditiveGroup()
max_semilattice = MaxSemilattice()
