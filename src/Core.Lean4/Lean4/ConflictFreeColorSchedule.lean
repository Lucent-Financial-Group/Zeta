import Mathlib

/-!
# Proper Coloring as a Conflict-Free Update Schedule

This file proves only the scheduler implication used by the reference-frame factor heterarchy:
vertices assigned the same color by a proper coloring cannot be adjacent in the declared conflict
graph. It does not prove the Four Color Theorem, does not infer planarity, and does not attach a
semantic or neuroscientific meaning to a color.
-/

namespace Zeta.ConflictFreeColorSchedule

variable {Vertex ColorId : Type*}

/-- A coloring is proper when every declared conflict edge has distinct endpoint colors. -/
def ProperColoring
    (conflicts : Vertex → Vertex → Prop)
    (colorOf : Vertex → ColorId) : Prop :=
  ∀ left right, conflicts left right → colorOf left ≠ colorOf right

/-- A single update class is independent in the conflict graph. -/
def ConflictFreeClass
    (conflicts : Vertex → Vertex → Prop)
    (colorOf : Vertex → ColorId)
    (color : ColorId) : Prop :=
  ∀ left right,
    colorOf left = color →
    colorOf right = color →
    ¬ conflicts left right

theorem properColoring_makes_every_class_conflictFree
    {conflicts : Vertex → Vertex → Prop}
    {colorOf : Vertex → ColorId}
    (proper : ProperColoring conflicts colorOf) :
    ∀ color, ConflictFreeClass conflicts colorOf color := by
  intro color left right hleft hright hedge
  have distinct := proper left right hedge
  apply distinct
  calc
    colorOf left = color := hleft
    _ = colorOf right := hright.symm

theorem same_color_implies_no_conflict
    {conflicts : Vertex → Vertex → Prop}
    {colorOf : Vertex → ColorId}
    (proper : ProperColoring conflicts colorOf)
    {left right : Vertex}
    (sameColor : colorOf left = colorOf right) :
    ¬ conflicts left right := by
  intro hedge
  exact (proper left right hedge) sameColor

/-- Four colors are sufficient for scheduling once a valid `Fin 4` proper coloring is supplied. -/
theorem fourColorWitness_gives_four_conflictFreeClasses
    {conflicts : Vertex → Vertex → Prop}
    {colorOf : Vertex → Fin 4}
    (proper : ProperColoring conflicts colorOf) :
    ∀ color : Fin 4, ConflictFreeClass conflicts colorOf color :=
  properColoring_makes_every_class_conflictFree proper

end Zeta.ConflictFreeColorSchedule
