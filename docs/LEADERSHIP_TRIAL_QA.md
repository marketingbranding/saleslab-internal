# Leadership Trial QA

## Trial Readiness

**NO-GO** as of `2026-07-14` after operator-assisted QA.

The authorized operator completed real sign-in, physical microphone transcription, a full voice-to-report flow, successful Firestore inspection, controlled failed-state persistence and retry merge, real-session privacy inspection, and navigation checks against Vercel. Two High defects were found and deployed during operator QA. Customer/AI transcription was manually verified after its fix. The HOME false-positive fix is deployed but its required manual rerun was skipped. Network interruption/reconnect and the uninterrupted leadership rehearsal were also skipped.

Do not treat this record as approval for the leadership trial until the blocked cases are rerun by an authorized operator and this decision is updated.

## Tested Environment

| Item | Result |
|---|---|
| QA date | `2026-07-14` |
| Environment | Vercel production deployment at `https://saleslab-internal.vercel.app/` over HTTPS; local Windows workspace used for verification |
| Branch | `main` |
| Initial operator baseline | `4ca5e179d19a60f235799965e6e1ad8134e1ff56` |
| Current deployed commit | `2e90aa03f26aa0e442bcd76f30bf1a71c3c23de8` |
| Working tree | Source fixes committed; generated `tsconfig.tsbuildinfo` and this documentation update remain local |
| Node | `v24.11.1` |
| npm | `11.13.0` |
| Browser | Google Chrome on Windows; headless for controlled cases and normal browser for operator cases |
| Viewports | `1440 x 900`, `375 x 812` |
| Voice provider | Gemini Live, `gemini-3.1-flash-live-preview` |
| Evaluation provider | Groq, `llama-3.1-8b-instant`; Gemini configured as key fallback only when Groq is absent |
| Firebase | Authenticated successful and failed-to-completed session writes inspected in Firestore Console |
| Account type | Authorized admin Google account; no account identifier recorded |
| Physical microphone | Permission, device selection, speech transcription, and mute/unmute operator-confirmed |
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

The tested trial path is the HTTPS Vercel deployment, Gemini Live for voice, Groq for evaluation, Google authentication, and the configured Firestore database for sessions. Vercel deployments for source-fix commits `5483f13` and `2e90aa0` were operator-confirmed Ready.

## Automated Baseline

| Check | Result |
|---|---|
| `npm install` | Passed; dependencies restored from `package-lock.json` |
| `npm run test:sos` | Passed, 179 tests, 0 failures after operator-found fixes |
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

## Controlled QA History

The following matrix preserves the automated, provider-backed, and controlled-browser history from FT-006. Controlled results are not used as substitutes for the human-operated cases below.

## Scenario Matrix

| Case | Scenario | Browser/device | Voice | Transcript | Evaluator/API | Expected vs actual | Status |
|---|---|---|---|---|---|---|---|
| QA-01 | BI Checking Bermasalah, normal HOME flow | Vercel and Chrome on Windows | Physical voice passed after customer-transcription fix | Both roles captured after `5483f13` | Real evaluator and report passed in 5-15 seconds | Full signed-in voice/report/save path passed; separate deployed HOME fix still needs its focused rerun | **Passed** |
| QA-02 | Very short exchange | API | Not applicable | 2 turns | Passed in 3.7 seconds; insufficient with `INSUFFICIENT_SALES_TURNS` and `TRANSCRIPT_TOO_SHORT`; score `3`, grade `E` | Conservative V2 result returned without runtime failure | **Passed** |
| QA-03 | Guarantee language | API | Not applicable | Recognized phrase at sales turn 5 | `GUARANTEE_LANGUAGE`, max `65`, source turn 5, adjusted score `60`, grade `D` | Cap rule and source reference matched; base score was already below cap | **Passed** |
| QA-04 | Document manipulation | API plus controlled Chrome report | Not applicable | Recognized phrase at sales turn 3 | Original `60`, adjusted `40`, grade `E`, critical, source turn 3 | Deterministic cap and readable report label matched | **Passed** |
| QA-05 | Pressure tactic | API | Not applicable | Recognized pressure phrase at sales turn 5 | `PRESSURE_TACTIC`, max `65`, serious, adjusted score `60` | Rule matched; normal closing in QA-01 did not trigger pressure | **Passed** |
| QA-06 | Closing before discovery | API | Not applicable | Closing at turn 1, later HOME discovery | `CLOSING_BEFORE_DISCOVERY`, max `70`, source turn 1; later discovery did not erase it | Matched | **Passed** |
| QA-07 | No meaningful discovery | API | Not applicable | 2 sales turns, zero HOME categories | `NO_MEANINGFUL_DISCOVERY`, max `65`, all four HOME areas missing | Matched; report fixture retained HOME disclaimer | **Passed** |
| QA-08 | Evidence validation | Real Vercel flow plus controlled tests | Physical session | Operator confirmed visible evidence referenced real sales statements | Real response and targeted rejection tests passed | Grounded sales evidence passed | **Passed** |
| QA-09 | Repeated speech and dedupe | Real Chrome plus targeted tests | Physical repetition performed | No severe duplicate flooding; both roles remained readable | Evaluation completed | Operator-confirmed | **Passed** |
| QA-10 | Voice interruption | Chrome on Windows | Physical mute/unmute passed | Interruption recovery and preservation not performed | Not tested after real interruption | Operator explicitly skipped Wi-Fi interruption/reconnect | **Not tested** |
| QA-11 | Provider error and retry | Vercel and Chrome request blocking | Physical roleplay before evaluation | Real session transcript persisted | Safe failed state, one retry, and real report passed | Same Firestore document merged from failed to completed with no duplicate | **Passed** |
| QA-12 | Groq rate limit | Local API | Not applicable | Fictional compact cases | Consecutive requests produced actual HTTP 429 upstream and controlled 502 locally; retries after about 20 seconds succeeded | No hang or prompt/transcript logging; no automatic fallback after Groq 429 | **Passed** |
| QA-13 | Legacy response | Controlled Chrome desktop | Not applicable | Compact fixture | Contract response without `evaluationV2` rendered | No HOME or score-adjustment section; legacy report remained usable | **Passed** |
| QA-14 | Firestore session save | Firebase Console | Real roleplay | Both-role transcript saved | Completed and failed-to-completed documents inspected | Required fields, adjusted score, V2 data, safe error, and one-document merge passed | **Passed** |
| QA-15 | Authentication and access | Vercel and Chrome | Authorized admin account | Real roleplay allowed | Real evaluation and writes allowed | Signed-out controlled state and authorized signed-in flow passed; expiry refresh was not exercised | **Passed** |
| QA-16 | Responsive report | Chrome `1440 x 900` and `375 x 812` | Not applicable | Compact fixture | Controlled V2 response | Score, critical cap, HOME, evidence, and buttons rendered with no horizontal overflow or console errors | **Passed** |
| QA-17 | Restart and navigation | Vercel and Chrome | Physical follow-up session | Fresh roleplay opened without stale report | No duplicate evaluation request observed | `Coba Lagi` and `Menu Utama` operator-confirmed | **Passed** |
| QA-18 | Leadership rehearsal | Vercel intended | Not run | Not run | Not run | Operator explicitly skipped the uninterrupted rehearsal | **Not tested** |

## Human-Operated QA

| Area | Operator result |
|---|---|
| Environment | Vercel HTTPS deployment, Chrome on Windows, authorized admin Google account |
| Physical microphone | PASSED: permission granted, correct device selected, three distinct sentences transcribed accurately enough |
| Duplicate handling | PASSED: no severe flooding after a legitimate repeated statement |
| Full normal roleplay | PASSED after `5483f13`: both roles, evaluator, report, HOME review, grounded evidence, score/grade, and no unexpected cap |
| Evaluator duration | 5-15 seconds |
| Successful Firestore save | PASSED: required fields, completed status, adjusted score, V2 adjustment/HOME, and one session document |
| Failure and retry merge | PASSED: safe failed state, safe error, one retry, same document, completed result, score and feedback |
| Mute/unmute | PASSED: muted speech excluded; transcription resumed after unmute |
| Reconnect/interruption | NOT TESTED: operator explicitly skipped the real Wi-Fi interruption |
| Real-session privacy | PASSED: Chrome Console and Vercel logs inspected; no transcript, prompt, secret, provider body, or hidden value |
| HOME false-positive fix | NOT TESTED manually after deployment of `2e90aa0` |
| Leadership rehearsal | NOT TESTED: operator explicitly skipped QA-18 |

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

### QA-D04 - Audible customer missing from voice transcript

- Severity: High
- Case: QA-01 and QA-09.
- Reproduction: In a real Vercel voice roleplay, sales speech appeared and Gemini customer audio was audible, but customer/AI text was absent from the live transcript.
- Expected: Audible customer responses appear as customer/model transcript turns.
- Actual: Only the sales/user role was finalized.
- Root cause: Gemini Live output audio transcription was not requested or consumed; audio-only model parts did not contain usable text.
- Fix: `components/CallInterface.tsx` now requests input/output audio transcription, buffers incremental output chunks, flushes one customer turn at `turnComplete`, and clears incomplete output on interruption.
- Commit: `5483f13`.
- Regression test: Provider callback behavior requires real Live API verification; existing transcript normalization tests cover role mapping and deduplication.
- Manual verification: PASSED after Vercel deployment. Both roles appeared, no fragment flooding occurred, report completed, and Console contained no transcript text.
- Remaining risk: None observed for normal voice transcription.

### QA-D05 - Generic concerns falsely complete HOME Money and Eligibility

- Severity: High
- Case: HOME coverage during short `BI Checking Bermasalah` roleplays.
- Reproduction: End a roleplay after the AI customer expresses only generic installment and BI-checking concerns, without Money or Eligibility qualification. Firestore stored `completedCount: 2` with `housing` and `occupation` missing, so Money and Eligibility displayed as complete.
- Expected: Generic concerns remain objections and do not count as concrete HOME facts.
- Actual: Broad `cicilan`, `BI checking`, and `SLIK` indicators completed Money/Eligibility.
- Root cause: HOME event indicators matched topic words rather than concrete first-person financial or eligibility facts.
- Fix: `lib/sos/event-extractor.ts` now requires concrete first-person financial indicators and concrete ownership/subsidy/marital eligibility facts. Generic financing and BI-checking concerns remain objection signals.
- Files changed: `lib/sos/event-extractor.ts`, `lib/sos/tests/event-extractor.test.ts`.
- Commit: `2e90aa0`.
- Regression test: 18 focused extractor tests passed, including generic-concern exclusions and concrete financial-fact preservation.
- Manual verification: NOT TESTED after deployment; operator chose to skip the required rerun.
- Remaining risk: The fix is deployed but remains an unresolved High risk until the exact operator reproduction passes.

## Provider Reliability

- Provider used: Groq `llama-3.1-8b-instant` for evaluation.
- Normal response: Passed after the score-scale fix.
- Successful controlled response category: under 5 seconds; human-operated Vercel report category: 5-15 seconds.
- Rate-limit behavior: Actual upstream 429 observed during consecutive calls; local API returned controlled 502 quickly.
- Retry: Passed after approximately 20 seconds.
- Automatic fallback after Groq 429: absent.
- Gemini evaluator fallback: configured only for the no-Groq-key branch; not exercised.

## Voice Reliability

- Gemini Live connection: Passed in real Chrome with a physical microphone.
- Microphone permission and device selection: Passed.
- Mute/unmute: Passed with physical speech.
- Physical speech transcription: Passed for sales and, after `5483f13`, customer/AI turns.
- Repeated spoken phrase behavior: Passed without severe flooding.
- Temporary interruption and reconnect: Not tested by the operator.
- Finish-to-report flow from real speech: Passed.

## Evaluation Reliability

- Normal session: Full signed-in Vercel voice-to-report journey passed after customer-transcription fix.
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

- Successful save: Passed with an authenticated admin account.
- Failed-state save: Passed using controlled request blocking.
- Retry merge: Passed; the same document changed from failed to completed.
- `evaluationV2` serialization: Passed by Firestore Console inspection, including `scoreAdjustment` and `home`.
- Adjusted score storage: Passed; persisted score matched the report.
- Duplicate document control: Passed for successful and retry cases; one logical session produced one document.

## Privacy Review

After QA-D02:

| Log content | Observed after fix |
|---|---|
| Full transcript | No in operator-inspected Chrome Console or Vercel logs |
| Evaluator prompt | No in operator-inspected Vercel logs |
| API keys or authorization headers | No in operator-inspected Vercel logs |
| Hidden-information values | No in operator-inspected Vercel logs |
| Provider body | No in operator-inspected Vercel logs |

The evaluator route logs provider status, error class, and safe error code only. The controlled retry case logged the safe UI error and browser HTTP 502 resource message, not a provider body.

## Performance

| Measurement | Observed category |
|---|---|
| Roleplay finish to analysis loading | Started normally in the real Vercel flow |
| Evaluator request to report data | 5-15 seconds in the human-operated Vercel flow |
| Firestore saved indicator | Observed and document inspected |

No successful evaluator response exceeded 5 seconds. Rate-limited requests failed quickly rather than hanging.

## Unresolved Risks

- HOME false-positive fix `2e90aa0` is deployed but its exact manual regression was skipped.
- Gemini Live interruption/reconnect and transcript preservation remain unverified.
- The uninterrupted leadership demonstration rehearsal remains unperformed.
- Groq can return HTTP 429 during consecutive requests and has no automatic runtime fallback while its key is configured.
- Production dependency audit reports 4 high and 2 moderate findings.
- Vercel is the tested host and `2e90aa0` is operator-confirmed deployed; deployment rollback access was not exercised.
- Base and dimension scoring remain model-generated rather than rubric-weighted.

## Rollback

Current candidate deployment: `2e90aa0` on `main`. Customer-transcription fix `5483f13` is manually verified, but it predates the HOME false-positive fix and therefore retains QA-D05. Earlier commit `4ca5e17` lacks the customer-transcription fix. There is no fully operator-verified rollback commit for all current defects.

The active host is Vercel. Deployment status was inspected, but rollback was documented rather than executed. Use Vercel deployment history to promote a selected prior deployment only after reviewing which defect it reintroduces. The repository contains no Vercel CLI project metadata, so no deployment command was invented.

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

This plan is prepared but the operator explicitly skipped the uninterrupted rehearsal.

- Setup: power, stable network, updated Chrome, microphone selected, permission granted, authorized account signed in, Groq quota checked, Firestore test write confirmed.
- Scenario: `BI Checking Bermasalah`.
- Conversation path: greeting, rapport, Housing, Occupation, Money, Eligibility, relevant explanation, one concern, objection handling, and a non-coercive next step.
- Demonstrator prompts: pause after each customer response; ask one HOME area at a time; state that bank approval remains the bank's decision; close with a pre-check/document next step.
- Expected report: sufficient transcript, HOME coverage reflecting the discussion, grounded sales evidence, no compliance cap, internally consistent score and grade.
- Backup: reload voice once; if evaluation fails, wait before one retry; use a clearly labeled prior fictional report only if policy allows.

## Exit Criteria To Change NO-GO

An authorized operator must complete and record all of the following in this document:

1. Rerun the exact generic installment/BI-checking concern case against `2e90aa0` and confirm Money/Eligibility remain missing in both report and Firestore.
2. QA-10 with a real safe interruption, observed connection state, transcript preservation, and resume or tested restart procedure.
3. QA-18 as one uninterrupted, non-automated leadership demonstration rehearsal against the intended Vercel deployment.

Only after those checks pass should FT-006 be marked completed and readiness changed to `GO` or `CONDITIONAL GO`.

## Final Verification

Temporary QA routes and scripts were removed before final verification.

| Check | Final result |
|---|---|
| `npm run test:sos` | Passed, 177 tests, 0 failures |
| `npm run lint` | Passed, 0 errors and 3 existing warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run verify:sos` | Passed |
| `git diff --check` | Passed; Git reported only line-ending conversion notices |
