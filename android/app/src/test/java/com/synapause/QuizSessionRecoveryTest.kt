package com.synapause

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
class QuizSessionRecoveryTest {
    private lateinit var preferences: SharedPreferences

    @Before
    fun setUp() {
        QuizSession.resetInMemoryForTesting()
        preferences = InMemorySharedPreferences()
        preferences.edit().clear().commit()
    }

    @After
    fun tearDown() {
        QuizSession.resetInMemoryForTesting()
        preferences.edit().clear().commit()
    }

    @Test
    fun duplicateRequirementCreatesOnlyOneGlobalObligation() {
        QuizSession.configurePersistence(preferences)

        assertTrue(QuizSession.requireQuiz())
        val lifecycle = QuizSession.getSnapshot().lifecycleId
        assertFalse(QuizSession.requireQuiz())
        assertEquals(lifecycle, QuizSession.getSnapshot().lifecycleId)
        assertTrue(QuizSession.isQuizRequired())
    }

    @Test
    fun restoresAValidVersionTwoQuestionAndReusesItsLifecycleAndSession() {
        writeSnapshot(snapshotJson(version = 2, phase = "QUESTION"))

        QuizSession.configurePersistence(preferences)
        val before = QuizSession.getSnapshot()
        QuizSession.startBlockingQuiz("different-user", "Different Name")
        val after = QuizSession.getSnapshot()

        assertEquals(41L, before.lifecycleId)
        assertEquals("session-1", before.sessionId)
        assertEquals("question-1", before.question?.id)
        assertEquals(before.lifecycleId, after.lifecycleId)
        assertEquals(before.sessionId, after.sessionId)
        assertTrue(after.quizRequired)
    }

    @Test
    fun migratesAValidVersionOneSnapshotToVersionTwo() {
        writeSnapshot(snapshotJson(version = 1, phase = "HALO"))

        QuizSession.configurePersistence(preferences)

        val restored = QuizSession.getSnapshot()
        val persisted = JSONObject(requireNotNull(preferences.getString(QuizSession.SNAPSHOT_KEY, null)))
        assertEquals(QuizSession.Phase.HALO, restored.phase)
        assertEquals(QuizSession.SNAPSHOT_VERSION, persisted.getInt("version"))
        assertEquals("session-1", restored.sessionId)
    }

    @Test
    fun malformedAndUnsupportedSnapshotsFailClosed() {
        listOf(
            "{",
            snapshotJson(version = 99, phase = "QUESTION").toString(),
            snapshotJson(version = 2, phase = "QUESTION", completed = true).toString()
        ).forEach { raw ->
            QuizSession.resetInMemoryForTesting()
            preferences.edit().putString(QuizSession.SNAPSHOT_KEY, raw).commit()

            QuizSession.configurePersistence(preferences)
            val snapshot = QuizSession.getSnapshot()
            val diagnostics = QuizSession.recoveryDiagnosticsForTesting()

            assertEquals(QuizSession.Phase.ERROR, snapshot.phase)
            assertTrue(snapshot.quizRequired)
            assertTrue(snapshot.active)
            assertFalse(snapshot.canRetry)
            assertEquals("RECOVERY_BLOCKED", diagnostics.failedOperation)
        }
    }

    @Test
    fun restoresCompletedStateWithoutResurrectingQuestionsAndClearsOnce() {
        writeSnapshot(snapshotJson(version = 2, phase = "COMPLETED", completed = true))
        QuizSession.configurePersistence(preferences)

        val lifecycle = QuizSession.getSnapshot().lifecycleId
        assertEquals(QuizSession.Phase.COMPLETED, QuizSession.getSnapshot().phase)
        assertTrue(QuizSession.claimCompletedLifecycle(lifecycle))
        assertFalse(QuizSession.claimCompletedLifecycle(lifecycle))
        assertTrue(QuizSession.clearCompletedLifecycle(lifecycle))
        assertFalse(QuizSession.clearCompletedLifecycle(lifecycle))
        assertEquals(QuizSession.Phase.IDLE, QuizSession.getSnapshot().phase)
        assertFalse(QuizSession.isQuizRequired())
    }

    @Test
    fun restoresEveryPendingOperationWithoutInventingExactlyOnceDelivery() {
        val operations = listOf(
            "START_SESSION" to "",
            "LOAD_QUESTIONS" to "session-1",
            "REPLACEMENT" to "session-1",
            "FINISH_SESSION" to "session-1"
        )

        listOf("INTENDED", "IN_FLIGHT").forEach { stage ->
            operations.forEach { (operation, sessionId) ->
                QuizSession.resetInMemoryForTesting()
                val json = snapshotJson(version = 2, phase = "ERROR", sessionId = sessionId)
                json.put("failedOperation", operation)
                json.put(
                    "pendingOperation",
                    pendingOperationJson(operation, attempt = 1, stage = stage)
                )
                writeSnapshot(json)

                QuizSession.configurePersistence(preferences)
                val diagnostics = QuizSession.recoveryDiagnosticsForTesting()

                assertEquals(QuizSession.Phase.ERROR, QuizSession.getSnapshot().phase)
                assertEquals(operation, diagnostics.pendingOperation)
                assertEquals(stage, diagnostics.pendingStage)
                assertEquals(1, diagnostics.pendingAttempt)
                assertTrue(QuizSession.getSnapshot().quizRequired)
            }
        }
    }

    @Test
    fun retryLimitBecomesRecoveryBlocked() {
        val json = snapshotJson(version = 2, phase = "ERROR")
        json.put("failedOperation", "REPLACEMENT")
        json.put("pendingOperation", pendingOperationJson("REPLACEMENT", attempt = 3))
        writeSnapshot(json)

        QuizSession.configurePersistence(preferences)

        assertFalse(QuizSession.getSnapshot().canRetry)
        assertEquals(
            "RECOVERY_BLOCKED",
            QuizSession.recoveryDiagnosticsForTesting().failedOperation
        )
    }

    @Test
    fun inFlightAnswerRestoresAsUnknownWithoutBlindResend() {
        val json = snapshotJson(version = 2, phase = "FEEDBACK")
        json.put("answerTransitionInProgress", true)
        json.put("isPaused", true)
        json.put("countdownRunning", true)
        json.put("feedbackTransitionDueAt", System.currentTimeMillis() + 10_000L)
        json.put("feedback", feedbackJson())
        json.put("answerJournal", answerJournalJson("IN_FLIGHT"))
        writeSnapshot(json)

        QuizSession.configurePersistence(preferences)

        val snapshot = QuizSession.getSnapshot()
        val diagnostics = QuizSession.recoveryDiagnosticsForTesting()
        assertEquals(QuizSession.Phase.FEEDBACK, snapshot.phase)
        assertEquals("UNKNOWN", diagnostics.answerDelivery)
        assertEquals("question-1", diagnostics.answerQuestionId)
        assertFalse(snapshot.canRetry)
    }

    @Test
    fun intendedAnswerAlsoRestoresAsUnknownWhileTerminalDeliveryIsPreserved() {
        listOf(
            "INTENDED" to "UNKNOWN",
            "DELIVERED" to "DELIVERED",
            "UNKNOWN" to "UNKNOWN"
        ).forEach { (storedDelivery, expectedDelivery) ->
            QuizSession.resetInMemoryForTesting()
            val json = snapshotJson(version = 2, phase = "FEEDBACK")
            json.put("answerTransitionInProgress", true)
            json.put("isPaused", true)
            json.put("countdownRunning", true)
            json.put("feedbackTransitionDueAt", System.currentTimeMillis() + 10_000L)
            json.put("feedback", feedbackJson())
            json.put("answerJournal", answerJournalJson(storedDelivery))
            writeSnapshot(json)

            QuizSession.configurePersistence(preferences)

            val diagnostics = QuizSession.recoveryDiagnosticsForTesting()
            assertEquals(expectedDelivery, diagnostics.answerDelivery)
            assertEquals("question-1", diagnostics.answerQuestionId)
            assertEquals(QuizSession.Phase.FEEDBACK, QuizSession.getSnapshot().phase)
        }
    }

    @Test
    fun durableReplacementResultRestoresAtTheSameIndexLifecycleAndSession() {
        val json = snapshotJson(version = 2, phase = "QUESTION")
        json.put("questions", JSONArray().put(questionJson(id = "replacement-1")))
        writeSnapshot(json)

        QuizSession.configurePersistence(preferences)
        val snapshot = QuizSession.getSnapshot()

        assertEquals(41L, snapshot.lifecycleId)
        assertEquals("session-1", snapshot.sessionId)
        assertEquals(0, snapshot.currentQuestion)
        assertEquals("replacement-1", snapshot.question?.id)
        assertFalse(snapshot.replacementInProgress)
    }

    private fun writeSnapshot(json: JSONObject) {
        preferences.edit()
            .putString(QuizSession.SNAPSHOT_KEY, json.toString())
            .commit()
    }

    private fun snapshotJson(
        version: Int,
        phase: String,
        completed: Boolean = false,
        sessionId: String = "session-1"
    ): JSONObject {
        return JSONObject().apply {
            put("version", version)
            put("savedAt", System.currentTimeMillis())
            put("lifecycleId", 41L)
            put("quizRequired", true)
            put("active", true)
            put("completed", completed)
            put("phase", phase)
            put("userId", "user-1")
            put("userName", "Ghazy")
            put("haloGreeting", "HALOW")
            put("haloLighter", "Take a break")
            put("haloMessage", "Continue")
            put("sessionId", sessionId)
            put("questions", JSONArray().put(questionJson()))
            put("currentQuestion", 0)
            put("quizSeconds", 25)
            put("questionStartTime", System.currentTimeMillis() - 1_000L)
            put("isPaused", phase != "QUESTION")
            put("answerTransitionInProgress", false)
            put("replacementInProgress", false)
            put("countdownRunning", phase == "QUESTION")
            put("feedbackTransitionDueAt", 0L)
            put("feedback", JSONObject.NULL)
            put("errorMessage", JSONObject.NULL)
            put("failedOperation", JSONObject.NULL)
            put("pendingOperation", JSONObject.NULL)
            put("answerJournal", JSONObject.NULL)
            put("operationSequence", 0L)
        }
    }

    private fun questionJson(id: String = "question-1"): JSONObject {
        return JSONObject().apply {
            put("id", id)
            put("question", "Choose A")
            put("category", "Text")
            put("optionA", "Alpha")
            put("optionB", "Beta")
            put("optionC", "Gamma")
            put("optionD", "Delta")
            put("answer", "A")
            put("questionImage", JSONObject.NULL)
            put("imageA", JSONObject.NULL)
            put("imageB", JSONObject.NULL)
            put("imageC", JSONObject.NULL)
            put("imageD", JSONObject.NULL)
            put("targetWord", JSONObject.NULL)
            put("inkColor", JSONObject.NULL)
        }
    }

    private fun pendingOperationJson(
        type: String,
        attempt: Int,
        stage: String = "IN_FLIGHT"
    ): JSONObject {
        return JSONObject().apply {
            put("id", "41-1-$type")
            put("lifecycleId", 41L)
            put("type", type)
            put("stage", stage)
            put("attempt", attempt)
            put("startedAt", System.currentTimeMillis())
            put("questionIndex", if (type == "REPLACEMENT") 0 else -1)
            put("sourceQuestionId", if (type == "REPLACEMENT") "question-1" else "")
            put("category", if (type == "REPLACEMENT") "Text" else "")
        }
    }

    private fun feedbackJson(): JSONObject {
        return JSONObject().apply {
            put("selectedIndex", 1)
            put("correctIndex", 0)
            put("selectedAnswer", "B")
            put("correctAnswer", "A")
            put("isCorrect", false)
            put("title", "Jawaban salah")
        }
    }

    private fun answerJournalJson(delivery: String): JSONObject {
        return JSONObject().apply {
            put("id", "answer-1")
            put("lifecycleId", 41L)
            put("questionIndex", 0)
            put("questionId", "question-1")
            put("category", "Text")
            put("selectedAnswer", "B")
            put("correctAnswer", "A")
            put("isCorrect", false)
            put("isReplacement", true)
            put("responseTimeMs", 1_234L)
            put("delivery", delivery)
            put("attempt", 1)
        }
    }
}
