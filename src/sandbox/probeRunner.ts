import type { ProbeRunner } from "../eval/engine";
import { JsSandboxRunner } from "./runner";

/**
 * Adapts the Web Worker sandbox into the grading engine's ProbeRunner: each
 * probe runs the pasted source in a fresh worker and the JsRunResult is
 * narrowed to the ProbeOutcome shape the grader consumes.
 */
export function jsProbeRunner(runner: JsSandboxRunner, source: string): ProbeRunner {
  return async (probe) => {
    const result = await runner.run(source, probe.isoInput, probe.timeZone);
    return result.ok ? { ok: true, value: result.value } : { ok: false, error: result.error };
  };
}
