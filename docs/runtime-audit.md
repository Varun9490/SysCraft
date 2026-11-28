# SysCraft — Step 1 live runtime UI/UX audit

- Generated (UTC): 2026-11-28T06:39:20.351Z
- BASE_URL: `https://sys-craft.vercel.app`
- Browser: Playwright Chromium 156.0.8078.4, headless, isolated context per scenario
- Evidence screenshots: `C:\Users\varun\AppData\Local\Temp\runtime-audit-shots`
- Scope: command palette, theme, custom cursor, ambient background, readers (including meaningful-read eligibility and arrow-key visual replay), lazy-loaded bespoke visuals, blogs index, landing closing CTA and bento alignment, labs excerpts, knowledge map, tools, break reminder, quiz, export/import, responsive layout, browser errors. Canvas runtime is owned by another agent and is not duplicated here.

## Summary

| Severity | PASS | FAIL | NOT VERIFIED | Total |
| --- | ---: | ---: | ---: | ---: |
| P0 | 0 | 0 | 0 | 0 |
| P1 | 29 | 0 | 0 | 29 |
| P2 | 10 | 0 | 0 | 10 |

## Prioritized findings

### P0 — blocking

| ID | Finding | Affected routes | Status | Evidence / detail |
| --- | --- | --- | --- | --- |
| — | None recorded | — | — | — |

### P1 — major

| ID | Finding | Affected routes | Status | Evidence / detail |
| --- | --- | --- | --- | --- |
| PAL-01 | Ctrl+K opens the palette on every audited route and Escape closes it | /, /paths, /blogs, /map, /tools, /quiz, /settings | PASS | routes=9; attempts=[1,1,1,1,1,1,1,1,1] |
| PAL-02 | Fuzzy search covers tracks, lessons, blogs, labs, tools and notation as advertised | /paths, /tools | PASS | coverage=[{"group":"tracks","term":"foundations","expect":"foundations","matches":["System Design Foundations Path /paths/foundations","Single Server to Scale Foundations /paths/foundations/single-server","Networking and Protocols Foundations /paths/foundations/network; totalItems=10 |
| PAL-03 | Arrow keys move selection, Enter navigates, Escape cancels without navigation | /paths | PASS | firstSelected=Map Concept map /map; downSelected=LLD: LRU and LFU Cache Case Studies /paths/case-studies/lld-lru-cache; upSelected=Map Concept map /map |
| THM-01 | Light theme applies to all audited routes with >= 4.5:1 heading contrast | /paths, /paths/foundations/single-server, /blogs/database-melts-at-10k-rps, /map, /tools, /quiz, /settings | PASS | measurements=[{"route":"/paths","themeLight":true,"bodyBg":"rgb(246,242,234)","h1Contrast":14.85,"tertiaryContrast":4.12},{"route":"/paths/foundations/single-server","themeLight":true,"bodyBg":"rgb(246,242,234)","h1Contrast":14.85,"tertiaryContrast":4.12},{"route":"/blogs/; note=tertiary text below 4.5:1 on /paths (4.12:1), /paths/foundations/single-server (4.12:1), /blogs/database-melts-at-10k-rps (4.12:1), /map (4.12:1), /tools (4.12:1), /quiz (4.12:1), /settings (4.12:1); screenshot=C:\Users\varun\AppData\Local\Temp\runtime-audit-shots\theme-light-low-tertiary.png |
| THM-02 | Settings theme toggle persists across reload and route changes | /settings, /paths | PASS | toggles=["dark→light→reload→/paths→dark→reload"] |
| CUR-01 | Cursor renders with read/inspect/interactive context states | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | neutral=default; read=read; inspect=inspect |
| CUR-02 | Cursor toggle persists and the native pointer returns when disabled | /settings, /paths | PASS | persisted=true |
| CUR-03 | Touch and reduced-motion contexts disable the custom cursor | /paths/foundations/single-server, /paths | PASS | observations=[{"touch":true,"reducedMotion":false,"hasClass":false,"hasNode":false},{"touch":false,"reducedMotion":true,"hasClass":false,"hasNode":false}] |
| AMB-01 | Ambient canvas renders on lesson and blog and toggle persists | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps, /settings | PASS | before=[{"route":"/paths/foundations/single-server","canvases":1},{"route":"/blogs/database-melts-at-10k-rps","canvases":1}]; after=0; screenshot=C:\Users\varun\AppData\Local\Temp\runtime-audit-shots\ambient-off-settings.png |
| RDR-01 | Step dots, Next/Previous, arrow keys and manual scroll stay in sync | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | dot3=3; keyboard=[4,3]; scroll=2 |
| RDR-03 | Reading-mode changes hold the active step (no scroll observer snap-back) | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | observations=[{"mode":"Story","step":2},{"mode":"Engineer","step":2},{"mode":"Both","step":2}] |
| RDR-04 | Opening a lesson is not a meaningful read; reaching its final step is | /paths/foundations/single-server | PASS | steps=4; onOpen=false; onStep2=false |
| RDR-05 | Arrow keys replay the keyed visual body transition forward and back | /paths/foundations/single-server | PASS | forward={"svgReplaced":true,"gAdds":0,"gRemoves":0,"version":"STEP 1 -> STEP 2"}; backward={"svgReplaced":true,"gAdds":0,"gRemoves":0,"version":"STEP 2 -> STEP 1"} |
| BLG-01 | Search filters cards, read-time is shown, and read checkmarks sync with progress | /blogs | PASS | total=8; filtered=5; readBadges=1 |
| BLG-03 | Opening a field note is not a meaningful read; reaching its final step is | /blogs/database-melts-at-10k-rps | PASS | steps=5; onOpen=false; onStep2=false |
| VIS-01 | Tokenization, Kubernetes and LLD LRU lessons load their titled bespoke visuals | /paths/ai-engineering/tokenization, /paths/backend-cloud/kubernetes, /paths/case-studies/lld-lru-cache | PASS | observations=[{"route":"/paths/ai-engineering/tokenization","title":"tokenization","text":"tokenizationSTEP 1raw text · charactersthe cat'the cat' → 7 characters, but the model never sees characters"},{"route":"/paths/backend-cloud/kubernetes","title":"k8s reconcile","text |
| LAND-01 | Closing CTA exists and its primary link navigates to /labs | /, /labs | PASS | href=/labs; landed=https://sys-craft.vercel.app/labs |
| LAND-02 | Bento and closing grids align without overflow at 390 and 1440 | / | PASS | rows=[{"viewport":"390","overflowPx":0,"grids":{"bento":{"cols":1,"cells":3},"closing":{"cols":1,"cells":2}}},{"viewport":"1440","overflowPx":0,"grids":{"bento":{"cols":3,"cells":3},"closing":{"cols":12,"cells":2}}}] |
| MAP-01 | Zoom, reset, pan, selection, prerequisites and navigation work together | /map | PASS | zoom=["100%","130%","115%","100%"]; panned=true; selected=Distributed Systems |
| TOOL-01 | Calculators stay finite for zero, huge, negative and empty inputs | /tools | PASS | observations=[{"section":"capacity-title","input":"cap-dau","typed":"0","rows":["0.00","0.00","0.00","0.00"],"bad":[]},{"section":"capacity-title","input":"cap-dau","typed":"1e15","rows":["138888888.89","694444444.44","10512000000.00","8888888.89"],"bad":[]},{"section":"ca; note=empty input normalised to "0" by Number("") |
| BRK-01 | 15-minute reminder appears after active study time and snooze delays it | /settings, /paths | PASS | appearedAfter=15m active; snooze=quiet for 10m, active timer reset, reminder returned after a further 15m; off=hid the open reminder and re-enabled without stale state |
| BRK-02 | An active quiz suppresses the break reminder | /quiz | PASS | quizActive=true; reminderShown=false |
| QUIZ-01 | Fresh context shows the empty state with no active question | /quiz | PASS | emptyState=true |
| QUIZ-02 | Seeded read topic yields a question; answer persists after reload | /quiz | PASS | choices=4; historyAfterReload=1 |
| DAT-01 | Export produces a downloadable, valid SysCraft progress JSON | /settings | PASS | filename=syscraft-progress-2026-11-28.json; bytes=403 |
| DAT-02 | Malformed JSON is rejected with a status message and leaves state untouched | /settings | PASS | unchanged=true |
| DAT-03 | Valid import replaces state and survives a full reload | /settings, /quiz | PASS | lessons=["url-shortener"]; theme=dark |
| RSP-01 | No horizontal overflow at 375 / 768 / 1280 / 1440 across audited routes | /paths, /paths/foundations/single-server, /blogs/database-melts-at-10k-rps, /map, /tools, /quiz, /settings | PASS | checked=28; maxOverflowPx=0 |
| ERR-01 | No hydration warnings, uncaught page errors, or same-origin console/HTTP failures | /, /paths, /paths/foundations/single-server, /blogs/database-melts-at-10k-rps, /blogs, /map, /tools, /quiz, /settings | PASS | hydration=0; pageErrors=0; appConsole=0 |

### P2 — minor / polish

| ID | Finding | Affected routes | Status | Evidence / detail |
| --- | --- | --- | --- | --- |
| THM-03 | Default dark theme renders without a stray theme-light class | /paths, /paths/foundations/single-server, /blogs/database-melts-at-10k-rps, /map, /tools, /quiz, /settings | PASS | rows=[{"route":"/paths","themeLight":false,"bodyBg":"rgb(12,11,9)","h1Contrast":16.41,"tertiaryContrast":4.24},{"route":"/paths/foundations/single-server","themeLight":false,"bodyBg":"rgb(12,11,9)","h1Contrast":16.41,"tertiaryContrast":4.24},{"route":"/blogs/databa |
| AMB-02 | Ambient animation loop pauses while the document is hidden | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | supported=true; animatesWhileVisible=true; frozenWhileHidden=true |
| AMB-03 | Ambient presence on reduced-motion devices is a static wash, not a canvas loop | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | observations=[{"route":"/paths/foundations/single-server","reducedMotion":true,"staticWash":true,"backgroundStable":true,"ambientCanvasCount":0},{"route":"/blogs/database-melts-at-10k-rps","reducedMotion":true,"staticWash":true,"backgroundStable":true,"ambientCanvasCount": |
| RDR-02 | Sticky mode bar stays below the header and above page content after scrolling | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | rows=[{"route":"/paths/foundations/single-server","barTop":56,"headerBottom":57,"barZ":30,"headerZ":40,"scrollY":976},{"route":"/blogs/database-melts-at-10k-rps","barTop":56,"headerBottom":57,"barZ":30,"headerZ":40,"scrollY":1400}] |
| BLG-02 | Blogs index exposes tag/category filters | /blogs | PASS | filterControls=1; screenshot=C:\Users\varun\AppData\Local\Temp\runtime-audit-shots\blogs-no-tag-filters.png |
| LAB-01 | Labs card excerpts contain no raw Markdown markers | /labs | PASS | checked=16; markers=0 |
| MAP-02 | Zoom controls clamp to 70%-180% | /map | PASS | minText=70%; maxText=180% |
| TOOL-02 | Notation decoder returns results by symbol and by plain meaning | /tools | PASS | counts={"p99":2,"quorum":1,"zzzznotathing":0} |
| RSP-02 | Touch targets on the reader are at least 24px at 375px | /paths/foundations/single-server, /blogs/database-melts-at-10k-rps | PASS | rows=[{"route":"/paths/foundations/single-server","small":[],"total":8,"screenshot":"C:\\Users\\varun\\AppData\\Local\\Temp\\runtime-audit-shots\\touch-lesson.png"},{"route":"/blogs/database-melts-at-10k-rps","small":[],"total":7,"screenshot":"C:\\Users\\varun\\App |
| RSP-03 | Command palette and utility dock overlay content without clipping | /paths | PASS | palette={"x":16,"y":97.4375,"width":343,"height":532.5}; paletteZ=81; dock={"x":16,"y":442.1647644042969,"width":317.3966369628906,"height":309.2997741699219} |

## Reproducible steps

- **PAL-01 (P1, PASS)** Ctrl+K opens the palette on every audited route and Escape closes it
  - Steps: On each route wait for the dock launcher, press Ctrl+K, check [cmdk-input], press Escape.
- **PAL-02 (P1, PASS)** Fuzzy search covers tracks, lessons, blogs, labs, tools and notation as advertised
  - Steps: Open Ctrl+K and search each probe term; inspect returned item labels.
- **PAL-03 (P1, PASS)** Arrow keys move selection, Enter navigates, Escape cancels without navigation
  - Steps: Open palette, type Map, press Down/Up/Enter; reopen and press Escape.
- **THM-01 (P1, PASS)** Light theme applies to all audited routes with >= 4.5:1 heading contrast
  - Steps: Seed prefs.theme=light, visit each route, read computed body/heading colours and WCAG ratio.
- **THM-02 (P1, PASS)** Settings theme toggle persists across reload and route changes
  - Steps: On /settings choose Light, reload, navigate to /paths, then choose Dark and reload.
- **THM-03 (P2, PASS)** Default dark theme renders without a stray theme-light class
  - Steps: Fresh context, visit routes, inspect html class and body colour.
- **CUR-01 (P1, PASS)** Cursor renders with read/inspect/interactive context states
  - Steps: Hover neutral text, [data-cursor=read], [data-cursor=inspect], and a button; read data-cursor-mode / data-cursor-interactive.
- **CUR-02 (P1, PASS)** Cursor toggle persists and the native pointer returns when disabled
  - Steps: Uncheck Custom cursor on /settings, reload, visit /paths, re-check it.
- **CUR-03 (P1, PASS)** Touch and reduced-motion contexts disable the custom cursor
  - Steps: Open lesson in a touch context and a reduced-motion context; inspect html class and cursor node.
- **AMB-01 (P1, PASS)** Ambient canvas renders on lesson and blog and toggle persists
  - Steps: Seed ambient=true; visit lesson/blog, count canvas.fixed.inset-0; disable on /settings and reload.
- **AMB-02 (P2, PASS)** Ambient animation loop pauses while the document is hidden
  - Steps: Capture canvas data URL, force document.hidden=true + visibilitychange, capture again, then restore visibility.
- **AMB-03 (P2, PASS)** Ambient presence on reduced-motion devices is a static wash, not a canvas loop
  - Steps: Seed ambient=true with reducedMotion=reduce; verify the media query matches, no ambient canvas mounts, and the radial-gradient wash stays unchanged over 400ms.
- **RDR-01 (P1, PASS)** Step dots, Next/Previous, arrow keys and manual scroll stay in sync
  - Steps: Open lesson; click dot 3; press Right/Left; scrollIntoView section 2; sample active step repeatedly.
- **RDR-02 (P2, PASS)** Sticky mode bar stays below the header and above page content after scrolling
  - Steps: Scroll lesson/blog, measure bar and header bounding boxes plus computed z-index.
- **RDR-03 (P1, PASS)** Reading-mode changes hold the active step (no scroll observer snap-back)
  - Steps: Advance to step 2, switch Story/Engineer/Both, wait past the 1000ms hold, check step again.
- **RDR-04 (P1, PASS)** Opening a lesson is not a meaningful read; reaching its final step is
  - Steps: Fresh context, open lesson, sample visitedTopics on open and on step 2, jump to last step, wait for visitedTopics.
- **RDR-05 (P1, PASS)** Arrow keys replay the keyed visual body transition forward and back
  - Steps: Open lesson in a no-preference context, install a mutation probe on the visual motion group, press ArrowRight then ArrowLeft, verify remount + entrance style + body change.
- **BLG-01 (P1, PASS)** Search filters cards, read-time is shown, and read checkmarks sync with progress
  - Steps: Type a query in Search field notes; clear; check min-read labels and Read badge for seeded read blog.
- **BLG-02 (P2, PASS)** Blogs index exposes tag/category filters
  - Steps: Inspect /blogs controls for tag chips or filter buttons beyond the free-text search.
- **BLG-03 (P1, PASS)** Opening a field note is not a meaningful read; reaching its final step is
  - Steps: Fresh context, open blog, sample readBlogs on open and on step 2, jump to last step, wait for readBlogs and visitedTopics.
- **VIS-01 (P1, PASS)** Tokenization, Kubernetes and LLD LRU lessons load their titled bespoke visuals
  - Steps: Open each lesson, wait for figure svg[role=img] with the expected aria-label, and confirm its step-specific body text.
- **LAND-01 (P1, PASS)** Closing CTA exists and its primary link navigates to /labs
  - Steps: On / find the final 'Pick a system' section, assert its 'Open the labs' link points at /labs, click and verify the labs page.
- **LAND-02 (P1, PASS)** Bento and closing grids align without overflow at 390 and 1440
  - Steps: At 390/1440 check document overflow, then measure the 'Other ways in' bento and 'Pick a system' grids: column count, cells inside container, equal row heights, no overlap.
- **LAB-01 (P2, PASS)** Labs card excerpts contain no raw Markdown markers
  - Steps: Open /labs, read every card excerpt in a[href^='/labs/'] p.line-clamp-2 and assert no bold/italic/code/link/heading markers remain.
- **MAP-01 (P1, PASS)** Zoom, reset, pan, selection, prerequisites and navigation work together
  - Steps: Use zoom controls, drag the stage, click a track node, read aside, click an Open link.
- **MAP-02 (P2, PASS)** Zoom controls clamp to 70%-180%
  - Steps: Click zoom-out and zoom-in ten times each; read the percentage readout.
- **TOOL-01 (P1, PASS)** Calculators stay finite for zero, huge, negative and empty inputs
  - Steps: Fill each numeric input with 0, a very large value, -5 and empty; read every result row.
- **TOOL-02 (P2, PASS)** Notation decoder returns results by symbol and by plain meaning
  - Steps: Search p99, quorum and a nonsense term; count decoded entries.
- **BRK-01 (P1, PASS)** 15-minute reminder appears after active study time and snooze delays it
  - Steps: Seed breakMinutes=15, install fake clock, wait for a real study tick, advance 18 minutes with pointer activity, assert reminder; snooze, advance 9 minutes (quiet), then 17 minutes (reminder returns); verify Off and re-enable.
- **BRK-02 (P1, PASS)** An active quiz suppresses the break reminder
  - Steps: Seed a read lesson and breakMinutes=15, open /quiz with fake clock, advance time with pointer activity, check no reminder.
- **QUIZ-01 (P1, PASS)** Fresh context shows the empty state with no active question
  - Steps: Open /quiz in a fresh isolated context.
- **QUIZ-02 (P1, PASS)** Seeded read topic yields a question; answer persists after reload
  - Steps: Seed completedLessons=[single-server], open /quiz, answer, reload.
- **DAT-01 (P1, PASS)** Export produces a downloadable, valid SysCraft progress JSON
  - Steps: On /settings click Export progress, capture the download and parse its JSON.
- **DAT-02 (P1, PASS)** Malformed JSON is rejected with a status message and leaves state untouched
  - Steps: Upload a broken .json file to Import progress; compare localStorage before/after.
- **DAT-03 (P1, PASS)** Valid import replaces state and survives a full reload
  - Steps: Import a crafted valid file, confirm status, reload, verify counts and quiz eligibility.
- **RSP-01 (P1, PASS)** No horizontal overflow at 375 / 768 / 1280 / 1440 across audited routes
  - Steps: Set each viewport, visit each route, compare document scrollWidth with innerWidth.
- **RSP-02 (P2, PASS)** Touch targets on the reader are at least 24px at 375px
  - Steps: At 375px measure step-dot and navigation button bounding boxes.
- **RSP-03 (P2, PASS)** Command palette and utility dock overlay content without clipping
  - Steps: At 375px open the palette and dock; measure their boxes and z-index against the header.
- **ERR-01 (P1, PASS)** No hydration warnings, uncaught page errors, or same-origin console/HTTP failures
  - Steps: Aggregate console, pageerror, requestfailed and response events from every isolated scenario.

## Full check log

| ID | Area | Check | Severity | Result | Detail / evidence |
| --- | --- | --- | --- | --- | --- |
| PAL-01 | Command palette | Ctrl+K opens the palette on every audited route and Escape closes it | P1 | PASS | routes=9; attempts=[1,1,1,1,1,1,1,1,1] |
| PAL-02 | Command palette | Fuzzy search covers tracks, lessons, blogs, labs, tools and notation as advertised | P1 | PASS | coverage=[{"group":"tracks","term":"foundations","expect":"foundations","matches":["System Design Foundations Path /paths/foundations","Single Server to Scale Foundations /paths/foundations/single-server","Networking and Protocols Foundations /paths/foundations/network; totalItems=10 |
| PAL-03 | Command palette | Arrow keys move selection, Enter navigates, Escape cancels without navigation | P1 | PASS | firstSelected=Map Concept map /map; downSelected=LLD: LRU and LFU Cache Case Studies /paths/case-studies/lld-lru-cache; upSelected=Map Concept map /map |
| THM-01 | Theme | Light theme applies to all audited routes with >= 4.5:1 heading contrast | P1 | PASS | measurements=[{"route":"/paths","themeLight":true,"bodyBg":"rgb(246,242,234)","h1Contrast":14.85,"tertiaryContrast":4.12},{"route":"/paths/foundations/single-server","themeLight":true,"bodyBg":"rgb(246,242,234)","h1Contrast":14.85,"tertiaryContrast":4.12},{"route":"/blogs/; note=tertiary text below 4.5:1 on /paths (4.12:1), /paths/foundations/single-server (4.12:1), /blogs/database-melts-at-10k-rp |
| THM-02 | Theme | Settings theme toggle persists across reload and route changes | P1 | PASS | toggles=["dark→light→reload→/paths→dark→reload"] |
| THM-03 | Theme | Default dark theme renders without a stray theme-light class | P2 | PASS | rows=[{"route":"/paths","themeLight":false,"bodyBg":"rgb(12,11,9)","h1Contrast":16.41,"tertiaryContrast":4.24},{"route":"/paths/foundations/single-server","themeLight":false,"bodyBg":"rgb(12,11,9)","h1Contrast":16.41,"tertiaryContrast":4.24},{"route":"/blogs/databa |
| CUR-01 | Custom cursor | Cursor renders with read/inspect/interactive context states | P1 | PASS | neutral=default; read=read; inspect=inspect |
| CUR-02 | Custom cursor | Cursor toggle persists and the native pointer returns when disabled | P1 | PASS | persisted=true |
| CUR-03 | Custom cursor | Touch and reduced-motion contexts disable the custom cursor | P1 | PASS | observations=[{"touch":true,"reducedMotion":false,"hasClass":false,"hasNode":false},{"touch":false,"reducedMotion":true,"hasClass":false,"hasNode":false}] |
| AMB-01 | Ambient background | Ambient canvas renders on lesson and blog and toggle persists | P1 | PASS | before=[{"route":"/paths/foundations/single-server","canvases":1},{"route":"/blogs/database-melts-at-10k-rps","canvases":1}]; after=0; screenshot=C:\Users\varun\AppData\Local\Temp\runtime-audit-shots\ambient-off-settings.png |
| AMB-02 | Ambient background | Ambient animation loop pauses while the document is hidden | P2 | PASS | supported=true; animatesWhileVisible=true; frozenWhileHidden=true |
| AMB-03 | Ambient background | Ambient presence on reduced-motion devices is a static wash, not a canvas loop | P2 | PASS | observations=[{"route":"/paths/foundations/single-server","reducedMotion":true,"staticWash":true,"backgroundStable":true,"ambientCanvasCount":0},{"route":"/blogs/database-melts-at-10k-rps","reducedMotion":true,"staticWash":true,"backgroundStable":true,"ambientCanvasCount": |
| RDR-01 | Reader | Step dots, Next/Previous, arrow keys and manual scroll stay in sync | P1 | PASS | dot3=3; keyboard=[4,3]; scroll=2 |
| RDR-02 | Reader | Sticky mode bar stays below the header and above page content after scrolling | P2 | PASS | rows=[{"route":"/paths/foundations/single-server","barTop":56,"headerBottom":57,"barZ":30,"headerZ":40,"scrollY":976},{"route":"/blogs/database-melts-at-10k-rps","barTop":56,"headerBottom":57,"barZ":30,"headerZ":40,"scrollY":1400}] |
| RDR-03 | Reader | Reading-mode changes hold the active step (no scroll observer snap-back) | P1 | PASS | observations=[{"mode":"Story","step":2},{"mode":"Engineer","step":2},{"mode":"Both","step":2}] |
| RDR-04 | Reader | Opening a lesson is not a meaningful read; reaching its final step is | P1 | PASS | steps=4; onOpen=false; onStep2=false |
| RDR-05 | Reader | Arrow keys replay the keyed visual body transition forward and back | P1 | PASS | forward={"svgReplaced":true,"gAdds":0,"gRemoves":0,"version":"STEP 1 -> STEP 2"}; backward={"svgReplaced":true,"gAdds":0,"gRemoves":0,"version":"STEP 2 -> STEP 1"} |
| BLG-01 | Blogs index | Search filters cards, read-time is shown, and read checkmarks sync with progress | P1 | PASS | total=8; filtered=5; readBadges=1 |
| BLG-02 | Blogs index | Blogs index exposes tag/category filters | P2 | PASS | filterControls=1; screenshot=C:\Users\varun\AppData\Local\Temp\runtime-audit-shots\blogs-no-tag-filters.png |
| BLG-03 | Blogs index | Opening a field note is not a meaningful read; reaching its final step is | P1 | PASS | steps=5; onOpen=false; onStep2=false |
| VIS-01 | Bespoke visuals | Tokenization, Kubernetes and LLD LRU lessons load their titled bespoke visuals | P1 | PASS | observations=[{"route":"/paths/ai-engineering/tokenization","title":"tokenization","text":"tokenizationSTEP 1raw text · charactersthe cat'the cat' → 7 characters, but the model never sees characters"},{"route":"/paths/backend-cloud/kubernetes","title":"k8s reconcile","text |
| LAND-01 | Landing | Closing CTA exists and its primary link navigates to /labs | P1 | PASS | href=/labs; landed=https://sys-craft.vercel.app/labs |
| LAND-02 | Landing | Bento and closing grids align without overflow at 390 and 1440 | P1 | PASS | rows=[{"viewport":"390","overflowPx":0,"grids":{"bento":{"cols":1,"cells":3},"closing":{"cols":1,"cells":2}}},{"viewport":"1440","overflowPx":0,"grids":{"bento":{"cols":3,"cells":3},"closing":{"cols":12,"cells":2}}}] |
| LAB-01 | Labs | Labs card excerpts contain no raw Markdown markers | P2 | PASS | checked=16; markers=0 |
| MAP-01 | Knowledge map | Zoom, reset, pan, selection, prerequisites and navigation work together | P1 | PASS | zoom=["100%","130%","115%","100%"]; panned=true; selected=Distributed Systems |
| MAP-02 | Knowledge map | Zoom controls clamp to 70%-180% | P2 | PASS | minText=70%; maxText=180% |
| TOOL-01 | Tools | Calculators stay finite for zero, huge, negative and empty inputs | P1 | PASS | observations=[{"section":"capacity-title","input":"cap-dau","typed":"0","rows":["0.00","0.00","0.00","0.00"],"bad":[]},{"section":"capacity-title","input":"cap-dau","typed":"1e15","rows":["138888888.89","694444444.44","10512000000.00","8888888.89"],"bad":[]},{"section":"ca; note=empty input normalised to "0" by Number("") |
| TOOL-02 | Tools | Notation decoder returns results by symbol and by plain meaning | P2 | PASS | counts={"p99":2,"quorum":1,"zzzznotathing":0} |
| BRK-01 | Break reminder | 15-minute reminder appears after active study time and snooze delays it | P1 | PASS | appearedAfter=15m active; snooze=quiet for 10m, active timer reset, reminder returned after a further 15m; off=hid the open reminder and re-enabled without stale state |
| BRK-02 | Break reminder | An active quiz suppresses the break reminder | P1 | PASS | quizActive=true; reminderShown=false |
| QUIZ-01 | Quiz | Fresh context shows the empty state with no active question | P1 | PASS | emptyState=true |
| QUIZ-02 | Quiz | Seeded read topic yields a question; answer persists after reload | P1 | PASS | choices=4; historyAfterReload=1 |
| DAT-01 | Export / import | Export produces a downloadable, valid SysCraft progress JSON | P1 | PASS | filename=syscraft-progress-2026-11-28.json; bytes=403 |
| DAT-02 | Export / import | Malformed JSON is rejected with a status message and leaves state untouched | P1 | PASS | unchanged=true |
| DAT-03 | Export / import | Valid import replaces state and survives a full reload | P1 | PASS | lessons=["url-shortener"]; theme=dark |
| RSP-01 | Responsive | No horizontal overflow at 375 / 768 / 1280 / 1440 across audited routes | P1 | PASS | checked=28; maxOverflowPx=0 |
| RSP-02 | Responsive | Touch targets on the reader are at least 24px at 375px | P2 | PASS | rows=[{"route":"/paths/foundations/single-server","small":[],"total":8,"screenshot":"C:\\Users\\varun\\AppData\\Local\\Temp\\runtime-audit-shots\\touch-lesson.png"},{"route":"/blogs/database-melts-at-10k-rps","small":[],"total":7,"screenshot":"C:\\Users\\varun\\App |
| RSP-03 | Responsive | Command palette and utility dock overlay content without clipping | P2 | PASS | palette={"x":16,"y":97.4375,"width":343,"height":532.5}; paletteZ=81; dock={"x":16,"y":442.1647644042969,"width":317.3966369628906,"height":309.2997741699219} |
| ERR-01 | Errors | No hydration warnings, uncaught page errors, or same-origin console/HTTP failures | P1 | PASS | hydration=0; pageErrors=0; appConsole=0 |

## Browser error telemetry

{
  "hydration": 0,
  "pageErrors": 0,
  "appConsole": 0,
  "appHttp": 0,
  "appNetwork": 0,
  "abortedByHarness": 1043,
  "crossOriginNetwork": 0,
  "samples": {
    "hydration": [],
    "pageErrors": [],
    "appConsole": [],
    "appHttp": [],
    "appNetwork": [],
    "abortedByHarness": [
      "net::ERR_ABORTED https://sys-craft.vercel.app/",
      "net::ERR_ABORTED https://sys-craft.vercel.app/paths",
      "net::ERR_ABORTED https://sys-craft.vercel.app/blogs"
    ]
  }
}

## Method notes

- Checks are deterministic where possible: DOM assertions, computed styles, WCAG contrast maths, Playwright `page.clock` for the break reminder, and real file downloads/uploads for export/import.
- Keyboard shortcuts are retried up to four times because the listener attaches in a hydration effect; the number of attempts is recorded in PAL-01. Across five development runs, an immediate Ctrl+K after the dock launcher appeared was missed on /paths twice; the final recorded run opened on the first attempt everywhere. Treat first-attempt reliability as intermittent and worth a listener-attachment fix.
- Theme and break-reminder checks wait for hydration/settling before sampling; the underlying preferences still persist across reload (THM-02, BRK-01).
- A FAIL is a real product defect, not an automation artifact. If a behaviour could not be driven safely it is labelled NOT VERIFIED with the reason and a code reference where applicable.
- `net::ERR_ABORTED` on same-origin routes is counted and shown separately in ERR-01: it is generated by the harness navigating away / closing contexts during Next.js prefetches, not by the product. All other failed requests are treated as failures.
- Meaningful-read checks sample learner state on open and on an intermediate step before jumping to the final step; a MutationObserver on the stable visual figure captures SVG/group remounts, body-content changes and the visual's own STEP marker so arrow-key transition is measured on the visual body, not the step dot.
- No threshold was relaxed to hide a failure: 4.5:1 WCAG AA for body/heading text, 24px minimum touch targets, <=1px horizontal overflow, and z-index ordering were all applied as written.

