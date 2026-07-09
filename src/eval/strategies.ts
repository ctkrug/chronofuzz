import type { ProbeOutcome, Verdict } from "./types";
import { pass, fail, ambiguous, sameInstant, observed, isRejection } from "./grading";

/**
 * A grade function turns the outcomes of a landmine's probes into a decided
 * verdict. These factories build the handful of grading strategies the corpus
 * needs; each is pure (no Date-now, no DOM) so it unit-tests in isolation.
 */
export type GradeFn = (outcomes: ProbeOutcome[]) => Verdict;

/**
 * The single probe outcome these strategies grade on. Every strategy here runs
 * exactly one probe; if none arrived, that is itself an errored outcome rather
 * than a crash.
 */
function single(outcomes: ProbeOutcome[]): ProbeOutcome {
  return outcomes[0] ?? { ok: false, error: "No probe outcome was produced." };
}

/**
 * The correct behavior is to reproduce one exact instant. Passes when the
 * function's output denotes `expectedIso` (compared as an absolute instant, so
 * formatting differences don't matter); fails otherwise, surfacing the wrong
 * value inline. A rejection here is itself a failure — the input was valid.
 */
export function expectInstant(expectedIso: string, note: string): GradeFn {
  return (outcomes) => {
    const outcome = single(outcomes);
    const actual = observed(outcome);
    if (outcome.ok && sameInstant(outcome.value, expectedIso)) {
      return pass("Correct instant", note, actual);
    }
    const verdict = fail("Wrong instant", note, actual);
    verdict.expected = expectedIso;
    return verdict;
  };
}

/**
 * The input denotes a nonexistent or invalid instant, so the correct behavior
 * is to refuse it — throw or return Invalid Date. Passes on a rejection; fails
 * when the function silently manufactures a value (e.g. rolling Feb 29 of a
 * non-leap year forward to March 1), surfacing that wrong value inline.
 */
export function expectRejection(note: string): GradeFn {
  return (outcomes) => {
    const outcome = single(outcomes);
    const actual = observed(outcome);
    if (isRejection(outcome)) {
      return pass("Rejected (as it should)", note, actual);
    }
    const verdict = fail("Silently accepted an impossible date", note, actual);
    verdict.expected = "a rejection (throw or Invalid Date)";
    return verdict;
  };
}

/**
 * A spring-forward gap: the wall-clock time never existed, so a correct
 * implementation either rejects it or normalizes it forward to `forwardIso`.
 * Fails only when the function produces some other instant, which means it
 * accepted a time the clock skipped.
 */
export function expectShiftOrReject(forwardIso: string, note: string): GradeFn {
  return (outcomes) => {
    const outcome = single(outcomes);
    const actual = observed(outcome);
    if (isRejection(outcome)) {
      return pass("Rejected the skipped time", note, actual);
    }
    if (outcome.ok && sameInstant(outcome.value, forwardIso)) {
      return pass("Normalized forward correctly", note, actual);
    }
    const verdict = fail("Accepted a time that never existed", note, actual);
    verdict.expected = `rejection, or ${forwardIso}`;
    return verdict;
  };
}

/**
 * The input is inherently ambiguous (a fall-back hour, a locale-dependent
 * format): there is no single correct instant, so the verdict is always
 * ambiguous and never silently coerced into pass or fail. The function's chosen
 * value is surfaced so the user can see which reading it picked.
 */
export function alwaysAmbiguous(note: string): GradeFn {
  return (outcomes) => {
    const outcome = single(outcomes);
    return ambiguous("No single correct answer", note, observed(outcome));
  };
}
