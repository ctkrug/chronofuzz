import type { ProbeRunner } from "../eval/engine";
import type { SandboxRunner } from "./types";

/**
 * Adapts a language sandbox runner (JsSandboxRunner or PySandboxRunner) into
 * the grading engine's ProbeRunner: each probe runs the pasted source through
 * the runner and the RunResult is narrowed to the ProbeOutcome shape the
 * grader consumes.
 */
export function sandboxProbeRunner(runner: SandboxRunner, source: string): ProbeRunner {
  return async (probe) => {
    const result = await runner.run(source, probe.isoInput, probe.timeZone);
    return result.ok ? { ok: true, value: result.value } : { ok: false, error: result.error };
  };
}
