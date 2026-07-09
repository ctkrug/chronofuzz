import { defineConfig } from "vitest/config";

// Pin the runtime timezone so zone-dependent grading (DST transitions,
// date-only parsing) is deterministic across developer machines and CI. Set
// before the test pool forks so worker processes inherit it.
process.env.TZ = "UTC";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
  },
});
