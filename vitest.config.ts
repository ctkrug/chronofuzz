import { defineConfig } from "vitest/config";

// Pin the runtime timezone so zone-dependent grading (DST transitions,
// date-only parsing) is deterministic across developer machines and CI. Set
// before the test pool forks so worker processes inherit it.
process.env.TZ = "UTC";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // Worker entry points and the app bootstrap are thin message-plumbing
      // wrappers around the tested evalCore/pyEvalCore (see
      // docs/ARCHITECTURE.md) — exercising them needs a real browser Worker,
      // not a unit test, so they're excluded rather than dragging the
      // meaningful number down with permanent 0%s. Type-only files have no
      // runtime statements to cover.
      exclude: [
        "src/main.ts",
        "src/language.ts",
        "src/sandbox/jsWorker.ts",
        "src/sandbox/pyWorker.ts",
        "src/**/types.ts",
      ],
      // Floor matches the QA protocol's required minimum for core logic
      // (docs/ARCHITECTURE.md, "Run / test / build"); kept below the current
      // measured value so incremental feature work has headroom without
      // silently regressing coverage.
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 90,
        functions: 80,
      },
    },
  },
});
