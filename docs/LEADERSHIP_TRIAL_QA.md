# Leadership Trial QA

## Trial Readiness

**NO-GO** as of `2026-07-14`.

The evaluator, deterministic score caps, report UI, Gemini Live connection, and controlled retry flow passed the available automated and provider-backed checks. FT-006 is not complete because a human-operated, signed-in voice session has not yet been completed end to end. Firestore session persistence, physical microphone transcription, interruption recovery, and the uninterrupted leadership rehearsal therefore remain unverified.

Do not treat this record as approval for the leadership trial until the blocked cases are rerun by an authorized operator and this decision is updated.

## Tested Environment

| Item | Result |
|---|---|
| QA date | `2026-07-14` |
| Environment | Local Next.js development and production build on Windows |
| Branch | `main` |
| Base commit | `c14982e` |
| Working tree | Dirty with FT-006 fixes and QA documentation |
| Node | `v24.11.1` |
| npm | `11.13.0` |
| Browser | Installed Google Chrome, headless for controlled browser cases |
| Viewports | `1440 x 900`, `375 x 812` |
| Voice provider | Gemini Live, `gemini-3.1-flash-live-preview` |
| Evaluation provider | Groq, `llama-3.1-8b-instant`; Gemini configured as key fallback only when Groq is absent |
| Firebase | Client configuration present; signed-out UI loaded without a Firebase console error; authenticated write not tested |
| Account type | Signed-out browser only; authorized company Google account required for remaining cases |
| Physical microphone | Not tested |
| Controlled microphone | Chrome fake media device connected to Gemini Live and passed mute/unmute controls |

## Environment Variables

No secret values were printed or stored.

| Variable/configuration | Status |
|---|---|
| `GROQ_API_KEY` | configured |
| `NEXT_PUBLIC_GEMINI_API_KEY` | configured |
| `GEMINI_API_KEY` | not tested separately |
| Firebase API key | configured |
| Firebase auth domain | configured |
| Firebase project ID | configured |
| Firebase app ID | configured |
| Firestore database ID | configured |

The intended trial path is Gemini Live for voice, Groq for evaluation, Google authentication, and the configured Firestore database for sessions. The repository does not identify an active deployment project. `README.md` describes generic Vercel and Netlify options, but no Vercel or Netlify project metadata is present.

## Automated Baseline

| Check | Result |
|---|---|
| `npm install` | Passed; dependencies restored from `package-lock.json` |
| `npm run test:sos` | Passed, 177 tests, 0 failures |
| `npm run lint` | Passed with 0 errors and 3 warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed inside `verify:sos`; an earlier concurrent standalone build had a transient `.next/pages-manifest.json` error and was not reproducible serially |
| `npm run verify:sos` | Passed before QA fixes; final result recorded below |
| `git diff --check` | Passed before QA fixes; final result recorded below |
| Audit | `npm audit --omit=dev`: 6 production findings, 4 high and 2 moderate |

The three lint warnings are one existing font warning in `app/layout.tsx` and two existing hook dependency warnings in `components/CallInterface.tsx`.

Audit findings include the installed Next.js release and transitive `@grpc/grpc-js`, `protobufjs`, `@protobufjs/utf8`, `postcss`, and `ws` packages. Dependency upgrades were not attempted during this narrowly scoped stabilization task.

## Test Data

Only fictional profiles and compact transcript summaries were used. No password, API key, real phone number, actual KTP, bank account, address, income document, credit record, private transcript, or hidden-information value is included here.

## Scenario Matrix

| Case | Scenario | Browser/device | Voice | Transcript | Evaluator/API | Expected vs actual | Status |
|---|---|---|---|---|---|---|---|
| QA-01 | BI Checking Bermasalah, normal HOME flow | API plus Chrome desktop connection | Gemini Live connection passed with controlled media; real speech not performed | Provider fixture covered 10 alternating turns and all four HOME areas | Groq passed after spacing; score `60`, grade `D`, no cap, HOME `4/4` | Evaluator result matched; full signed-in voice/save journey not performed | **Blocked** |
| QA-02 | Very short exchange | API | Not applicable | 2 turns | Passed in 3.7 seconds; insufficient with `INSUFFICIENT_SALES_TURNS` and `TRANSCRIPT_TOO_SHORT`; score `3`, grade `E` | Conservative V2 result returned without runtime failure | **Passed** |
| QA-03 | Guarantee language | API | Not applicable | Recognized phrase at sales turn 5 | `GUARANTEE_LANGUAGE`, max `65`, source turn 5, adjusted score `60`, grade `D` | Cap rule and source reference matched; base score was already below cap | **Passed** |
| QA-04 | Document manipulation | API plus controlled Chrome report | Not applicable | Recognized phrase at sales turn 3 | Original `60`, adjusted `40`, grade `E`, critical, source turn 3 | Deterministic cap and readable report label matched | **Passed** |
| QA-05 | Pressure tactic | API | Not applicable | Recognized pressure phrase at sales turn 5 | `PRESSURE_TACTIC`, max `65`, serious, adjusted score `60` | Rule matched; normal closing in QA-01 did not trigger pressure | **Passed** |
| QA-06 | Closing before discovery | API | Not applicable | Closing at turn 1, later HOME discovery | `CLOSING_BEFORE_DISCOVERY`, max `70`, source turn 1; later discovery did not erase it | Matched | **Passed** |
| QA-07 | No meaningful discovery | API | Not applicable | 2 sales turns, zero HOME categories | `NO_MEANINGFUL_DISCOVERY`, max `65`, all four HOME areas missing | Matched; report fixture retained HOME disclaimer | **Passed** |
| QA-08 | Evidence validation | Real Groq response plus controlled tests | Not applicable | Normal fictional session | Real response: 2 accepted and 1 rejected; targeted tests rejected hallucinated, customer-turn, and raw rejected evidence | Only grounded sales evidence survived; legacy display remains capped at 3 lines | **Passed** |
| QA-09 | Repeated speech and dedupe | Targeted tests | Real repeated speech not performed | 6 focused normalization tests passed | Evaluation path separately passed | Exact near-time duplicates collapse; legitimate later/repeated statements remain | **Blocked** |
| QA-10 | Voice interruption | Chrome desktop with controlled media | Connect and mute/unmute passed; offline mode did not close the live WebSocket in the test window | No real spoken transcript | Not run after interruption | Reconnect could not be safely simulated and is not claimed | **Blocked** |
| QA-11 | Provider error and retry | Controlled Chrome desktop | Not applicable | Compact fixture only | First request returned controlled 502; UI showed safe error; one retry succeeded; exactly 2 requests | UI and retry matched; authenticated failed-state save and merge were not tested | **Blocked** |
| QA-12 | Groq rate limit | Local API | Not applicable | Fictional compact cases | Consecutive requests produced actual HTTP 429 upstream and controlled 502 locally; retries after about 20 seconds succeeded | No hang or prompt/transcript logging; no automatic fallback after Groq 429 | **Passed** |
| QA-13 | Legacy response | Controlled Chrome desktop | Not applicable | Compact fixture | Contract response without `evaluationV2` rendered | No HOME or score-adjustment section; legacy report remained usable | **Passed** |
| QA-14 | Firestore session save | Code inspection only | Not applicable | Not persisted | Not applicable | Stable session ID and merge design are present, but actual document fields, adjusted score, V2 serialization, and failed-to-completed merge were not inspected | **Blocked** |
| QA-15 | Authentication and access | Chrome desktop | Not applicable | Not applicable | Not applicable | Signed-out state passed with Google sign-in screen and no console errors; signed-in and refreshed/expired sessions were not tested | **Blocked** |
| QA-16 | Responsive report | Chrome `1440 x 900` and `375 x 812` | Not applicable | Compact fixture | Controlled V2 response | Score, critical cap, HOME, evidence, and buttons rendered with no horizontal overflow or console errors | **Passed** |
| QA-17 | Restart and navigation | Controlled Chrome desktop | Not applicable | Compact fixture | Exactly one evaluation request per report | `Coba Lagi` and `Menu Utama` reached correct destinations without another request | **Passed** |
| QA-18 | Leadership rehearsal | Not run | Not run | Not run | Not run | This must be a real, uninterrupted, human-operated rehearsal and was not automated | **Blocked** |

## Defects

### QA-D01 - Evaluator score scale omitted

- Severity: High
- Reproduction: Submit a normal complete fictional transcript to the real Groq evaluator. Before the fix, repeated successful responses returned overall score `7`, which the normalizer correctly but misleadingly displayed as `7/100`.
- Root cause: The evaluator prompt requested numeric scores without explicitly defining a `0-100` scale. Groq reasonably returned a 10-point-style value.
- Fix: `lib/sos/evaluation/prompt.ts` now requires integer `0-100` values for overall and skill scores.
- Test: `lib/sos/tests/evaluation-prompt.test.ts` asserts the scale instruction and schema wording.
- Verification: The same normal-session shape returned overall score `60`, grade `D`, with dimension scores in the `40-100` range.
- Remaining risk: Base scoring is still model-generated and unweighted, as documented for the trial.

### QA-D02 - Voice transcript written to browser console

- Severity: Blocker
- Reproduction: Inspect `CallInterface` handling of Gemini input transcription, model text, and fallback user text. Transcript content was logged through a preview and two full-text `console.log` calls.
- Root cause: Development diagnostics included conversation text rather than content-free event metadata.
- Fix: Removed all three transcript-bearing logs from `components/CallInterface.tsx`. Timing, audio size, and event-type diagnostics remain.
- Verification: Source search finds no `Input transcription`, `AI text:`, or `User text:` logging path. Final lint, typecheck, tests, and build cover the change.
- Remaining risk: A human voice run is still required to inspect production browser logs with actual speech.

### QA-D03 - Groq rate limiting under consecutive requests

- Severity: High
- Reproduction: Send multiple evaluator requests consecutively. Several requests returned upstream HTTP 429, surfaced by the route as controlled HTTP 502.
- Root cause: Groq quota/rate behavior. The route prefers Groq whenever `GROQ_API_KEY` is configured and does not fall back to Gemini after a Groq 429.
- Fix: No code change. Automatic fallback was not introduced during FT-006.
- Verification: A single request after about 20 seconds succeeded in the `under 5 seconds` category.
- Remaining risk: Rapid retries during a demonstration can fail. The operator must avoid repeated calls and retry once after a brief interval.

## Provider Reliability

- Provider used: Groq `llama-3.1-8b-instant` for evaluation.
- Normal response: Passed after the score-scale fix.
- Successful response category: under 5 seconds, approximately 1.2 to 3.7 seconds in observed requests.
- Rate-limit behavior: Actual upstream 429 observed during consecutive calls; local API returned controlled 502 quickly.
- Retry: Passed after approximately 20 seconds.
- Automatic fallback after Groq 429: absent.
- Gemini evaluator fallback: configured only for the no-Groq-key branch; not exercised.

## Voice Reliability

- Gemini Live connection: Passed in real Chrome using a controlled media device.
- Microphone permission: Passed only with Chrome-controlled permission and fake media.
- Mute/unmute: Passed.
- Physical speech transcription: Not tested.
- Repeated spoken phrase behavior: Not tested manually; deterministic normalization tests passed.
- Temporary interruption: Browser offline mode did not close the existing WebSocket within 15 seconds.
- Reconnect: Not tested.
- Finish-to-report flow from real speech: Not tested.

## Evaluation Reliability

- Normal session: Provider-backed evaluator passed; full voice journey blocked.
- Short session: Passed with conservative insufficiency reasons.
- Guarantee cap: Passed.
- Document-manipulation cap: Passed and adjusted to 40.
- Pressure tactic: Passed.
- Early closing: Passed; later discovery did not remove the finding.
- No discovery: Passed with HOME `0/4`.
- Evidence validation: Passed in real response diagnostics and controlled validation tests.
- Legacy report: Passed in Chrome.
- Responsive V2 report: Passed in Chrome desktop and mobile.

## Persistence

- Successful save: Not tested with an authenticated account.
- Failed-state save: Not tested.
- Retry merge: Not tested.
- `evaluationV2` serialization: Verified by code path and types, not by Firestore document inspection.
- Adjusted score storage: Verified by code path (`score: data.overallScore`), not by Firestore document inspection.
- Duplicate document control: Stable `sessionIdRef` is used for one mounted report, but the deployed database was not inspected.

## Privacy Review

After QA-D02:

| Log content | Observed after fix |
|---|---|
| Full transcript | No in inspected evaluator server logs; transcript-bearing browser log statements removed |
| Evaluator prompt | No |
| API keys | No |
| Hidden-information values | No |
| Provider body | No |

The evaluator route logs provider status, error class, and safe error code only. The controlled retry case logged the safe UI error and browser HTTP 502 resource message, not a provider body.

## Performance

| Measurement | Observed category |
|---|---|
| Roleplay finish to analysis loading | Not tested end to end |
| Evaluator request to report data | Under 5 seconds for successful local requests |
| Firestore saved indicator | Not tested |

No successful evaluator response exceeded 5 seconds. Rate-limited requests failed quickly rather than hanging.

## Unresolved Risks

- Required human-operated end-to-end voice, evaluator, report, Firestore, and navigation rehearsal is incomplete.
- Authenticated Firestore create/update behavior has not been verified against deployed rules.
- Physical microphone selection, acoustic conditions, and real Gemini transcription have not been verified.
- Gemini Live reconnect remains unverified.
- Groq can return HTTP 429 during consecutive requests and has no automatic runtime fallback while its key is configured.
- Production dependency audit reports 4 high and 2 moderate findings.
- The actual hosting project and deployed commit are unknown from this workspace.
- Base and dimension scoring remain model-generated rather than rubric-weighted.

## Rollback

Last known committed baseline: `c14982e` on `main`. This commit predates the two FT-006 source fixes, so rollback would also restore the score-scale and transcript-logging defects. Prefer reverting only a problematic FT-006 deployment rather than using a destructive local reset.

Deployment access and the active hosting platform were not available during QA. Before trial, identify whether production is Vercel, Netlify, or another host and confirm its documented dashboard rollback flow. The repository contains no deployment CLI configuration, so no deployment command was invented or tested.

Practical rollback procedure:

1. Record the currently deployed commit and environment-variable configuration before deployment.
2. If the FT-006 build fails, use the hosting provider's deployment history to promote the last verified deployment or redeploy the recorded commit.
3. Restore the prior environment-variable values through the hosting dashboard; never copy secrets into Git.
4. Identify evaluator V2 failure by controlled `/api/analyze` errors, absent `evaluationV2`, report crashes, or incorrect adjusted score/grade.
5. After rollback, submit a compact fictional transcript and confirm the legacy-compatible fields (`overallScore`, `grade`, strengths, weaknesses, verdict, and skill scores) render without the HOME or score-adjustment sections when `evaluationV2` is absent.
6. Recheck authentication and one session write before allowing another demonstration.

## Trial Operations Checklist

- [ ] Laptop charged and connected to power
- [ ] Stable internet connection
- [ ] Chrome updated
- [ ] Physical microphone selected and tested
- [ ] Browser microphone permission granted
- [ ] Authorized test account signed in
- [ ] Provider quota checked
- [ ] Firestore access checked with one disposable fictional session
- [ ] One scenario preselected
- [ ] Backup browser tab ready
- [ ] Backup text explanation ready
- [ ] Browser console and server log view ready for monitoring
- [ ] Avoid rapid consecutive Groq requests

Fallback path:

If voice fails:

1. Reload once.
2. Check microphone selection and permission.
3. Use a prepared successful session/report only if product policy permits, and label it clearly as a backup.

If evaluator fails:

1. Retry once after a brief interval.
2. Avoid repeated rapid Groq calls.
3. Use a previously generated report only as a clearly labeled backup.
4. Do not hide the failure from leadership.

## Leadership Demonstration Rehearsal Plan

This plan is prepared but has not been executed.

- Setup: power, stable network, updated Chrome, microphone selected, permission granted, authorized account signed in, Groq quota checked, Firestore test write confirmed.
- Scenario: `BI Checking Bermasalah`.
- Conversation path: greeting, rapport, Housing, Occupation, Money, Eligibility, relevant explanation, one concern, objection handling, and a non-coercive next step.
- Demonstrator prompts: pause after each customer response; ask one HOME area at a time; state that bank approval remains the bank's decision; close with a pre-check/document next step.
- Expected report: sufficient transcript, HOME coverage reflecting the discussion, grounded sales evidence, no compliance cap, internally consistent score and grade.
- Backup: reload voice once; if evaluation fails, wait before one retry; use a clearly labeled prior fictional report only if policy allows.

## Exit Criteria To Change NO-GO

An authorized operator must complete and record all of the following in this document:

1. QA-01 with real speech, real transcription, Groq report, Firestore save, restart, and home navigation.
2. QA-09 with a legitimately repeated spoken phrase and console inspection.
3. QA-10 with physical mute/unmute and a safe interruption/reconnect attempt.
4. QA-11 with authenticated failed-state save and successful retry merge.
5. QA-14 by inspecting the resulting Firestore session document and adjusted score.
6. QA-15 with valid sign-in and, where feasible, refreshed or expired session behavior.
7. QA-18 as one uninterrupted, non-automated leadership demonstration rehearsal.
8. Confirm the intended deployed URL, deployed commit, hosting rollback path, and production environment variables.

Only after those checks pass should FT-006 be marked completed and readiness changed to `GO` or `CONDITIONAL GO`.

## Final Verification

Temporary QA routes and scripts were removed before final verification.

| Check | Final result |
|---|---|
| `npm run test:sos` | Passed, 177 tests, 0 failures |
| `npm run lint` | Passed, 0 errors and 3 existing warnings |
| `npm run typecheck` | Passed after clearing stale generated `.next/types` entries from the removed QA routes |
| `npm run build` | Passed through the authoritative `verify:sos` run |
| `npm run verify:sos` | Passed |
| `git diff --check` | Passed; Git reported only line-ending conversion notices |
