# SysCraft production QA scorecard

- Generated (UTC): 2026-11-27T14:17:03.901Z
- BASE_URL: `http://127.0.0.1:4173`
- Overall score: **100 / 100**
- Checks: 36/36 passed (0 failed)
- Critical failures: 0 — run exit status: PASS

## Category scores

| Category | Weight | Passed | Score |
| --- | ---: | ---: | ---: |
| Routes and content | 20 | 5/5 | 20 |
| Core learning interactions | 20 | 7/7 | 20 |
| Landing and interactive motion | 15 | 5/5 | 15 |
| Compact dock and preferences | 10 | 4/4 | 10 |
| Quiz and local persistence | 15 | 5/5 | 15 |
| Tools, map, and labs | 10 | 6/6 | 10 |
| Responsiveness, reduced motion, accessibility | 10 | 4/4 | 10 |

## Frame timing

- Steady-state 90 rAF frames after fonts and entrance reveals have settled: average **22.59 ms**, p95 **33.40 ms**.
- Thresholds: average <= 34 ms, p95 <= 50 ms (headless vsync is not treated as a hard failure).

## Failures

- None.

## Browser error telemetry

- Console errors (same-origin): 0
- Hydration warnings: 0
- Uncaught page errors: 0
- HTTP >= 400 (same-origin): 0
- Failed requests (all origins): 247

## Check log

| Category | Check | Critical | Result |
| --- | --- | --- | --- |
| routes | all required routes render without HTTP 404 or empty body | yes | PASS |
| routes | no console, hydration, page, or same-origin network errors across routes | yes | PASS |
| routes | every track card links to the correct track | yes | PASS |
| routes | first lesson navigation works from paths index | yes | PASS |
| routes | mobile menu navigates to Paths | no | PASS |
| learning | Story / Engineer / Both controls switch mode without resetting the step | yes | PASS |
| learning | engineer details are on demand via layer tabs / disclosure, never a second wall | yes | PASS |
| learning | Next, Previous, step dots, and arrow keys change the active step | yes | PASS |
| learning | lesson notes persist after reload | yes | PASS |
| learning | bookmark toggle registers and appears in the utility dock | yes | PASS |
| learning | security shield toggle changes state and telemetry | yes | PASS |
| learning | blog final step marks the field note as read | yes | PASS |
| landing | hero shows distinct request/response paths and both packet lanes animate | yes | PASS |
| landing | spike, kill-node, and attack controls update aria-pressed and telemetry | yes | PASS |
| landing | track showcase has exactly 7 track cards | yes | PASS |
| landing | 90 rAF frames measured within performance thresholds | no | PASS |
| landing | reduced motion disables custom cursor and continuous decorative animation | no | PASS |
| dock | utility launcher is compact (<= 56px on each axis) by default | yes | PASS |
| dock | opening the dock exposes search, notes, bookmarks, mode, ambient, cursor, break | yes | PASS |
| dock | Escape and outside click both close the dock | yes | PASS |
| dock | open dock popover fits inside a 390px mobile viewport | yes | PASS |
| quiz | fresh context shows the empty state with no active questions | yes | PASS |
| quiz | seeded single-server progress produces a question with exactly 4 choices | yes | PASS |
| quiz | answer reveals an explanation and history survives reload | yes | PASS |
| quiz | settings exposes export and import controls | yes | PASS |
| quiz | preference changes persist after reload | no | PASS |
| tools | capacity estimator output updates when DAU changes | yes | PASS |
| tools | KV cache and SLA calculators render finite numeric values | yes | PASS |
| tools | notation search returns the p99 entry | yes | PASS |
| tools | security checklist exposes component filters | yes | PASS |
| tools | map search finds the Kafka field note or lab | yes | PASS |
| tools | lab brief exposes a start / open-canvas action | yes | PASS |
| a11y | each main route has exactly one h1 | yes | PASS |
| a11y | buttons and links have accessible names | yes | PASS |
| a11y | no horizontal overflow at 390px on main routes | yes | PASS |
| a11y | keyboard focus shows a visible outline or ring | yes | PASS |

