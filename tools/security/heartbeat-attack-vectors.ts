/**
 * Heartbeat-file integrity attack vector taxonomy.
 * Grounded in Otto-339/340/342: substrate-poisoning of heartbeat files
 * is cognition-poisoning and identity-corruption for the agent.
 * This discriminated union makes the threat model mechanizable
 * (exhaustive matching, future checker, Aminata review surface).
 * Smallest safe slice of B-0032.
 */

export type HeartbeatAttackVector =
  | {
      kind: 'repository-compromise'
      surface: 'push-permissions-to-main'
      impact: 'poisoned-heartbeat-write'
      mitigation: 'branch-protection + signed-commits + SLSA'
    }
  | {
      kind: 'force-push-attack'
      surface: 'admin-override-bypass'
      impact: 'history-rewrite-poison'
      mitigation: 'force-push:false + signed-commits + immutable-history'
    }
  | {
      kind: 'insider-threat'
      surface: 'authorized-contributor'
      impact: 'hard-to-detect-poison'
      mitigation: 'review-gate + per-commit-attestation + Aminata-audit'
    }
  | {
      kind: 'supply-chain'
      surface: 'compromised-ci-runner'
      impact: 'main-write-poison'
      mitigation: 'SLSA + Sigstore + runner-attestation + BouncyCastle-foundation'
    }
  | {
      kind: 'direct-to-main-bypass'
      surface: 'task-276-low-gate-without-threat-model'
      impact: 'review-gate-removal'
      mitigation: 'this-row (B-0032) + Otto-346 sequencing'
    }

export const ALL_HEARTBEAT_ATTACK_VECTORS: HeartbeatAttackVector[] = [
  {
    kind: 'repository-compromise',
    surface: 'push-permissions-to-main',
    impact: 'poisoned-heartbeat-write',
    mitigation: 'branch-protection + signed-commits + SLSA',
  },
  {
    kind: 'force-push-attack',
    surface: 'admin-override-bypass',
    impact: 'history-rewrite-poison',
    mitigation: 'force-push:false + signed-commits + immutable-history',
  },
  {
    kind: 'insider-threat',
    surface: 'authorized-contributor',
    impact: 'hard-to-detect-poison',
    mitigation: 'review-gate + per-commit-attestation + Aminata-audit',
  },
  {
    kind: 'supply-chain',
    surface: 'compromised-ci-runner',
    impact: 'main-write-poison',
    mitigation: 'SLSA + Sigstore + runner-attestation + BouncyCastle-foundation',
  },
  {
    kind: 'direct-to-main-bypass',
    surface: 'task-276-low-gate-without-threat-model',
    impact: 'review-gate-removal',
    mitigation: 'this-row (B-0032) + Otto-346 sequencing',
  },
]

export function isHeartbeatAttackVector(v: unknown): v is HeartbeatAttackVector {
  return (
    typeof v === 'object' &&
    v !== null &&
    'kind' in v &&
    typeof (v as any).kind === 'string' &&
    ['repository-compromise', 'force-push-attack', 'insider-threat', 'supply-chain', 'direct-to-main-bypass'].includes(
      (v as any).kind,
    )
  )
}
