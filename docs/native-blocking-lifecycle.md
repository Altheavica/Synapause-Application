# Native Blocking Lifecycle and Recovery Contract

This document describes the final Android blocking-runtime contract after P0-P2.
It is intentionally stronger than the browser extension's persistence model.

## Ownership boundaries

| Responsibility | Owner |
| --- | --- |
| Authentication, account state, application UI, theme, and monitored-site settings | React Native |
| Durable user and monitored-site mirrors used by the native runtime | Android bridge/storage |
| Foreground detection, the 15-second monitored-use timer, and service orchestration | `ForegroundMonitorService` |
| The blocking obligation and quiz lifecycle | `QuizSession` |
| WindowManager rendering and image requests | `OverlayManager` |
| Backend transport | `QuizApiClient` |

`QuizSession` is the sole native owner of `quizRequired`, lifecycle identity,
backend session identity, quiz progress, and recovery state. Persistence is a
durable snapshot of that owner, not a second state owner. `OverlayManager` never
decides that an obligation is complete.

React root unmount removes React-owned listeners only. It does not stop or own
the lifetime of the foreground service.

## Browser baseline versus Android

The browser extension keeps a shared `quizState` containing only:

- `questions`
- `currentQuestion`
- `SESSION_ID`
- `quizSeconds`
- `questionStartTime`
- `isPaused`

That state is held by the extension background runtime and is shared with
monitored tabs. It does not provide Android-style durable process-recovery or an
operation journal.

Android uses a stronger contract because a global application overlay and a
foreground service can be detached or recreated independently of the
application UI. The stronger persistence is intentional platform hardening; it
is not a literal one-to-one port of the browser persistence mechanism.

## Android snapshot contract

The blocking snapshot is stored in SharedPreferences:

- preferences: `synapause_quiz_session`
- key: `nativeBlockingQuizSnapshot`
- current version: `2`
- accepted legacy version: `1`

Version 2 conceptually contains:

- snapshot version and save time;
- `quizRequired`, active/completed flags, lifecycle ID, and lifecycle phase;
- the lifecycle-scoped user ID/name used by the active quiz;
- randomized Halo greeting, body, and message;
- backend session ID;
- questions, current index, and replacement question state;
- countdown value, question start time, pause/running state;
- feedback, answer-transition state, and feedback deadline;
- error and retry classification;
- `PendingOperation`, `AnswerJournal`, and operation sequence;
- completion state required for idempotent local cleanup.

Valid version-1 snapshots are restored with defined compatibility defaults for
journal fields and are migrated through the normal version-2 persistence path.
They are not discarded merely because they predate the journal.

`COMPLETED` is durable before local cleanup. Successful cleanup synchronously
removes the snapshot, clears the blocking obligation, resets transient quiz
state, and only then permits a fresh monitored-use cycle.

## Durability policy

| State change | Write mode | Reason |
| --- | --- | --- |
| Countdown tick | asynchronous `apply()` | High-frequency, low-risk update; elapsed time is recovered from `savedAt` |
| Obligation/lifecycle activation | synchronous `commit()` | Prevent silent obligation loss |
| Operation intent and in-flight stage | synchronous `commit()` | Preserve ambiguous network boundaries |
| Backend session ID and loaded questions | synchronous `commit()` | Prevent a duplicate session or loss of usable server state |
| Selected answer, feedback, and analytics delivery state | synchronous `commit()` | Preserve user interaction and prevent double evaluation |
| Replacement result | synchronous `commit()` | Reuse the returned question after recovery |
| `FINISHING` and `COMPLETED` | synchronous `commit()` | Prevent resurrection or premature local completion |
| Completed snapshot removal | synchronous `commit()` | Make the final obligation clear deterministic |

Not every write is synchronous. Only lifecycle-critical boundaries use
`commit()`; countdown ticks deliberately remain asynchronous.

## Operation journal and retry

`PendingOperation` covers:

- `START_SESSION`
- `LOAD_QUESTIONS` (`getQuiz` transport call)
- `REPLACEMENT` (`getNextQuestion` transport call)
- `FINISH_SESSION`

It records an operation ID, lifecycle ID, operation type, `INTENDED` or
`IN_FLIGHT` stage, attempt number, start time, and replacement source metadata
when applicable. A successful result is first folded into authoritative quiz
state durably, then the pending operation is cleared.

`AnswerJournal` separately records answer identity, question/category,
selected and correct answers, correctness, response time, replacement flag,
attempt number, and analytics delivery state:

- `INTENDED`
- `IN_FLIGHT`
- `DELIVERED`
- `UNKNOWN`

An answer restored from `INTENDED` or `IN_FLIGHT` becomes `UNKNOWN`; the client
does not automatically send it again. Feedback is restored from the same
answer state and continues its remaining 1.8-second transition without
re-evaluating or resubmitting the answer.

Manual operation retry is operation-aware and bounded to three attempts. It
does not route every failure through a new session start. A known session ID is
always reused.

## Backend delivery guarantees

The current Apps Script contract has no client idempotency key or reconciliation
endpoint. Therefore SynaPause does not claim end-to-end exactly-once delivery.

| Operation | Guarantee | Ambiguous window | Recovery policy |
| --- | --- | --- | --- |
| `startSession` | `AMBIGUOUS-WINDOW-REMAINS` | Server may create a session before the client receives or durably stores its ID | If the ID is known, reuse it and never start again. If unknown, block in operation-aware error; bounded manual retry may create a duplicate remote session. |
| `getQuiz` | `BEST-EFFORT` | Response may arrive after interruption, but the request is read-only from the client's perspective | Reuse the known session ID and perform bounded manual question-load retry. Never restart the session merely to reload questions. |
| `saveAnswer` | `BEST-EFFORT`, one client attempt | Server may save the answer before the response is lost | Persist `UNKNOWN`; do not auto-resend. Quiz progression remains explicit and the duplicate-delivery risk is not hidden. |
| `getNextQuestion` | `AMBIGUOUS-WINDOW-REMAINS` | A replacement may be selected remotely before its response is durably known | Reuse a durably known result. Otherwise enter replacement-aware error and allow bounded manual retry tied to the same source question/category. |
| `finishSession` | `AMBIGUOUS-WINDOW-REMAINS` | Server may finish the session before the client receives confirmation | Keep `FINISHING` intent durable, recover as a blocking error, and use bounded manual finish retry. Local completion occurs only after a successful response is durably recorded. |

## Fail-closed recovery

A malformed or internally inconsistent active snapshot is not silently deleted.
It is replaced by a durable fail-closed state:

- phase `ERROR`;
- failure `RECOVERY_BLOCKED`;
- `quizRequired == true`;
- monitored timer blocked;
- no new backend session created automatically;
- no completion or obligation clear inferred from corruption.

This state requires an explicit future recovery/reset policy. Storage damage can
remove renderable quiz details, but it cannot silently grant a blocking bypass.

## Phase recovery

- `HALO`: restore the same lifecycle, questions, session, and randomized copy.
- `QUESTION`: restore the current question and derive remaining countdown from
  the saved timestamp.
- `FEEDBACK`: restore selection/feedback and continue the remaining delay
  without resubmitting the answer.
- Pending replacement: restore as a replacement-aware blocking error.
- `FINISHING`: restore as a finish-aware blocking error rather than looping the
  request automatically.
- `COMPLETED`: signal idempotent surface/obligation cleanup and never resurrect
  the question flow.
- `ERROR`: preserve the blocking obligation and expose only the operation-aware
  retry that is safe under the recorded state.

## Surface and WindowManager contract

`OverlayManager` renders the current `QuizSession.Snapshot`; it does not own quiz
progress or completion.

A root view can be:

1. registered/pending with WindowManager (`parent != null`);
2. attached (`isAttachedToWindow == true`);
3. stale/unregistered (neither condition is true).

`isAttachedToWindow == false` alone does not mean the view is stale. This rule
prevents a second root when two durable state publications arrive before the
first root's attach callback.

HALO and QUIZ may use different layout roots, but the previous root is detached
before the next becomes the single registered blocking surface. Question,
feedback, error, normal advance, and replacement renders reuse the current QUIZ
surface. Window attach/detach failure never means quiz completion:

```text
surface failure != completion
```

If a surface is unavailable, the service retries rendering the latest snapshot
for the same lifecycle. The obligation, backend session, snapshot, and global
timer lock remain intact.

## Wrong-answer replacement contract

```text
wrong answer
-> durable feedback and answer journal
-> 1.8-second feedback delay
-> durable replacement intent for source question/category
-> getNextQuestion
-> durable replacement result
-> same lifecycle ID
-> same backend session ID
-> same QUIZ blocking surface
-> old question content replaced
```

Replacement does not create a new obligation, session, Halo, or popup.

## Six-platform monitoring policy

React Native stores the product setting under AsyncStorage key
`synapauseSites`. Native code stores a validated mirror in
`synapause_monitoring_config`, key `monitoredSites`.

| Platform key | Android package aliases |
| --- | --- |
| `youtube` | `com.google.android.youtube` |
| `instagram` | `com.instagram.android` |
| `tiktok` | `com.zhiliaoapp.musically`, `com.ss.android.ugc.trill` |
| `facebook` | `com.facebook.katana` |
| `x` | `com.twitter.android` |
| `threads` | `com.instagram.barcelona` |

All six default to enabled. Settings rejects an all-disabled configuration.
Missing, malformed, or all-disabled native mirrors are repaired to the safe
all-enabled default. A partial mirror preserves valid boolean values and
defaults missing or wrong-type platform entries to enabled. Package resolution
uses exact aliases; unsupported packages resolve to no platform.

The flow is:

```text
RN Settings
-> AsyncStorage synapauseSites
-> ForegroundAppModule.updateMonitoredSites
-> native persisted mirror
-> ForegroundMonitorService reload
-> exact package resolver
-> enabled policy
-> monitored timer
```

A settings change never mutates an active `QuizSession`. After legitimate quiz
completion, the fresh timer decision uses the latest mirrored configuration.

## Foreground truth and timer behavior

The service polls every second and queries UsageStats over the preceding
30 seconds. On Android 10 and newer it uses `ACTIVITY_RESUMED`; older versions
use `MOVE_TO_FOREGROUND`. `USER_INTERACTION` is also accepted as recent evidence,
and corresponding pause/stop/background events invalidate the selected package
when applicable.

Foreground evidence is authoritative for at most 20 seconds. The service moves
to unknown when:

- no recent foreground event exists;
- the newest evidence is stale;
- the screen is non-interactive;
- Usage Access is unavailable or revoked;
- the UsageStats query fails.

Unknown, launcher, unsupported, and disabled packages do not run the monitored
timer. Losing foreground evidence pauses the current pre-obligation elapsed
timer; it does not itself complete or clear anything. A monitored enabled app
can resume that shared pre-obligation timer. Changing a platform across the
enabled/disabled boundary resets the timer so stale disabled-app time cannot
trigger an obligation. Legitimate quiz completion always resets to zero before
deciding whether a fresh cycle can start.

`quizRequired` has precedence over all foreground and site-setting decisions:

```text
quizRequired == true -> monitored timer cannot run
```

## Account, permissions, and service start

React Native AsyncStorage key `synapauseUser` is the authoritative account
record with schema `{id, username, email}`. Native SharedPreferences
`synapause_storage`/`synapauseUser` is only a validated runtime mirror.

Cold-start coordination is:

```text
restore and validate RN user
-> update native user mirror
-> restore and sync six-site config
-> verify/request Usage Access
-> verify/request overlay permission
-> request notification permission where required
-> idempotent foreground-service start
```

Bridge or permission failure does not turn a successful backend login into an
invalid-credentials result. Monitoring start is coordinated by
`DetectorService`; user synchronization itself does not create another service
start path.

## Logout during an active quiz

Logout clears the authoritative RN account record and the native user mirror.
When no quiz is active, the normal monitored timer is reset and the service can
stop.

When `quizRequired` is active:

- the current `QuizSession` and its durable snapshot remain authoritative;
- the overlay and obligation remain blocking;
- lifecycle-scoped user data already in the quiz snapshot remains available;
- the quiz can end only through legitimate completion;
- completion does not start another timer because no logged-in native user
  remains.

Account storage, the native account mirror, and the blocking snapshot are
separate state domains.
