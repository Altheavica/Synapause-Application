# Android Release Traceability and Gate

This document is the final traceability artifact for the Android release
candidate after P0-P3 verification. It maps the browser baseline or approved
Android product contract to the production owner and the strongest evidence
currently available.

It complements [native-blocking-lifecycle.md](native-blocking-lifecycle.md),
which defines the detailed persistence and recovery contract. It does not
extend release scope: Feed and iOS distribution are excluded from this Android
candidate.

## Evidence labels

- **AUTOMATED VERIFIED**: repeatable Jest or native JVM coverage passes.
- **RUNTIME VERIFIED**: verified on the current Android emulator during P2 or
  P3 Session 2.
- **SOURCE VERIFIED**: final source/configuration was inspected and matches the
  stated contract.
- **HISTORICAL RUNTIME VERIFIED**: runtime evidence from the closed P2
  integration phase remains applicable to unchanged code.
- **NON-BLOCKING ACCEPTANCE DEBT**: the accepted release gate does not require
  additional runtime evidence for this row, but the limitation is recorded.
- **BLOCKED**: a mandatory gate cannot be completed.
- **OUT OF SCOPE**: deliberately excluded by product decision.

## Release identity

| Property | Final candidate value |
| --- | --- |
| Platform | Android |
| Application ID / namespace | `com.synapause` |
| Version code | `1` |
| Version name | `1.0` |
| Minimum SDK | `24` |
| Target / compile SDK | `36` |
| Release signing | External operator-supplied credentials only; no debug fallback |
| Release package target | Signed APK and AAB |

## Behavior-to-verification matrix

| Behavior / contract | Baseline or product source | Android owner | Verification | Final status |
| --- | --- | --- | --- | --- |
| Login, registration, reset-password boundaries | `javascript/login.js`, `javascript/global.js` | RN `LoginService` and account screens | `LoginService.test.js`; Session 2 cold-start smoke | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Stored identity schema and account changes | Baseline `synapauseUser`; approved `{id, username, email}` contract | RN `StoredUserService`, `ProfileService`, `ChangeService`; native mirror in `ForegroundAppModule` / service | `StoredUserService.test.js`, `ProfileChangeService.test.js`, `NavigationService.test.js` | **AUTOMATED VERIFIED** |
| Six-platform settings authority and synchronization | `settings/settings.js` UI intent plus approved Android six-platform policy | RN `SettingsService` -> `ForegroundAppModule` -> `MonitoredSiteConfig` | `SettingsService.test.js`, `MonitoredSiteConfigTest`; YouTube Session 2 runtime | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Foreground application truth | `extension/background.js` monitored-tab behavior, adapted to Android UsageStats | `ForegroundMonitorService`, `NativeRuntimePolicy` | `NativeRuntimePolicyTest`; Session 2 Usage Access, screen-off, launcher, and YouTube checks | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Fifteen-second monitored-use threshold | `extension/background.js:startTimer` | `ForegroundMonitorService`, `NativeRuntimePolicy` | `NativeRuntimePolicyTest`; YouTube threshold in Session 2 | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Global blocking lock and single lifecycle | Baseline active `quizState`; approved native-global obligation | `QuizSession` | `QuizSessionRecoveryTest`; P2 and Session 2 app-switching evidence | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Native blocking overlay and single registered root | `extension/content.js:createOverlay`, strengthened for WindowManager | `OverlayManager`, orchestrated by `ForegroundMonitorService` | registered-root predicate test; P2 regression and Session 2 root-count evidence | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Halo | `extension/content.js:createOverlay` pre-quiz prompt | `QuizSession` phase `HALO`, `OverlayManager` | Session 2 successful lifecycle | **RUNTIME VERIFIED** |
| Text question rendering | `extension/content.js:loadQuestion` | `OverlayManager` from `QuizSession` snapshot | production renderer/source review and API/state automation | **SOURCE VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| Visual answer-image rendering | `extension/content.js:loadQuestion` Visual path | `OverlayManager` bounded image loader | Session 2 successful lifecycle | **RUNTIME VERIFIED** |
| Image-category question rendering | `extension/content.js:loadQuestion` question-image path | `OverlayManager` bounded image loader | production renderer/source review and API/state automation | **SOURCE VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| Stroop rendering and Indonesian color mapping | `extension/content.js:loadQuestion` Stroop path | `OverlayManager` explicit native mapping | Session 2 successful lifecycle | **RUNTIME VERIFIED** |
| Numeric question rendering | Backend-supported Android question category | `OverlayManager` from `QuizSession` snapshot | Session 2 successful lifecycle | **RUNTIME VERIFIED** |
| Countdown and pause/resume | `extension/content.js:startQuizTimer` | `QuizSession` | recovery automation plus P2/Session 2 lifecycle evidence | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Answer evaluation and analytics payload | `extension/content.js:checkAnswer`, `saveAnswer` | `QuizSession`, `QuizApiClient` | `QuizApiContractTest`, `QuizSessionRecoveryTest`; Session 2 backend flow | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Wrong-answer same-category replacement | `extension/content.js:nextQuestion`, `loadReplacementQuestion` | `QuizSession`, `QuizApiClient`, same `OverlayManager` root | replacement recovery/API tests; P2 single-surface regression; Session 2 timeout/retry/success | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Correct/wrong feedback and approximately 1.8-second transition | `extension/content.js:checkAnswer`, `nextQuestion` | `QuizSession` feedback deadline, `OverlayManager` | P2 and Session 2 successful lifecycle | **RUNTIME VERIFIED** |
| Session finish and local cleanup | `extension/content.js:finishSession`, `finishQuiz` | `QuizSession`, service completion claim, `OverlayManager` | API/recovery tests; P2 and Session 2 completion with root count `1 -> 0` | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Snapshot v1/v2 restore and known-session reuse | Baseline `quizState`, intentionally strengthened for Android | `QuizSession` durable snapshot | `QuizSessionRecoveryTest`; P2/Session 2 process/service recovery | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Operation journal and ambiguous backend windows | Android hardening beyond browser baseline | `QuizSession.PendingOperation`, `AnswerJournal` | `QuizSessionRecoveryTest`, `QuizApiContractTest`; lifecycle documentation | **AUTOMATED VERIFIED**, **SOURCE VERIFIED** |
| Corrupt active snapshot fails closed | Android no-bypass hardening | `QuizSession` `RECOVERY_BLOCKED` | `QuizSessionRecoveryTest`; P2 runtime corruption check | **AUTOMATED VERIFIED**, **HISTORICAL RUNTIME VERIFIED** |
| Overlay permission denial/revocation/recovery | Android platform requirement | RN readiness coordinator; service and `OverlayManager` attach boundary | P2 and Session 2 active-lifecycle recovery | **RUNTIME VERIFIED** |
| Usage Access revocation/restoration | Android platform requirement | RN `DetectorService`; continuous native foreground validation | `DetectorService.test.js`, `NativeRuntimePolicyTest`; Session 2 effective UID app-op test | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Notification permission deny/grant and FGS continuity | Android 13+ platform requirement | RN `DetectorService`, native FGS notification | `DetectorService.test.js`; API 36 Session 2 check | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Logout and logout during an active obligation | Baseline account logout, strengthened no-bypass rule | RN account services, native mirror, `QuizSession` | RN account tests; P2 runtime active-quiz logout | **AUTOMATED VERIFIED**, **HISTORICAL RUNTIME VERIFIED** |
| YouTube package policy | Approved six-platform Android policy | `MonitoredSiteConfig`: `com.google.android.youtube` | resolver test; installed-app Session 2 enabled/disabled runtime | **AUTOMATED VERIFIED**, **RUNTIME VERIFIED** |
| Instagram package policy | Approved six-platform Android policy | `MonitoredSiteConfig`: `com.instagram.android` | resolver/config tests | **AUTOMATED VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| TikTok package policy | Approved six-platform Android policy | `MonitoredSiteConfig`: `com.zhiliaoapp.musically`, `com.ss.android.ugc.trill` | both aliases covered by resolver/config tests | **AUTOMATED VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| Facebook package policy | Approved six-platform Android policy | `MonitoredSiteConfig`: `com.facebook.katana` | resolver/config tests | **AUTOMATED VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| X package policy | Approved six-platform Android policy | `MonitoredSiteConfig`: `com.twitter.android` | resolver/config tests | **AUTOMATED VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| Threads package policy | Approved six-platform Android policy | `MonitoredSiteConfig`: `com.instagram.barcelona` | resolver/config tests | **AUTOMATED VERIFIED**, **NON-BLOCKING ACCEPTANCE DEBT** |
| Feed | Legacy `feed.html` / `feed.js` | None in Android release path | product scope decision and active-path source guard | **OUT OF SCOPE** |

## API transport contract

The Android request construction is protected by `QuizApiContractTest` for all
blocking actions: `startSession`, `getQuiz`, `saveAnswer`,
`getNextQuestion`, and `finishSession`. The configured quiz and analytics Apps
Script endpoints are the same endpoints exercised by the successful Session 2
runtime lifecycle.

The backend provides no idempotency key or reconciliation endpoint. Delivery
guarantees therefore remain those documented in
`native-blocking-lifecycle.md`: no operation is represented as end-to-end
exactly once, and unresolved mutation windows remain blocking and
operation-aware.

## Release policy and remaining acceptance debt

The accepted Android gate uses actual YouTube runtime evidence plus automated
exact-package resolver/config coverage for the other five approved platforms.
Instagram, TikTok, Facebook, X, and Threads were not installed in the Session 2
emulator; their missing device evidence is recorded as non-blocking acceptance
debt and is not converted into a runtime pass.

The Session 2 backend selection did not produce Text or Image-category
questions. Their production render paths remain source-verified, while Visual,
Stroop, and Numeric paths were observed in a successful blocking lifecycle.
This is also non-blocking acceptance debt under the approved gate.

## Final packaging gate

The following are all mandatory before an Android release can be declared
ready:

1. All 53 RN Jest tests and all 24 native JVM tests pass.
2. TypeScript, scoped lint, Kotlin compile, debug assembly, and release
   pre-signing checks pass.
3. The final merged release manifest excludes `QUERY_ALL_PACKAGES` and retains
   only the reviewed permissions/components.
4. Release signing uses operator-approved external credentials; debug signing
   is never an allowed fallback.
5. A current signed APK and AAB are produced from the frozen candidate.
6. Both artifacts are signature/certificate verified and SHA-256 checksummed.
7. The signed APK installs and launches on the acceptance device, starts the
   foreground service when eligible, and preserves the verified blocking path.
8. No active critical regression or committed secret is present.

If approved release signing credentials are unavailable, items 5-7 cannot be
substituted with an old artifact or the repository debug keystore. The correct
release verdict is **NOT READY**, even when source/configuration and pre-signing
checks are otherwise healthy.
