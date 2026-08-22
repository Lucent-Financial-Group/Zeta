import { createStudentTState, updateStudentT, type StudentTState } from "../planning/student-t-bnn";

export interface BnnPriors {
  explorationRate: number; // 0.0 - 1.0 (how uniform the distribution is)
  targetTrackingWeight: number; // 0.0 - 1.0 (how much to care about closing the distance)
}

/**
 * A Society of Student-t BNNs for predicting the optimal CHIP-8 key.
 * 
 * Instead of a single model, we run a small society of BNNs. Each BNN acts as a
 * reservoir node with its own state. We aggregate their predictions to form a consensus.
 * The Student-t likelihood ensures robustness against non-Gaussian outliers (e.g. noise flashes).
 */
export class BnnSocietyPredictor {
  private priors: BnnPriors = {
    explorationRate: 0.1,
    targetTrackingWeight: 0.9,
  };

  // The society of BNNs. We map each of the 16 keys to a StudentTState (its probability belief).
  // For a multi-agent society, we can have N agents, each maintaining beliefs about the 16 keys.
  private agents: Map<string, Record<number, StudentTState>> = new Map();

  constructor(public agentCount: number = 3) {
    this.initializeSociety();
  }

  private initializeSociety() {
    for (let i = 0; i < this.agentCount; i++) {
      const agentBeliefs: Record<number, StudentTState> = {};
      for (let k = 0; k <= 0xF; k++) {
        // Each agent has slightly different prior variance to encourage diversity in the society
        const diversityVariance = 1.0 + (Math.random() * 0.5); 
        agentBeliefs[k] = createStudentTState(0.0, diversityVariance, 4.0, 0.1);
      }
      this.agents.set(`agent_${i}`, agentBeliefs);
    }
  }

  /**
   * The Commander LLM can tune the priors on the fly.
   */
  public setPriors(priors: Partial<BnnPriors>) {
    this.priors = { ...this.priors, ...priors };
  }

  public getPriors(): BnnPriors {
    return this.priors;
  }

  /**
   * Calculates the probability distribution for all 16 hex keys using consensus.
   */
  public predict(display: boolean[]): Record<number, number> {
    // 1. Calculate heuristic visual gradients (simulating an observation 'y')
    let leftX = 0, leftY = 0, leftCount = 0;
    let rightX = 0, rightY = 0, rightCount = 0;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        const idx = x + y * 64;
        if (display[idx]) {
          if (x < 32) {
            leftX += x; leftY += y; leftCount++;
          } else {
            rightX += x; rightY += y; rightCount++;
          }
        }
      }
    }

    const observations: Record<number, number> = {};
    for (let i = 0; i <= 0xF; i++) observations[i] = 0.0;

    if (leftCount > 0 && rightCount > 0) {
      const pX = leftX / leftCount;
      const pY = leftY / leftCount;
      const tX = rightX / rightCount;
      const tY = rightY / rightCount;

      const dx = tX - pX;
      const dy = tY - pY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        if (ny < 0) observations[2] += Math.abs(ny) * this.priors.targetTrackingWeight;
        if (ny > 0) observations[8] += Math.abs(ny) * this.priors.targetTrackingWeight;
        if (nx < 0) observations[4] += Math.abs(nx) * this.priors.targetTrackingWeight;
        if (nx > 0) observations[6] += Math.abs(nx) * this.priors.targetTrackingWeight;
      }
    }

    // 2. Update each agent's Student-t belief with the new observations (EP Update)
    // The robust Student-t likelihood will automatically downweight extreme outliers
    for (const [agentId, beliefs] of this.agents.entries()) {
      for (let k = 0; k <= 0xF; k++) {
        const y = observations[k]! + ((Math.random() - 0.5) * 0.05); // Add slight subjective noise per agent
        const result = updateStudentT(beliefs[k]!, y);
        beliefs[k] = result.state; // Persist the updated posterior
      }
    }

    // 3. Reservoir Readout (Consensus)
    // We average the posterior means across the society.
    const consensusProbs: Record<number, number> = {};
    for (let k = 0; k <= 0xF; k++) {
      let sumMu = 0;
      for (const beliefs of this.agents.values()) {
        sumMu += beliefs[k]!.posterior.mu;
      }
      const meanMu = sumMu / this.agents.size;
      consensusProbs[k] = Math.max(0, meanMu + (this.priors.explorationRate / 16));
    }

    // Normalize consensus distribution
    let sum = 0;
    for (let i = 0; i <= 0xF; i++) sum += consensusProbs[i]!;
    if (sum > 0) {
      for (let i = 0; i <= 0xF; i++) consensusProbs[i] = consensusProbs[i]! / sum;
    }

    return consensusProbs;
  }
}
