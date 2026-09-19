# ESC website audit — 9 September 2026

## Verdict

The homepage has a recognisable visual direction. The product is not ready to be called fully reliable yet: the live AI answer request failed during this audit, and the learning workspace still mixes newer and older interface patterns. Adding more glow, gradients, or animation will not solve those problems.

This audit made local code fixes and tested the major sections. It is not a claim that every provider, export format, browser, assistive technology, or generated answer has passed. No production deployment or GitHub push was performed for this audit.

## Test environment

- Local frontend on port 5174; isolated backend on port 8001.
- Temporary audit database, separate from the existing project database. Synthetic QA accounts only.
- Headless Edge/Playwright at 360, 390, 768, and 1440 pixels for the homepage; 390 pixels for the authenticated workspace. Interactive browser checks at 655 pixels.
- Existing backend tests plus new regressions, using temporary databases. Quiz tests now mock the provider instead of depending on live model output.

## Section-by-section results

| Section | Tested | Outcome |
|---|---|---|
| Homepage / hero | Four viewport widths, headline bounds, page overflow, JS errors | Passed. No page or headline overflow detected. |
| Navigation / footer | Every hash target exists; responsive menu opens; homepage/dashboard return | Passed. Section links resolve. Footer workspace links could be more direct. |
| Specialists on homepage | Compared names with actual agent registry | Fixed: now uses the same registry as the workspace. |
| Feature and how-it-works sections | Scrolled every feature card and step into view; waited for reveal animation | Passed reveal checks. Copy no longer promises video ingestion as an implemented capability. |
| Registration | Full email, name, password and confirmation flow in fresh mobile browser | Passed. |
| Sign-in / sign-out | Backend correct/incorrect-password, identity and session-revocation checks | Passed. Full sign-in UI and password-manager compatibility still deserve additional testing. |
| Chat welcome / composer | Initial scroll, typing, selected source context, source count | Fixed welcome auto-scroll that clipped the heading. Composer works. |
| Live AI answer | Submitted a distinctive source-only question | Blocked: AI service reported temporary unavailability. Retry is shown; no uncaught page error. Successful grounding cannot be claimed from this run. |
| Chat streaming implementation | Existing automated tests: deltas, cancellation, partial-response fallback boundaries, SSE parsing, auth | Passed backend suite. These tests do not establish model factual accuracy. |
| Overview / setup | Saved profile; checked genuine empty states and overview after setup | Passed. |
| Planner | Generated seven-day schedule; marked a task complete; filtered completed tasks | Passed. Persistence and ownership also covered by backend tests. |
| Analytics | New-account empty state; automated scoring, mastery, resource and plan workflow | Passed. Fixed repeated “over time” wording. No real student performance was modified. |
| Library | Paste source, save, reload; backend TXT extraction | Passed in fresh browser. Source ownership separation has its own regression test. |
| Web research | Searched “Newton laws of motion NASA” | Returned 7 candidates and 1 accepted source. This is retrieval success, not proof of independent factual verification. |
| Source dialog | Names, dialog semantics, keyboard focus loop, Escape handler, constrained height | Fixed missing names and dialog semantics; code-reviewed keyboard handling. Full screen-reader audit remains outstanding. |
| Specialist catalogue | Mobile layout, search for Concept Clarifier, Quick Launch to prefilled chat | Passed. |
| Report Studio | Mobile manual selection, agent panel visibility, unavailable report buttons | Fixed: panel was hidden below desktop width. Now scrollable below chat. Selection passes fresh-browser test. |
| Generated reports / exports | Code inspection only for this pass | Not end-to-end verified because live generation failed. Do not mark all twelve agents or PDF/DOCX/PPTX exports as passed. |
| Flashcards | Reviewed shuffle and regeneration state; TypeScript build | Fixed positional progress bug and same-length regenerated-deck reset. Interactive generated-deck export testing remains. |
| Settings | Opened settings; homepage return and dashboard reload | Passed those controls. Cross-screen theme consistency remains incomplete. |
| Voice input | Code review only | Real microphone, permission denial and mobile speech recognition were not exercised. |

## Fixes implemented

1. **Assessment integrity:** removed silent generic study-skills quiz fallback. Provider failure now returns 503 without creating an assessment or changing mastery. Boolean answer indices are rejected.
2. **Stable topic tracking:** quiz questions use the requested assessment topic, rather than arbitrary model-generated subtopic names that split mastery and resource lookup.
3. **Account-separated browser sources:** sources and report history use account-specific keys. Invalid stored shapes no longer crash normal reads; deletion notifies listeners.
4. **Legacy-data safety:** the old unowned `esc.workspace.v1` entry is preserved, not automatically assigned to whoever signs in next. Existing users may need to re-add their sources. A deliberate owner-confirmed migration is still needed; nothing was silently deleted.
5. **Bounded requests:** health/auth and learning requests have time limits. Hosted users receive actionable connection messages instead of development-port instructions. Header handling correctly accepts a Headers instance.
6. **Chat layout:** empty conversations start at the top; populated conversations retain follow-to-latest behaviour. Overflow centring is safe.
7. **Mobile Report Studio:** agent selection and report controls remain available below the chat. Selection/expansion/copy controls have names; unavailable reports are disabled; unrun agents say “Not run.”
8. **Flashcard state:** known/review flags follow original card identity through shuffles; regenerated decks clear old progress even when the card count is unchanged.
9. **Source accessibility:** named dialog, labelled text fields, named close/back buttons, focus loop, Escape handling and viewport-constrained scrolling.
10. **Honest claims:** homepage specialists match real agents; video support is not advertised as ready; “Cross-checked claims” becomes “Evidence snippets.”
11. **Small correctness fixes:** YouTube host validation requires a real domain boundary; unassessed planner topics no longer display invented mastery as a measured result; empty plans distinguish missing priorities from missing availability; removed nested main landmark.

## Recommended changes, in priority order

### P0 — reliability and trust

- **Restore a successful provider request before launch.** Confirm the server's configured provider/model and upstream status. Add safe server-side diagnostic codes, request IDs and provider health reporting. Keep keys private; do not log request URLs containing credentials. Rotate the keys previously shared in conversation/screenshots.
- **Use one durable, account-owned source store.** The chat library currently stores sources in the browser while learning materials use the backend. Students should upload once and use the same source in chat, quizzes and plans. Include account ownership tests, backups and a documented restore procedure. Local browser storage is not a substitute for server-side access control.
- **Make grounding explicit.** Offer clearly labelled source-only and web-research modes. Show citations and retrieval dates. Say when sources cannot answer the question. A citation or relevance score alone does not verify a claim.
- **Do not offer unsupported ingestion as a completed upload.** Image entries currently contain metadata, and video entries contain a URL without a transcript. Disable those choices with a short explanation until OCR/transcription actually runs, or label them strictly as bookmarks and exclude them from answer grounding.
- **Complete account recovery and operational safeguards.** Password reset, verification where appropriate, abuse throttling, account deletion/export and production monitoring require a separate security pass.

### P1 — convenience

- **One clear study journey:** question or upload → explanation → practice → saved next step. Avoid making students understand “orchestration” or choose between two chat composers to complete normal work.
- **Distinguish a plan draft from a saved schedule.** Chat can discuss a plan; the dashboard saves one. Provide an explicit “Review and save schedule” handoff rather than implying a chat answer already created tasks.
- **Reduce duplicated destinations.** Sources, learning materials, report studio and specialist chat should share the same context and navigation. Keep one place for saved outputs.
- **Add recovery to destructive actions.** Source deletion needs Undo or a clear confirmation, especially for local-only material. Add export and visible storage-location information.
- **Persist the right things.** Explain which conversations are browser-local and which progress is account-synced. Add cross-device conversation sync only with intentional privacy controls.
- **Make weekly versus daily availability intuitive.** Prefer one primary scheduling input, with an optional advanced daily override and a preview of the actual weekly total.

### P1 — visual polish without a template-built feel

- **Unify surfaces and tokens.** Apply the same background, border, typography, input, focus, error and button rules to Source Library, Report Studio and generated reports. The dark/light mismatch is more noticeable than any missing animation.
- **Use fewer slogans inside the product.** Keep expressive branding on the homepage. In the workspace use direct labels such as “Your next session,” “Quiz results,” and “Saved sources.” Avoid repeated tiny uppercase eyebrows above every panel.
- **Increase small-text legibility.** Several controls and secondary labels use 9–11px text and muted colours. Standardise a readable text scale and verify contrast in both themes.
- **Use one primary action per section.** Reduce duplicate launch buttons and ambiguous labels. Clarify whether a button opens a chat, generates a report, or saves data.
- **Keep motion purposeful.** The orb is a useful status identity; the dot background should stay subdued. Respect reduced motion and pause offscreen decorative animation. Do not add more competing visual styles.
- **Finish keyboard and touch testing.** Some studio controls are still smaller than ideal touch targets. Test NVDA, 200% zoom, keyboard-only navigation, focus restoration and errors. This audit is not WCAG certification.

### P2 — maintainability and regression protection

- Add these browser checks to CI with pinned test dependencies and isolated test data. Include all routes, mobile, failed requests and a mocked provider.
- Add end-to-end report fixtures for all active output types: quiz, flashcards, mind map, plan, notes and research; test downloads separately.
- Reduce large lazy bundles and remove unused demos from the production route surface if they are not part of the product. Current build warns about chunks above 500 kB.
- Address the remaining Fast Refresh/lint and FastAPI lifecycle deprecation warnings. A passing build does not remove the maintenance risk.
- Add human evaluation of answer quality, citation support and quiz validity. Do not substitute deterministic UI tests for accuracy research.

## Reproduction

- Backend: `.venv/Scripts/python.exe -m pytest tests -q -p no:cacheprovider` from backend. **32 passed.**
- Frontend source-storage regression: `node --test tests/workspaceMemory.test.mjs` from frontend (Node 24 used).
- Responsive browser checks: `node tests/responsive-audit.cjs` from frontend.
- Workspace checks: `node tests/workspace-audit.cjs` from frontend, against the isolated 5174/8001 servers. These create synthetic accounts. Set `ESC_TEST_LIVE_AI=1` only to opt into a real provider call.
- Browser scripts accept `ESC_PLAYWRIGHT_MODULE` for an existing Playwright installation and `ESC_BROWSER_CHANNEL=msedge`; otherwise they use installed Playwright/Chromium.
- `npm run build` and `npm run lint` from frontend. Remaining warnings are recorded above; no dependency installation was required for the audit.

Screenshots are saved beside this report as `audit-home-*.png`, `audit-specialists-mobile.png`, `audit-chat-mobile.png`, and `audit-studio-mobile.png`.
