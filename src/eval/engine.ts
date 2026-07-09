import type { Landmine } from "../corpus/types";
import type { Probe, ProbeOutcome, Verdict } from "./types";
import { getEvaluator } from "./evaluators";

/**
 * Runs one probe against the function under test and normalizes the result to a
 * ProbeOutcome. Injected rather than imported so the grading pipeline can be
 * driven by the real Web Worker sandbox in the app and by a plain function in
 * tests, with no DOM/Worker dependency in the pure logic.
 */
export type ProbeRunner = (probe: Probe) => Promise<ProbeOutcome>;

export interface LandmineResult {
  landmine: Landmine;
  verdict: Verdict;
}

/** Runs every probe a landmine's evaluator declares, then grades the outcomes. */
export async function evaluateLandmine(
  landmine: Landmine,
  runProbe: ProbeRunner,
): Promise<Verdict> {
  const evaluator = getEvaluator(landmine);
  const outcomes: ProbeOutcome[] = [];
  for (const probe of evaluator.probes) {
    outcomes.push(await runProbe(probe));
  }
  return evaluator.grade(outcomes);
}

/**
 * Evaluates the whole battery in order. Sequential on purpose: each JS run
 * spins up a fresh Web Worker, and running them one at a time keeps peak memory
 * bounded and the results streaming in a stable, readable order.
 */
export async function evaluateBattery(
  landmines: readonly Landmine[],
  runProbe: ProbeRunner,
): Promise<LandmineResult[]> {
  const results: LandmineResult[] = [];
  for (const landmine of landmines) {
    results.push({ landmine, verdict: await evaluateLandmine(landmine, runProbe) });
  }
  return results;
}
