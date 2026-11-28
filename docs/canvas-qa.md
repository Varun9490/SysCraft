# SysCraft canvas / lab runtime QA

- Generated (UTC): 2026-11-28T06:14:15.533Z
- Target: `https://sys-craft.vercel.app`
- Routes: `/canvas`, `/labs/bitly-url-shortener`
- Browser: Playwright Chromium 156.0.8078.4 (headless)
- Result: **15/15 PASS** — 0 critical failure(s), 0 non-critical failure(s); script exit **0 (PASS)**

## Check results

| # | Check | Critical | Result | Observed |
| --- | --- | --- | --- | --- |
| 1 | /canvas workspace boots without console/page/hydration errors | yes | PASS | {"reactFlowMounted":1,"errorDelta":{"console":0,"hydration":0,"page":0,"http":0},"header":"Skip to main content SysCraft Freeform Workspace Search… Ctrl K paused rps 0 p99 0ms err 0.00% cost $0.00/h Run Export Resources Blueprints Learn Tools EDGE 2 CDN Edge (C"} |
| 2 | nodes, edges, resource palette and toolbar render | yes | PASS | {"nodes":4,"edges":3,"labels":["Edge","Checkout","Session","Orders"],"paletteButtons":30,"toolbarSelect":1,"addButton":1} |
| 3 | add resource (palette click / toolbar Add; drag-drop support inspected) | yes | PASS | {"dragDropExposed":false,"note":"No draggable palette rows or drag handlers exist in the UI; click-to-add is the supported pathway.","nodesBefore":4,"afterPaletteClick":5,"afterToolbarAdd":6} |
| 4 | dragging a node changes its position and survives reload | yes | PASS | {"nodeId":"n_mx00kwco_d239c184","before":"translate(80px, 200px)","afterDrag":"translate(181.818px, 268.182px)","afterReload":"translate(181.818px, 268.182px)","dragDistancePx":122.5,"restoreDriftPx":0,"storageKey":"syscraft-canvas-v1","storage":{"bytes":2379,"hasNode":true}} |
| 5 | simulation start changes telemetry without node remounts | yes | PASS | {"running":true,"stimulus":"toolbar Add changed topology load","baseline":{"live":true,"rps":1100,"p99":111,"err":0,"cost":6.17},"changed":{"live":true,"rps":1600,"p99":111,"err":0,"cost":7.13},"later":{"live":true,"rps":1600,"p99":111,"err":0,"cost":7.13},"changedKeys":["rps","cost"],"sampleNode":"Edge gateway API 500 rps · 2% cpu · p99 25.0ms","distinctNodeTelemetrySamples":2,"originalNodeIds":"n_mx00kwco_1bd89872,n_mx00kwco_301cde30,n_mx00kwco_396dfce3,n_mx00kwco_d239c184,n_mx00kx4r_422ad50b,n_mx00kxri_f5386474","stableNodeIds":"n_mx00kwco_1bd89872,n_mx00kwco_301cde30,n_mx00kwco_396dfce3,n_mx00kwco_d239c184,n_mx00kx4r_422ad50b,n_mx00kxri_f5386474,n_mx00lctu_c0908b63"} |
| 6 | pausing simulation freezes telemetry | yes | PASS | {"paused":true,"first":{"live":false,"rps":1600,"p99":111,"err":0,"cost":7.13},"second":{"live":false,"rps":1600,"p99":111,"err":0,"cost":7.13},"nodeTelemetry":"Edge gateway API 500 rps · 2% cpu · p99 25.0ms"} |
| 7 | chaos control changes visible state and telemetry | yes | PASS | {"chaos":"traffic spike","bannerCount":3,"before":{"live":false,"rps":1600,"p99":111,"err":0,"cost":7.13},"after":{"live":true,"rps":4900,"p99":122,"err":0,"cost":7.13},"autoStarted":true} |
| 8 | auto-layout and reset/clear controls work | yes | PASS | {"nodesMovedByLayout":7,"maxLayoutShiftPx":425.5,"afterReset":{"nodes":4,"edges":3},"afterClear":0,"afterReloadStarter":4} |
| 9 | topology edits persist across reload | yes | PASS | {"before":4,"afterAdd":5,"afterReload":5,"redisNodes":1,"storageBytes":2018} |
| 10 | No errors accumulated during canvas interactions | yes | PASS | {"errorDelta":{"console":0,"hydration":0,"page":0,"http":0}} |
| 11 | lab brief starts, lab canvas mounts, stage and grading UI present | yes | PASS | {"title":"URL Shortener (Bitly)","canvasMounted":1,"labNodes":0,"tabs":["Brief","Stages","Resources"],"stageOne":"Brief Stages Resources 1 2 3 4 5 6 STAGE 1 OF 6 · BRIEF Scope the problem Write the requirements as commitments, not headings. Functional: shorten (custom aliases, bulk import, expiry, disable/kill), redirect, click anal","gradingAtBrief":0,"gradedStage":"Brief Stages Resources 3 4 5 6 STAGE 3 OF 6 · TOPOLOGY Build the topology Place the tiers and draw the request paths. Edge: dns_load_balancer / cdn_edge for anycast locality and absorbed ambient repeats. Front door: api_","gradingAtTopology":1,"verdicts":2} |
| 12 | mobile viewport: controls reachable, no horizontal overflow | yes | PASS | {"viewport":{"width":390,"height":844},"scrollWidth":390,"innerWidth":390,"overflowAfter":0,"runVisible":true,"addVisible":true,"chaosVisible":true,"chaosExpanded":"true","paletteWidth":300,"nodesBefore":0,"nodesAfter":1} |
| 13 | tablet viewport: controls reachable, no horizontal overflow | yes | PASS | {"viewport":{"width":768,"height":1024},"scrollWidth":768,"innerWidth":768,"overflowAfter":0,"runVisible":true,"addVisible":true,"chaosVisible":true,"chaosExpanded":"true","paletteWidth":300,"nodesBefore":0,"nodesAfter":1} |
| 14 | frame timing while simulation runs (reported, thresholds 50/80ms) | no | PASS | {"running":true,"stats":{"frames":90,"average":18.147777777777776,"p95":33.30000000000018,"max":33.399999999999636},"metrics":{"live":true,"rps":500,"p99":111,"err":0,"cost":3.65}} |
| 15 | custom cursor does not block canvas pointer interactions | yes | PASS | {"mounted":true,"pointerEvents":"none","cursorClass":true,"topAtCenter":"DIV.react-flow__pane selection","selectedCount":1,"deleteEnabled":true,"dragDistancePx":80.3} |

## Detailed observations

### 1. /canvas workspace boots without console/page/hydration errors — PASS

- Observed: `{"reactFlowMounted":1,"errorDelta":{"console":0,"hydration":0,"page":0,"http":0},"header":"Skip to main content SysCraft Freeform Workspace Search… Ctrl K paused rps 0 p99 0ms err 0.00% cost $0.00/h Run Export Resources Blueprints Learn Tools EDGE 2 CDN Edge (C"}`

### 2. nodes, edges, resource palette and toolbar render — PASS

- Observed: `{"nodes":4,"edges":3,"labels":["Edge","Checkout","Session","Orders"],"paletteButtons":30,"toolbarSelect":1,"addButton":1}`

### 3. add resource (palette click / toolbar Add; drag-drop support inspected) — PASS

- Observed: `{"dragDropExposed":false,"note":"No draggable palette rows or drag handlers exist in the UI; click-to-add is the supported pathway.","nodesBefore":4,"afterPaletteClick":5,"afterToolbarAdd":6}`

### 4. dragging a node changes its position and survives reload — PASS

- Observed: `{"nodeId":"n_mx00kwco_d239c184","before":"translate(80px, 200px)","afterDrag":"translate(181.818px, 268.182px)","afterReload":"translate(181.818px, 268.182px)","dragDistancePx":122.5,"restoreDriftPx":0,"storageKey":"syscraft-canvas-v1","storage":{"bytes":2379,"hasNode":true}}`

### 5. simulation start changes telemetry without node remounts — PASS

- Observed: `{"running":true,"stimulus":"toolbar Add changed topology load","baseline":{"live":true,"rps":1100,"p99":111,"err":0,"cost":6.17},"changed":{"live":true,"rps":1600,"p99":111,"err":0,"cost":7.13},"later":{"live":true,"rps":1600,"p99":111,"err":0,"cost":7.13},"changedKeys":["rps","cost"],"sampleNode":"Edge gateway API 500 rps · 2% cpu · p99 25.0ms","distinctNodeTelemetrySamples":2,"originalNodeIds":"n_mx00kwco_1bd89872,n_mx00kwco_301cde30,n_mx00kwco_396dfce3,n_mx00kwco_d239c184,n_mx00kx4r_422ad50b,n_mx00kxri_f5386474","stableNodeIds":"n_mx00kwco_1bd89872,n_mx00kwco_301cde30,n_mx00kwco_396dfce3,n_mx00kwco_d239c184,n_mx00kx4r_422ad50b,n_mx00kxri_f5386474,n_mx00lctu_c0908b63"}`

### 6. pausing simulation freezes telemetry — PASS

- Observed: `{"paused":true,"first":{"live":false,"rps":1600,"p99":111,"err":0,"cost":7.13},"second":{"live":false,"rps":1600,"p99":111,"err":0,"cost":7.13},"nodeTelemetry":"Edge gateway API 500 rps · 2% cpu · p99 25.0ms"}`

### 7. chaos control changes visible state and telemetry — PASS

- Observed: `{"chaos":"traffic spike","bannerCount":3,"before":{"live":false,"rps":1600,"p99":111,"err":0,"cost":7.13},"after":{"live":true,"rps":4900,"p99":122,"err":0,"cost":7.13},"autoStarted":true}`

### 8. auto-layout and reset/clear controls work — PASS

- Observed: `{"nodesMovedByLayout":7,"maxLayoutShiftPx":425.5,"afterReset":{"nodes":4,"edges":3},"afterClear":0,"afterReloadStarter":4}`

### 9. topology edits persist across reload — PASS

- Observed: `{"before":4,"afterAdd":5,"afterReload":5,"redisNodes":1,"storageBytes":2018}`

### No errors accumulated during canvas interactions — PASS

- Observed: `{"errorDelta":{"console":0,"hydration":0,"page":0,"http":0}}`

### 10. lab brief starts, lab canvas mounts, stage and grading UI present — PASS

- Observed: `{"title":"URL Shortener (Bitly)","canvasMounted":1,"labNodes":0,"tabs":["Brief","Stages","Resources"],"stageOne":"Brief Stages Resources 1 2 3 4 5 6 STAGE 1 OF 6 · BRIEF Scope the problem Write the requirements as commitments, not headings. Functional: shorten (custom aliases, bulk import, expiry, disable/kill), redirect, click anal","gradingAtBrief":0,"gradedStage":"Brief Stages Resources 3 4 5 6 STAGE 3 OF 6 · TOPOLOGY Build the topology Place the tiers and draw the request paths. Edge: dns_load_balancer / cdn_edge for anycast locality and absorbed ambient repeats. Front door: api_","gradingAtTopology":1,"verdicts":2}`

### 11. mobile viewport: controls reachable, no horizontal overflow — PASS

- Observed: `{"viewport":{"width":390,"height":844},"scrollWidth":390,"innerWidth":390,"overflowAfter":0,"runVisible":true,"addVisible":true,"chaosVisible":true,"chaosExpanded":"true","paletteWidth":300,"nodesBefore":0,"nodesAfter":1}`

### 11. tablet viewport: controls reachable, no horizontal overflow — PASS

- Observed: `{"viewport":{"width":768,"height":1024},"scrollWidth":768,"innerWidth":768,"overflowAfter":0,"runVisible":true,"addVisible":true,"chaosVisible":true,"chaosExpanded":"true","paletteWidth":300,"nodesBefore":0,"nodesAfter":1}`

### 12. frame timing while simulation runs (reported, thresholds 50/80ms) — PASS

- Observed: `{"running":true,"stats":{"frames":90,"average":18.147777777777776,"p95":33.30000000000018,"max":33.399999999999636},"metrics":{"live":true,"rps":500,"p99":111,"err":0,"cost":3.65}}`

### 13. custom cursor does not block canvas pointer interactions — PASS

- Observed: `{"mounted":true,"pointerEvents":"none","cursorClass":true,"topAtCenter":"DIV.react-flow__pane selection","selectedCount":1,"deleteEnabled":true,"dragDistancePx":80.3}`

## Frame timing (while simulation runs)

- 90 rAF frames: average **18.15 ms**, p95 **33.30 ms**, max 33.40 ms.
- Ceilings: average <= 50 ms, p95 <= 80 ms (reporting only; exceeding them marks a non-critical failure).

## Console / page errors

- Same-origin console errors: 0
- Hydration warnings: 0
- Uncaught page errors: 0
- Same-origin HTTP >= 400: 0
- Failed requests (all origins, informational): 20

## Interface notes and bugs

- **Drag-and-drop from the palette is not exposed**: no `draggable` rows or drag handlers exist. The supported add pathways are the searchable palette's click-to-add rows and the floating toolbar's `Resource palette` select + `Add` button; both were exercised with real clicks.
- **Simulation is started manually on a freshly loaded starter topology**: loading the starter template leaves the transport in `Run` state. Pausing freezes telemetry; the injected chaos control auto-starts the clock so its impact is visible. A persisted topology restores with the clock already live.
- **Steady-state telemetry**: the deterministic engine converges to fixed req/s, CPU, p99 and cost numbers when the topology is unchanged. The telemetry check first samples natural tick variation, then (if already converged) adds a primitive through the toolbar and verifies req/s and cost respond. Node badges stay constant at steady state; the chaos check demonstrates p99 movement.
- **Lab grading UI is stage-scoped**: the bitly lab's first two stages are brief/estimate stages with no grading rules, so the `Automated checks` panel appears from stage 3 (topology) onward. The suite advances through the two non-graded stages with two quick clicks; no long simulation is run.
- No critical runtime bugs were observed in this run. Two consecutive full runs passed 15/15; an earlier one-off lab canvas mount timeout was not reproducible in three follow-up immediate-click probes and is attributed to a slow lazy-chunk fetch.

## Re-run

```bash
node scripts/qa-canvas.mjs [baseUrl]
```

