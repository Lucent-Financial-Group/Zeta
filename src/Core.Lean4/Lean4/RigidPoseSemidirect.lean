import Mathlib

/-!
# Rigid Pose as a Semidirect Action

This file isolates the algebra used by the reference-frame factor heterarchy. A rotation-like
group `G` acts distributively on an additive coordinate space `V`; a pose is `(R,t)` and acts by
`x ↦ R • x + t`. The proofs establish the identity, inverse, and composition laws from the group
action. They do not identify this spatial carrier with the finite Adinkra `Cl(0,7)` model and do
not make a probability or neuroscience claim.
-/

namespace Zeta.RigidPose

variable {G V : Type*} [Group G] [AddCommGroup V] [DistribMulAction G V]

/-- A rigid pose pairs an orientation action with a translation. -/
structure Pose (G V : Type*) where
  rotation : G
  translation : V

/-- The identity pose. -/
def identity : Pose G V :=
  { rotation := 1
    translation := 0 }

/-- Semidirect pose composition: apply `first`, then `second`. -/
def compose (second first : Pose G V) : Pose G V :=
  { rotation := second.rotation * first.rotation
    translation := second.rotation • first.translation + second.translation }

/-- The inverse pose induced by the inverse group action. -/
def inverse (pose : Pose G V) : Pose G V :=
  { rotation := pose.rotation⁻¹
    translation := -(pose.rotation⁻¹ • pose.translation) }

/-- Pose action on a point. -/
def act (pose : Pose G V) (point : V) : V :=
  pose.rotation • point + pose.translation

@[ext]
theorem Pose.ext
    {left right : Pose G V}
    (rotation : left.rotation = right.rotation)
    (translation : left.translation = right.translation) :
    left = right := by
  cases left
  cases right
  simp_all

theorem identity_act (point : V) :
    act (identity : Pose G V) point = point := by
  simp [act, identity]

theorem compose_act (second first : Pose G V) (point : V) :
    act (compose second first) point = act second (act first point) := by
  simp [act, compose, mul_smul, smul_add, add_assoc]

theorem inverse_act (pose : Pose G V) (point : V) :
    act (inverse pose) (act pose point) = point := by
  simp [act, inverse, smul_add, add_assoc]

theorem act_inverse (pose : Pose G V) (point : V) :
    act pose (act (inverse pose) point) = point := by
  simp [act, inverse, smul_add, add_assoc]

theorem compose_identity_left (pose : Pose G V) :
    compose (identity : Pose G V) pose = pose := by
  ext <;> simp [compose, identity]

theorem compose_identity_right (pose : Pose G V) :
    compose pose (identity : Pose G V) = pose := by
  ext <;> simp [compose, identity]

theorem compose_inverse_left (pose : Pose G V) :
    compose (inverse pose) pose = identity := by
  ext <;> simp [compose, inverse, identity]

theorem compose_inverse_right (pose : Pose G V) :
    compose pose (inverse pose) = identity := by
  ext <;> simp [compose, inverse, identity, smul_neg]

theorem compose_assoc (third second first : Pose G V) :
    compose third (compose second first) = compose (compose third second) first := by
  ext <;> simp [compose, mul_assoc, mul_smul, smul_add, add_assoc]

end Zeta.RigidPose
