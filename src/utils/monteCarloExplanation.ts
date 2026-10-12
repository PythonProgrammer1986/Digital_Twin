/**
 * Monte Carlo Analysis Explanation Utility
 * Provides a crystal-clear, single-line explanation of Monte Carlo stochastic results.
 */

export interface MonteCarloStats {
  pMeetTarget: number;
  p10: number;
  p50: number;
  p90: number;
  mean: number;
}

/**
 * Explains Monte Carlo analysis results in a single, plain-language, easy-to-understand sentence.
 * Clearly articulates:
 * 1. Number of simulated months
 * 2. Real-world delay context (variations in labor, supplier shortages, quality rework)
 * 3. On-time delivery probability percentage
 * 4. The monthly target requirement
 * 5. Expected completed truck output (median P50 and realistic range P10-P90)
 */
export function getMonteCarloOneLiner(
  monteCarlo: MonteCarloStats,
  demand: number,
  mcRuns: number = 50
): string {
  const p = Math.round(monteCarlo.pMeetTarget);
  const p50 = Math.round(monteCarlo.p50);
  const p10 = Math.round(monteCarlo.p10);
  const p90 = Math.round(monteCarlo.p90);

  if (p >= 85) {
    return `In ${mcRuns} simulated months with real-world delays, your line has an excellent ${p}% chance of hitting the ${demand}-truck monthly target (typically completing ${p50} trucks, between ${p10} and ${p90}).`;
  } else if (p >= 60) {
    return `In ${mcRuns} simulated months with real-world delays, your line has a moderate ${p}% chance of hitting the ${demand}-truck monthly target (typically completing ${p50} trucks; vulnerable if supply or rework spikes).`;
  } else {
    return `In ${mcRuns} simulated months with real-world delays, your line has a high shortfall risk with only a ${p}% chance of hitting the ${demand}-truck target (expected output is ${p50} of ${demand} trucks).`;
  }
}

/**
 * Compact single-line summary for badges, tooltips, and tight headers.
 */
export function getMonteCarloShortOneLiner(
  monteCarlo: { pMeetTarget: number; p50: number },
  demand: number
): string {
  const p = Math.round(monteCarlo.pMeetTarget);
  const p50 = Math.round(monteCarlo.p50);
  return `${p}% probability of achieving ${demand} trucks/month target (P50 median output: ${p50} units).`;
}
