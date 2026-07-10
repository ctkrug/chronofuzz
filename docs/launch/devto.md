---
title: "I built a tool that runs your date function against real calendar landmines"
published: false
tags: javascript, python, testing, webdev
---

Almost nobody writes a DST-fallback test. Not because they don't know daylight saving exists, but
because writing the test case is its own research project. To assert that `2023-03-12T02:30:00` is
invalid in `America/New_York`, you first have to know that the clocks jumped from 1:59:59 straight
to 3:00:00 that morning, so 2:30 AM never happened. Multiply that by leap seconds, the 1900 vs 2000
century rule, the 2038 rollover, and ISO week-year boundaries, and you can see why the test never
gets written and the bug ships.

So I built [Chronofuzz](https://apps.charliekrug.com/chronofuzz/): paste a JavaScript or Python
date-handling function, hit run, and it executes your function against a curated battery of 20 real
date/time landmines and shows you exactly which one breaks and the wrong value it returned. The
source is on [GitHub](https://github.com/ctkrug/chronofuzz).

Two build decisions turned out more interesting than I expected.

## Running two languages in one sandbox

The whole point is that you paste arbitrary code, so it has to run somewhere that can't touch the
page, the network, or your data. Both languages run in Web Workers, but with opposite lifecycle
strategies.

JavaScript gets a **fresh worker per landmine**. Spawning a worker is cheap, and it buys a clean
kill switch: if your pasted function hangs in an infinite loop, I call `worker.terminate()` on a
timeout and the next landmine starts from a clean slate. Inside the worker I also override `fetch`,
`XMLHttpRequest`, and `WebSocket` with getters that throw, so pasted code can't exfiltrate anything
even though it already has no host access.

Python is the opposite. It runs through [Pyodide](https://pyodide.org) (CPython compiled to
WebAssembly), and loading that runtime costs multiple megabytes. Paying it once per landmine would
be absurd, so Python reuses **one persistent worker** across a whole run. A hang still gets killed
with `terminate()`, which drops the loaded runtime, so the next call respawns and reloads. Both
runners implement the same `run(source, isoInput, timeZone)` interface, so the grading engine never
knows or cares which language it is driving.

## Ambiguous is a first-class verdict

The naive version of this tool grades every landmine as pass or fail against one expected value.
That is wrong for a whole class of inputs. During the fall-back hour, 1:30 AM happens twice, once at
UTC-4 and once at UTC-5. There is no single correct instant. `01/02/2024` is January 2 in the US and
February 1 almost everywhere else, and without a source locale there is no right answer either.

Forcing those into pass/fail would punish a correct implementation for not guessing. So grading has
three outcomes: **pass**, **fail**, and **ambiguous**. Each landmine carries its own evaluator, so
"impossible leap day" checks for a rejection while "fall-back hour" checks that you were explicit
about the ambiguity instead of silently picking one instant. The verdict type models all three
states directly rather than bolting ambiguity on as a special case.

## What I would do differently

The corpus is hand-written data, and the grading rules live next to it in code. That is deliberate,
because the accuracy of the corpus is the whole credibility of the tool, and I did not want
machine-generated edge cases. But it means adding a landmine touches two files. If the battery grows
past a few dozen entries I would move the expected-instant spec inline with each landmine so a new
case is one object, not two edits.

The QA pass also caught a genuinely nasty bug: a failed Pyodide CDN load was caching the rejected
promise forever, so one transient network blip permanently wedged Python mode for the rest of the
session. The loader now clears the cache on failure so the next call retries.

Try it on your own date code: [apps.charliekrug.com/chronofuzz](https://apps.charliekrug.com/chronofuzz/).
Source and the full landmine list are [on GitHub](https://github.com/ctkrug/chronofuzz).
