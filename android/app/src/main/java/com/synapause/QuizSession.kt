package com.synapause

import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import kotlin.math.max

internal object QuizSession {
    private const val TAG = "SynapauseMonitor"
    private const val INITIAL_QUIZ_SECONDS = 30
    private const val FEEDBACK_DELAY_MS = 1_800L
    private const val MAX_OPERATION_ATTEMPTS = 3
    internal const val SNAPSHOT_KEY = "nativeBlockingQuizSnapshot"
    internal const val LEGACY_SNAPSHOT_VERSION = 1
    internal const val SNAPSHOT_VERSION = 2

    private val GREETINGS = listOf(
        "HALOW",
        "HAIII",
        "HEI HEI",
        "ALOO",
        "DEY"
    )

    private val LIGHTER = listOf(
        "Konten di layar ini tak akan pernah habis, tapi waktumu hari ini ada batasnya. Sudah berapa jam yang terlewat tanpa kamu sadari?",
        "Kamu terlalu berharga kalau cuma jadi penonton keberhasilan orang lain setiap hari. Kapan giliran kamu yang melangkah dan mewujudkan impianmu sendiri?",
        "Rencananya cuma mau sebentar, kan? Tanpa sadar, jempolmu terus mengusap layar, sementara hal-hal penting di hidupmu sedang menunggumu...",
        "Coba tanyakan ke dirimu sendiri: apakah kamu yang sedang memegang ponsel ini, atau justru ponsel ini yang sedang mengendalikan hari-harimu? Kalau kata Einstein sih, Life is like riding a bicycle. To keep your balance, you must keep moving.",
        "Pikiranmu sedang lelah karena terlalu banyak informasi yang masuk. Matikan layarnya sejenak, biarkan otakmu bernapas dan istirahat yang sebenarnya.",
        "Kira-kira, dirimu di masa depan nanti akan berterima kasih atau malah menyesal saat mengingat apa yang kamu lakukan dengan ponselmu hari ini?",
        "Ada orang-orang nyata di sekitarmu yang rindu mengobrol dan menghabiskan waktu bersamamu secara utuh, bukan cuma ragamu yang ada di dekat mereka.",
        "Menutup aplikasi ini memang butuh niat kuat. Tapi aku percaya, kamu punya kendali penuh atas dirimu sendiri. Kata Plato, The beginning is the most important part of the work.",
        "Hal terburuk dari terlalu lama scrolling adalah menyadari bahwa hari sudah malam, sementara tak ada satu pun hal berarti yang selesai kamu kerjakan.",
        "Dunia nyata dan potensi dirimu sudah menanti di luar layar ini. Yuk, kunci ponselmu sekarang dan mulai lakukan satu hal kecil yang bermakna!",
        "Setiap kali kamu mengabaikan tujuanmu demi scrolling, ada versi dirimu di masa depan yang pelan-pelan sedang kamu kecewakan. Kamu yakin mau terus menyakiti potensinya? kalau kata Nelson Mandela, It always seems impossible until it's done.",
        "Di dekatmu, ada orang yang merindukan perhatian utuhmu. Jangan sampai suatu hari kamu sadar, kamu lebih sering menatap layar dingin ini daripada menatap mata orang-orang yang mencintaimu.",
        "Jujur, setelah berjam-jam mengusap layar, apakah hatimu merasa lebih tenang dan bahagia? Atau justru merasa makin kosong dan kesepian?",
        "Hari ini hanya terjadi satu kali dalam hidupmu. Sayang sekali kalau momen berharga ini menguap begitu saja hanya untuk menonton kehidupan orang lain. Kata guru besar Mahatma Ghandi, The future depends on what you do today.",
        "Kamu cuma doomscrolling seharian? pikirkan masa depanmu.. Kalau kata uncle Ben, With great power, comes great responsibility."
    )

    private val PERSUASIONS = listOf(
        "Ayo istirahat sejenak 30 detik bersama.",
        "Waktunya merenggangkan badan dan melihat sekeliling.",
        "Yuk, beralih dari sekadar menonton jadi berkarya!",
        "Siap untuk kembali mengejar tujuan nyatamu?",
        "Ayo beri mata kita kesempatan untuk bernapas sejenak.",
        "Yuk, ikuti kuis otak singkat ini sebelum lanjut lagi.",
        "Bagaimana kalau kita coba tantangan fokus singkat sekarang?",
        "Ayo taruh layarnya sebentar.",
        "Waktunya bikin hari ini bermakna. Mulai yuk?",
        "Yuk, melangkah keluar dan nikmati dunia nyata.",
        "Siap untuk menyegarkan pikiran dan mulai lagi dari awal?",
        "Ayo tarik napas dalam-dalam bersama.",
        "Waktunya menyelesaikan tugas-tugas penting itu!",
        "Yuk, isi ulang energi pikiran kita dengan jeda singkat.",
        "Siap menguji kemampuan?"
    )

    enum class Phase {
        IDLE,
        INITIALIZING,
        HALO,
        QUESTION,
        FEEDBACK,
        FINISHING,
        COMPLETED,
        ERROR
    }

    private enum class FailedOperation {
        START_SESSION,
        LOAD_QUESTIONS,
        REPLACEMENT,
        FINISH_SESSION,
        RECOVERY_BLOCKED
    }

    private enum class BackendOperation {
        START_SESSION,
        LOAD_QUESTIONS,
        REPLACEMENT,
        FINISH_SESSION
    }

    private enum class OperationStage {
        INTENDED,
        IN_FLIGHT
    }

    private enum class AnalyticsDelivery {
        INTENDED,
        IN_FLIGHT,
        DELIVERED,
        UNKNOWN
    }

    private data class PendingOperation(
        val id: String,
        val lifecycleId: Long,
        val type: BackendOperation,
        val stage: OperationStage,
        val attempt: Int,
        val startedAt: Long,
        val questionIndex: Int = -1,
        val sourceQuestionId: String = "",
        val category: String = ""
    )

    private data class AnswerJournal(
        val id: String,
        val lifecycleId: Long,
        val questionIndex: Int,
        val questionId: String,
        val category: String,
        val selectedAnswer: String,
        val correctAnswer: String,
        val isCorrect: Boolean,
        val isReplacement: Boolean,
        val responseTimeMs: Long,
        val delivery: AnalyticsDelivery,
        val attempt: Int
    )

    private enum class PersistenceDurability {
        ASYNC,
        CRITICAL
    }

    data class Feedback(
        val selectedIndex: Int,
        val correctIndex: Int,
        val selectedAnswer: String,
        val correctAnswer: String,
        val isCorrect: Boolean,
        val title: String
    )

    data class Snapshot(
        val lifecycleId: Long,
        val quizRequired: Boolean,
        val active: Boolean,
        val completed: Boolean,
        val phase: Phase,
        val userName: String,
        val haloGreeting: String,
        val haloLighter: String,
        val haloMessage: String,
        val sessionId: String,
        val questions: List<QuizQuestion>,
        val currentQuestion: Int,
        val quizSeconds: Int,
        val questionStartTime: Long,
        val isPaused: Boolean,
        val answerTransitionInProgress: Boolean,
        val replacementInProgress: Boolean,
        val feedback: Feedback?,
        val errorMessage: String?,
        val canRetry: Boolean
    ) {
        val question: QuizQuestion?
            get() = questions.getOrNull(currentQuestion)
    }

    internal data class RecoveryDiagnostics(
        val failedOperation: String?,
        val pendingOperation: String?,
        val pendingStage: String?,
        val pendingAttempt: Int?,
        val answerDelivery: String?,
        val answerQuestionId: String?,
        val operationSequence: Long
    )

    interface Listener {
        fun onQuizStateChanged(snapshot: Snapshot)

        fun onQuizCompleted(snapshot: Snapshot) {
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val networkExecutor = Executors.newFixedThreadPool(3)

    private var quizRequired = false
    private var active = false
    private var completed = false
    private var phase = Phase.IDLE
    private var userId = ""
    private var userName = ""
    private var haloGreeting = ""
    private var haloLighter = ""
    private var haloMessage = ""
    private var sessionId = ""
    private var questions: List<QuizQuestion> = emptyList()
    private var currentQuestion = 0
    private var quizSeconds = INITIAL_QUIZ_SECONDS
    private var questionStartTime = 0L
    private var isPaused = false
    private var answerTransitionInProgress = false
    private var replacementInProgress = false
    private var feedback: Feedback? = null
    private var errorMessage: String? = null
    private var failedOperation: FailedOperation? = null
    private var pendingOperation: PendingOperation? = null
    private var answerJournal: AnswerJournal? = null
    private var operationSequence = 0L
    private var completionCleanupClaimed = false
    private var countdownRunning = false
    private var feedbackTransitionDueAt = 0L
    private var generation = 0L
    private var listener: Listener? = null
    private var persistence: SharedPreferences? = null

    private val countdownRunnable = object : Runnable {
        override fun run() {
            var scheduleNextTick = false
            var stateChanged = false

            synchronized(this@QuizSession) {
                if (!countdownRunning) {
                    return
                }

                if (!isPaused) {
                    quizSeconds--
                    stateChanged = true

                    if (quizSeconds <= 0) {
                        quizSeconds = 0
                        countdownRunning = false
                    }
                }

                scheduleNextTick = countdownRunning
            }

            if (stateChanged) {
                publishSnapshot(PersistenceDurability.ASYNC)
            }

            if (scheduleNextTick) {
                mainHandler.postDelayed(this, 1_000L)
            } else {
                Log.d(TAG, "QUIZ TIMER FINISHED")
            }
        }
    }

    fun configurePersistence(sharedPreferences: SharedPreferences) {
        var restored = false
        var resumeCountdown = false
        var feedbackResume: Triple<Long, Boolean, Long>? = null

        synchronized(this) {
            persistence = sharedPreferences

            if (!quizRequired && !active && phase == Phase.IDLE) {
                restored = restoreSnapshotLocked()
            }

            if (restored) {
                resumeCountdown =
                    (phase == Phase.QUESTION || phase == Phase.FEEDBACK) &&
                        countdownRunning &&
                        quizSeconds > 0

                val restoredFeedback = feedback
                if (
                    phase == Phase.FEEDBACK &&
                    answerTransitionInProgress &&
                    restoredFeedback != null
                ) {
                    feedbackResume = Triple(
                        generation,
                        restoredFeedback.isCorrect,
                        max(0L, feedbackTransitionDueAt - System.currentTimeMillis())
                    )
                }
            }
        }

        if (!restored) {
            return
        }

        Log.d(TAG, "QUIZ SNAPSHOT RESTORED")
        Log.d(TAG, "RESTORED QUESTION INDEX: ${getSnapshot().currentQuestion}")
        synchronized(this) {
            pendingOperation?.let {
                Log.d(
                    TAG,
                    "RESTORED PENDING OPERATION: ${it.type.name} ${it.stage.name} attempt=${it.attempt}"
                )
            }
            answerJournal?.let {
                Log.d(TAG, "RESTORED ANSWER DELIVERY: ${it.delivery.name}")
            }
        }
        publishSnapshot()

        if (resumeCountdown) {
            mainHandler.removeCallbacks(countdownRunnable)
            mainHandler.postDelayed(countdownRunnable, 1_000L)
        }

        feedbackResume?.let { (token, wasCorrect, delayMs) ->
            mainHandler.postDelayed(
                { continueAfterFeedback(token, wasCorrect) },
                delayMs
            )
        }
    }

    @Synchronized
    internal fun recoveryDiagnosticsForTesting(): RecoveryDiagnostics {
        return RecoveryDiagnostics(
            failedOperation = failedOperation?.name,
            pendingOperation = pendingOperation?.type?.name,
            pendingStage = pendingOperation?.stage?.name,
            pendingAttempt = pendingOperation?.attempt,
            answerDelivery = answerJournal?.delivery?.name,
            answerQuestionId = answerJournal?.questionId,
            operationSequence = operationSequence
        )
    }

    internal fun resetInMemoryForTesting() {
        synchronized(this) {
            generation++
            quizRequired = false
            active = false
            completed = false
            phase = Phase.IDLE
            userId = ""
            userName = ""
            haloGreeting = ""
            haloLighter = ""
            haloMessage = ""
            sessionId = ""
            questions = emptyList()
            currentQuestion = 0
            quizSeconds = INITIAL_QUIZ_SECONDS
            questionStartTime = 0L
            isPaused = false
            answerTransitionInProgress = false
            replacementInProgress = false
            feedback = null
            errorMessage = null
            failedOperation = null
            pendingOperation = null
            answerJournal = null
            operationSequence = 0L
            completionCleanupClaimed = false
            countdownRunning = false
            feedbackTransitionDueAt = 0L
            listener = null
            persistence = null
        }

        mainHandler.removeCallbacks(countdownRunnable)
    }

    @Synchronized
    fun isQuizRequired(): Boolean {
        return quizRequired
    }

    @Synchronized
    fun requireQuiz(): Boolean {
        if (quizRequired) {
            return false
        }

        quizRequired = true
        publishSnapshot()
        return true
    }

    @Synchronized
    fun clearQuizRequirement() {
        quizRequired = false
        publishSnapshot()
    }

    @Synchronized
    fun hasActiveQuiz(): Boolean {
        return active
    }

    fun setListener(value: Listener?) {
        val completedSnapshot = synchronized(this) {
            listener = value
            if (
                value != null &&
                phase == Phase.COMPLETED &&
                active &&
                completed
            ) {
                snapshotLocked()
            } else {
                null
            }
        }

        if (value != null) {
            publishSnapshot()
            completedSnapshot?.let(::publishCompleted)
        }
    }

    fun startBlockingQuiz(
        currentUserId: String,
        currentUserName: String
    ) {
        val token: Long

        synchronized(this) {
            if (active) {
                publishSnapshot()
                return
            }

            generation++
            token = generation
            active = true
            completed = false
            phase = Phase.INITIALIZING
            userId = currentUserId
            userName = currentUserName
            haloGreeting = ""
            haloLighter = ""
            haloMessage = ""
            sessionId = ""
            questions = emptyList()
            currentQuestion = 0
            quizSeconds = INITIAL_QUIZ_SECONDS
            questionStartTime = 0L
            isPaused = false
            answerTransitionInProgress = false
            replacementInProgress = false
            feedback = null
            errorMessage = null
            failedOperation = null
            pendingOperation = null
            answerJournal = null
            operationSequence = 0L
            completionCleanupClaimed = false
            countdownRunning = false
            feedbackTransitionDueAt = 0L
        }

        val operation = synchronized(this) {
            createOperationLocked(BackendOperation.START_SESSION)
        }

        mainHandler.removeCallbacks(countdownRunnable)
        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist quiz session intent",
                FailedOperation.START_SESSION
            )
            return
        }

        executeStartSession(token, operation)
    }

    fun continueToQuiz() {
        synchronized(this) {
            if (phase != Phase.HALO || questions.isEmpty()) {
                return
            }

            phase = Phase.QUESTION
            questionStartTime = System.currentTimeMillis()
            isPaused = false
            feedback = null
            answerTransitionInProgress = false
            replacementInProgress = false
            feedbackTransitionDueAt = 0L
        }

        publishSnapshot()
        startQuizTimer()
        Log.d(TAG, "NATIVE QUIZ QUESTION SHOWN")
    }

    fun selectAnswer(selectedIndex: Int) {
        val question: QuizQuestion
        val selectedAnswer: String
        val correctIndex: Int
        val isCorrect: Boolean
        val responseTimeMs: Long
        val currentSessionId: String
        val currentUserId: String
        val token: Long

        synchronized(this) {
            if (
                phase != Phase.QUESTION ||
                answerTransitionInProgress ||
                replacementInProgress
            ) {
                return
            }

            question = questions.getOrNull(currentQuestion) ?: return
            selectedAnswer = listOf("A", "B", "C", "D").getOrNull(selectedIndex) ?: return
            correctIndex = listOf("A", "B", "C", "D").indexOf(question.answer)
            isCorrect = selectedAnswer == question.answer
            responseTimeMs = System.currentTimeMillis() - questionStartTime
            currentSessionId = sessionId
            currentUserId = userId
            token = generation

            isPaused = true
            answerTransitionInProgress = true
            feedback = Feedback(
                selectedIndex = selectedIndex,
                correctIndex = correctIndex,
                selectedAnswer = selectedAnswer,
                correctAnswer = question.answer,
                isCorrect = isCorrect,
                title = if (isCorrect) "Correct!" else "Incorrect!"
            )
            feedbackTransitionDueAt = System.currentTimeMillis() + FEEDBACK_DELAY_MS
            phase = Phase.FEEDBACK
            answerJournal = AnswerJournal(
                id = nextOperationIdLocked("ANSWER"),
                lifecycleId = generation,
                questionIndex = currentQuestion,
                questionId = question.id,
                category = question.category,
                selectedAnswer = selectedAnswer,
                correctAnswer = question.answer,
                isCorrect = isCorrect,
                isReplacement = !isCorrect,
                responseTimeMs = responseTimeMs,
                delivery = AnalyticsDelivery.INTENDED,
                attempt = 1
            )
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist selected answer",
                FailedOperation.RECOVERY_BLOCKED
            )
            return
        }

        deliverAnswerAnalytics(
            token = token,
            sessionId = currentSessionId,
            userId = currentUserId,
            question = question
        )

        mainHandler.postDelayed(
            {
                continueAfterFeedback(token, isCorrect)
            },
            FEEDBACK_DELAY_MS
        )
    }

    fun retryFailedOperation() {
        val operation: FailedOperation
        val retryOperation: PendingOperation?
        val token: Long

        synchronized(this) {
            if (phase != Phase.ERROR || !active || !quizRequired) {
                return
            }

            val recordedOperation = failedOperation ?: return
            if (recordedOperation == FailedOperation.RECOVERY_BLOCKED) {
                Log.e(TAG, "QUIZ RECOVERY BLOCKED - SNAPSHOT REQUIRES SAFE RESET")
                return
            }

            operation = if (
                recordedOperation == FailedOperation.START_SESSION &&
                sessionId.isNotBlank()
            ) {
                FailedOperation.LOAD_QUESTIONS
            } else {
                recordedOperation
            }
            retryOperation = pendingOperation?.takeIf {
                it.type == operation.toBackendOperation()
            }
            if ((retryOperation?.attempt ?: 0) >= MAX_OPERATION_ATTEMPTS) {
                failedOperation = FailedOperation.RECOVERY_BLOCKED
                errorMessage = "Quiz recovery retry limit reached; obligation preserved"
                publishSnapshot(PersistenceDurability.CRITICAL)
                Log.e(TAG, "QUIZ OPERATION RETRY LIMIT REACHED")
                return
            }
            token = generation
            failedOperation = null
            errorMessage = null
            feedbackTransitionDueAt = 0L

            when (operation) {
                FailedOperation.START_SESSION,
                FailedOperation.LOAD_QUESTIONS -> {
                    phase = Phase.INITIALIZING
                    isPaused = false
                    answerTransitionInProgress = false
                    replacementInProgress = false
                }

                FailedOperation.REPLACEMENT -> {
                    phase = Phase.QUESTION
                    isPaused = true
                    answerTransitionInProgress = true
                    replacementInProgress = false
                }

                FailedOperation.FINISH_SESSION -> {
                    phase = Phase.FINISHING
                    isPaused = true
                    answerTransitionInProgress = false
                    replacementInProgress = false
                }

                FailedOperation.RECOVERY_BLOCKED -> return
            }
        }

        Log.d(TAG, "NATIVE QUIZ RETRY ${operation.name}")

        when (operation) {
            FailedOperation.START_SESSION -> retryStartSession(token, retryOperation)
            FailedOperation.LOAD_QUESTIONS -> retryLoadQuestions(token, retryOperation)
            FailedOperation.REPLACEMENT -> replaceAfterWrong(token, retryOperation)
            FailedOperation.FINISH_SESSION -> finishQuiz(token, retryOperation)
            FailedOperation.RECOVERY_BLOCKED -> Unit
        }
    }

    @Synchronized
    fun getSnapshot(): Snapshot {
        return snapshotLocked()
    }

    @Synchronized
    fun claimCompletedLifecycle(lifecycleId: Long): Boolean {
        if (
            generation != lifecycleId ||
            phase != Phase.COMPLETED ||
            !active ||
            !completed ||
            completionCleanupClaimed
        ) {
            return false
        }

        completionCleanupClaimed = true
        return true
    }

    @Synchronized
    fun releaseCompletedLifecycle(lifecycleId: Long) {
        if (generation == lifecycleId && phase == Phase.COMPLETED) {
            completionCleanupClaimed = false
        }
    }

    fun clearCompletedLifecycle(lifecycleId: Long): Boolean {
        synchronized(this) {
            if (
                generation != lifecycleId ||
                phase != Phase.COMPLETED ||
                !completionCleanupClaimed
            ) {
                return false
            }

            if (!removeSnapshotLocked(PersistenceDurability.CRITICAL)) {
                Log.e(TAG, "COMPLETED QUIZ SNAPSHOT COULD NOT BE CLEARED")
                return false
            }

            generation++
            quizRequired = false
            active = false
            completed = false
            phase = Phase.IDLE
            userId = ""
            userName = ""
            haloGreeting = ""
            haloLighter = ""
            haloMessage = ""
            sessionId = ""
            questions = emptyList()
            currentQuestion = 0
            quizSeconds = INITIAL_QUIZ_SECONDS
            questionStartTime = 0L
            isPaused = false
            answerTransitionInProgress = false
            replacementInProgress = false
            feedback = null
            errorMessage = null
            failedOperation = null
            pendingOperation = null
            answerJournal = null
            operationSequence = 0L
            completionCleanupClaimed = false
            countdownRunning = false
            feedbackTransitionDueAt = 0L
        }

        mainHandler.removeCallbacks(countdownRunnable)
        publishSnapshot(PersistenceDurability.CRITICAL)
        return true
    }

    @Synchronized
    fun saveQuizState(state: Map<String, Any?>) {
        val stateQuestions = state["questions"] as? List<*>
        if (stateQuestions != null) {
            questions = stateQuestions.mapNotNull { value ->
                when (value) {
                    is QuizQuestion -> value
                    is Map<*, *> -> QuizQuestion.fromMap(value)
                    else -> null
                }
            }
        }

        currentQuestion = (state["currentQuestion"] as? Number)?.toInt() ?: currentQuestion
        sessionId = state["SESSION_ID"]?.toString() ?: sessionId
        quizSeconds = (state["quizSeconds"] as? Number)?.toInt() ?: quizSeconds
        questionStartTime = (state["questionStartTime"] as? Number)?.toLong() ?: questionStartTime
        isPaused = state["isPaused"] as? Boolean ?: isPaused
        active = true
        publishSnapshot()
    }

    @Synchronized
    fun getQuizState(): MutableMap<String, Any?>? {
        if (!active) {
            return null
        }

        return mutableMapOf(
            "questions" to questions.map { it.toMap() },
            "currentQuestion" to currentQuestion,
            "SESSION_ID" to sessionId,
            "quizSeconds" to quizSeconds,
            "questionStartTime" to questionStartTime,
            "isPaused" to isPaused
        )
    }

    fun clearQuizState() {
        synchronized(this) {
            generation++
            active = false
            completed = false
            phase = Phase.IDLE
            userId = ""
            userName = ""
            haloGreeting = ""
            haloLighter = ""
            haloMessage = ""
            sessionId = ""
            questions = emptyList()
            currentQuestion = 0
            quizSeconds = INITIAL_QUIZ_SECONDS
            questionStartTime = 0L
            isPaused = false
            answerTransitionInProgress = false
            replacementInProgress = false
            feedback = null
            errorMessage = null
            failedOperation = null
            pendingOperation = null
            answerJournal = null
            operationSequence = 0L
            completionCleanupClaimed = false
            countdownRunning = false
            feedbackTransitionDueAt = 0L
        }

        mainHandler.removeCallbacks(countdownRunnable)
        publishSnapshot()
    }

    private fun retryStartSession(
        token: Long,
        previousOperation: PendingOperation? = null
    ) {
        val operation = synchronized(this) {
            if (sessionId.isNotBlank()) {
                null
            } else {
                createOperationLocked(
                    type = BackendOperation.START_SESSION,
                    previous = previousOperation
                )
            }
        }

        if (operation == null) {
            retryLoadQuestions(token, previousOperation = null)
            return
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist quiz session retry",
                FailedOperation.START_SESSION
            )
            return
        }

        executeStartSession(token, operation)
    }

    private fun executeStartSession(
        token: Long,
        operation: PendingOperation
    ) {
        val currentUserId = synchronized(this) { userId }

        networkExecutor.execute {
            val inFlight = markOperationInFlight(token, operation) ?: return@execute

            try {
                Log.d(TAG, "NATIVE QUIZ START SESSION attempt=${inFlight.attempt}")
                val newSessionId = QuizApiClient.startSession(currentUserId)
                val loadOperation: PendingOperation

                synchronized(this) {
                    if (!matchesOperationLocked(token, inFlight)) {
                        return@execute
                    }

                    sessionId = newSessionId
                    loadOperation = createOperationLocked(BackendOperation.LOAD_QUESTIONS)
                }

                if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
                    restoreOperationAfterCommitFailure(
                        token,
                        inFlight,
                        "Unable to persist backend quiz session",
                        FailedOperation.START_SESSION
                    )
                    return@execute
                }

                executeLoadQuestions(token, loadOperation)
            } catch (error: Exception) {
                fail(
                    token,
                    "Unable to start quiz session",
                    FailedOperation.START_SESSION,
                    error
                )
            }
        }
    }

    private fun retryLoadQuestions(
        token: Long,
        previousOperation: PendingOperation? = null
    ) {
        val operation = synchronized(this) {
            createOperationLocked(
                type = BackendOperation.LOAD_QUESTIONS,
                previous = previousOperation
            )
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist question-load retry",
                FailedOperation.LOAD_QUESTIONS
            )
            return
        }

        executeLoadQuestions(token, operation)
    }

    private fun executeLoadQuestions(
        token: Long,
        operation: PendingOperation
    ) {
        val currentUserId = synchronized(this) { userId }

        networkExecutor.execute {
            val inFlight = markOperationInFlight(token, operation) ?: return@execute

            try {
                Log.d(TAG, "NATIVE QUIZ LOAD QUESTIONS attempt=${inFlight.attempt}")
                val loadedQuestions = QuizApiClient.getQuiz(currentUserId)

                if (loadedQuestions.isEmpty()) {
                    throw IllegalStateException("Quiz API returned no questions")
                }

                synchronized(this) {
                    if (!matchesOperationLocked(token, inFlight)) {
                        return@execute
                    }

                    questions = loadedQuestions
                    currentQuestion = 0
                    quizSeconds = INITIAL_QUIZ_SECONDS
                    questionStartTime = 0L
                    isPaused = false
                    answerTransitionInProgress = false
                    replacementInProgress = false
                    feedback = null
                    failedOperation = null
                    pendingOperation = null
                    ensureHaloContentLocked()
                    phase = Phase.HALO
                }

                if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
                    restoreOperationAfterCommitFailure(
                        token,
                        inFlight,
                        "Unable to persist loaded quiz questions",
                        FailedOperation.LOAD_QUESTIONS
                    )
                    return@execute
                }

                Log.d(TAG, "NATIVE QUIZ HALO READY")
            } catch (error: Exception) {
                fail(
                    token,
                    "Unable to load quiz questions",
                    FailedOperation.LOAD_QUESTIONS,
                    error
                )
            }
        }
    }

    private fun startQuizTimer() {
        val token: Long
        synchronized(this) {
            if (quizSeconds <= 0) {
                quizSeconds = INITIAL_QUIZ_SECONDS
            }

            countdownRunning = true
            token = generation
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist quiz countdown state",
                FailedOperation.RECOVERY_BLOCKED
            )
            return
        }

        mainHandler.removeCallbacks(countdownRunnable)
        mainHandler.postDelayed(countdownRunnable, 1_000L)
    }

    private fun continueAfterFeedback(
        token: Long,
        isCorrect: Boolean
    ) {
        if (isCorrect) {
            advanceAfterCorrect(token)
        } else {
            replaceAfterWrong(token)
        }
    }

    private fun advanceAfterCorrect(token: Long) {
        var shouldFinish = false

        synchronized(this) {
            if (
                generation != token ||
                !active ||
                !answerTransitionInProgress
            ) {
                return
            }

            feedback = null
            feedbackTransitionDueAt = 0L
            currentQuestion++

            if (currentQuestion < questions.size) {
                isPaused = false
                answerTransitionInProgress = false
                answerJournal = null
                questionStartTime = System.currentTimeMillis()
                phase = Phase.QUESTION
            } else {
                phase = Phase.FINISHING
                countdownRunning = false
                shouldFinish = true
            }
        }

        if (shouldFinish) {
            mainHandler.removeCallbacks(countdownRunnable)
        }

        if (shouldFinish) {
            finishQuiz(token)
        } else {
            publishSnapshot(PersistenceDurability.CRITICAL)
            Log.d(TAG, "NATIVE QUIZ ADVANCE QUESTION")
        }
    }

    private fun replaceAfterWrong(
        token: Long,
        previousOperation: PendingOperation? = null
    ) {
        if (previousOperation != null) {
            val matchesPersistedSource = synchronized(this) {
                val source = questions.getOrNull(currentQuestion)
                previousOperation.type == BackendOperation.REPLACEMENT &&
                    previousOperation.questionIndex == currentQuestion &&
                    source != null &&
                    previousOperation.sourceQuestionId == source.id &&
                    previousOperation.category == source.category
            }

            if (!matchesPersistedSource) {
                blockForPersistenceFailure(
                    token,
                    "Replacement recovery source no longer matches persisted intent",
                    FailedOperation.RECOVERY_BLOCKED
                )
                return
            }
        }

        val question: QuizQuestion
        val currentUserId: String
        val questionIndex: Int
        val operation: PendingOperation

        synchronized(this) {
            if (
                generation != token ||
                !active ||
                !answerTransitionInProgress
            ) {
                return
            }

            question = questions.getOrNull(currentQuestion) ?: return
            currentUserId = userId
            questionIndex = currentQuestion
            feedback = null
            feedbackTransitionDueAt = 0L
            replacementInProgress = true
            phase = Phase.QUESTION
            operation = createOperationLocked(
                type = BackendOperation.REPLACEMENT,
                previous = previousOperation,
                questionIndex = questionIndex,
                sourceQuestionId = question.id,
                category = question.category
            )
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist replacement intent",
                FailedOperation.REPLACEMENT
            )
            return
        }
        Log.d(TAG, "NATIVE QUIZ LOAD REPLACEMENT")

        networkExecutor.execute {
            val inFlight = markOperationInFlight(token, operation) ?: return@execute

            try {
                val replacement = QuizApiClient.getNextQuestion(
                    userId = currentUserId,
                    category = question.category,
                    currentQuestionId = question.id
                )

                var restartCountdown = false

                synchronized(this) {
                    if (
                        !matchesOperationLocked(token, inFlight) ||
                        currentQuestion != questionIndex
                    ) {
                        return@execute
                    }

                    questions = questions.toMutableList().also {
                        it[questionIndex] = replacement
                    }
                    isPaused = false
                    answerTransitionInProgress = false
                    replacementInProgress = false
                    answerJournal = null
                    pendingOperation = null
                    questionStartTime = System.currentTimeMillis()
                    feedbackTransitionDueAt = 0L
                    phase = Phase.QUESTION
                    restartCountdown = !countdownRunning
                }

                if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
                    synchronized(this) {
                        if (
                            generation == token &&
                            currentQuestion == questionIndex &&
                            questions.getOrNull(questionIndex) == replacement
                        ) {
                            questions = questions.toMutableList().also {
                                it[questionIndex] = question
                            }
                        }
                    }
                    restoreOperationAfterCommitFailure(
                        token,
                        inFlight,
                        "Unable to persist replacement question",
                        FailedOperation.REPLACEMENT
                    )
                    return@execute
                }

                Log.d(TAG, "NATIVE QUIZ REPLACEMENT READY")

                if (restartCountdown) {
                    startQuizTimer()
                }
            } catch (error: Exception) {
                fail(
                    token,
                    "Unable to load replacement question",
                    FailedOperation.REPLACEMENT,
                    error
                )
            }
        }
    }

    private fun finishQuiz(
        token: Long,
        previousOperation: PendingOperation? = null
    ) {
        val currentSessionId = getSessionId()
        if (currentSessionId.isBlank()) {
            blockForPersistenceFailure(
                token,
                "Cannot finish quiz without a persisted backend session",
                FailedOperation.RECOVERY_BLOCKED
            )
            return
        }

        val operation = synchronized(this) {
            phase = Phase.FINISHING
            isPaused = true
            countdownRunning = false
            createOperationLocked(
                type = BackendOperation.FINISH_SESSION,
                previous = previousOperation
            )
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist quiz finish intent",
                FailedOperation.FINISH_SESSION
            )
            return
        }

        networkExecutor.execute {
            val inFlight = markOperationInFlight(token, operation) ?: return@execute

            try {
                QuizApiClient.finishSession(currentSessionId)

                val completedSnapshot: Snapshot

                synchronized(this) {
                    if (!matchesOperationLocked(token, inFlight)) {
                        return@execute
                    }

                    completed = true
                    isPaused = true
                    answerTransitionInProgress = false
                    replacementInProgress = false
                    feedbackTransitionDueAt = 0L
                    pendingOperation = null
                    answerJournal = null
                    failedOperation = null
                    phase = Phase.COMPLETED
                    completedSnapshot = snapshotLocked()
                }

                if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
                    restoreOperationAfterCommitFailure(
                        token,
                        inFlight,
                        "Unable to persist completed quiz",
                        FailedOperation.FINISH_SESSION
                    )
                    return@execute
                }

                Log.d(TAG, "NATIVE QUIZ COMPLETED")
                publishCompleted(completedSnapshot)
            } catch (error: Exception) {
                fail(
                    token,
                    "Unable to finish quiz session",
                    FailedOperation.FINISH_SESSION,
                    error
                )
            }
        }
    }

    private fun deliverAnswerAnalytics(
        token: Long,
        sessionId: String,
        userId: String,
        question: QuizQuestion
    ) {
        networkExecutor.execute {
            val inFlightJournal = synchronized(this) {
                val current = answerJournal
                if (
                    generation != token ||
                    !active ||
                    current == null ||
                    current.lifecycleId != token ||
                    current.delivery != AnalyticsDelivery.INTENDED
                ) {
                    return@execute
                }

                current.copy(delivery = AnalyticsDelivery.IN_FLIGHT).also {
                    answerJournal = it
                }
            }

            if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
                synchronized(this) {
                    if (
                        generation == token &&
                        answerJournal?.id == inFlightJournal.id &&
                        answerJournal?.lifecycleId == token
                    ) {
                        answerJournal = inFlightJournal.copy(
                            delivery = AnalyticsDelivery.UNKNOWN
                        )
                    }
                }
                publishSnapshot(PersistenceDurability.CRITICAL)
                Log.e(TAG, "NATIVE QUIZ ANSWER ANALYTICS DELIVERY UNKNOWN")
                return@execute
            }

            val delivery = try {
                QuizApiClient.saveAnswer(
                    sessionId = sessionId,
                    userId = userId,
                    question = question,
                    selectedAnswer = inFlightJournal.selectedAnswer,
                    isCorrect = inFlightJournal.isCorrect,
                    responseTimeMs = inFlightJournal.responseTimeMs
                )
                Log.d(TAG, "NATIVE QUIZ ANSWER ANALYTICS SAVED")
                AnalyticsDelivery.DELIVERED
            } catch (error: Exception) {
                Log.e(TAG, "NATIVE QUIZ ANSWER ANALYTICS FAILED - DELIVERY UNKNOWN", error)
                AnalyticsDelivery.UNKNOWN
            }

            synchronized(this) {
                if (
                    generation == token &&
                    answerJournal?.id == inFlightJournal.id &&
                    answerJournal?.lifecycleId == token
                ) {
                    answerJournal = inFlightJournal.copy(delivery = delivery)
                } else {
                    return@execute
                }
            }

            if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
                Log.e(TAG, "NATIVE QUIZ ANSWER ANALYTICS RESULT NOT DURABLE")
            }
        }
    }

    private fun createOperationLocked(
        type: BackendOperation,
        previous: PendingOperation? = null,
        questionIndex: Int = -1,
        sourceQuestionId: String = "",
        category: String = ""
    ): PendingOperation {
        val reusable = previous?.takeIf { it.type == type }
        return PendingOperation(
            id = reusable?.id ?: nextOperationIdLocked(type.name),
            lifecycleId = generation,
            type = type,
            stage = OperationStage.INTENDED,
            attempt = (reusable?.attempt ?: 0) + 1,
            startedAt = System.currentTimeMillis(),
            questionIndex = if (questionIndex >= 0) {
                questionIndex
            } else {
                reusable?.questionIndex ?: -1
            },
            sourceQuestionId = sourceQuestionId.ifBlank {
                reusable?.sourceQuestionId.orEmpty()
            },
            category = category.ifBlank {
                reusable?.category.orEmpty()
            }
        ).also {
            pendingOperation = it
        }
    }

    private fun nextOperationIdLocked(prefix: String): String {
        operationSequence++
        return "$generation-$operationSequence-$prefix"
    }

    private fun markOperationInFlight(
        token: Long,
        operation: PendingOperation
    ): PendingOperation? {
        val inFlight = synchronized(this) {
            if (!matchesOperationLocked(token, operation)) {
                return null
            }

            operation.copy(
                stage = OperationStage.IN_FLIGHT,
                startedAt = System.currentTimeMillis()
            ).also {
                pendingOperation = it
            }
        }

        if (!publishSnapshot(PersistenceDurability.CRITICAL)) {
            blockForPersistenceFailure(
                token,
                "Unable to persist ${operation.type.name} in-flight state",
                operation.type.toFailedOperation()
            )
            return null
        }

        return inFlight
    }

    private fun matchesOperationLocked(
        token: Long,
        operation: PendingOperation
    ): Boolean {
        return generation == token &&
            operation.lifecycleId == token &&
            active &&
            quizRequired &&
            pendingOperation?.id == operation.id &&
            pendingOperation?.lifecycleId == token &&
            pendingOperation?.type == operation.type
    }

    private fun restoreOperationAfterCommitFailure(
        token: Long,
        operation: PendingOperation,
        message: String,
        failed: FailedOperation
    ) {
        synchronized(this) {
            if (generation != token || !active) {
                return
            }

            completed = false
            phase = Phase.ERROR
            isPaused = true
            countdownRunning = false
            answerTransitionInProgress = false
            replacementInProgress = false
            feedbackTransitionDueAt = 0L
            pendingOperation = operation
            if (operation.attempt >= MAX_OPERATION_ATTEMPTS) {
                failedOperation = FailedOperation.RECOVERY_BLOCKED
                errorMessage = "$message; recovery retry limit reached"
            } else {
                failedOperation = failed
                errorMessage = message
            }
        }

        mainHandler.removeCallbacks(countdownRunnable)
        publishSnapshot(PersistenceDurability.CRITICAL)
        Log.e(TAG, "$message - operation outcome remains ambiguous")
    }

    private fun blockForPersistenceFailure(
        token: Long,
        message: String,
        failed: FailedOperation
    ) {
        synchronized(this) {
            if (generation != token || !quizRequired) {
                return
            }

            completed = false
            active = true
            phase = Phase.ERROR
            isPaused = true
            countdownRunning = false
            answerTransitionInProgress = false
            replacementInProgress = false
            feedbackTransitionDueAt = 0L
            failedOperation = failed
            errorMessage = message
        }

        mainHandler.removeCallbacks(countdownRunnable)
        publishSnapshot(PersistenceDurability.CRITICAL)
        Log.e(TAG, "$message - quiz obligation preserved")
    }

    private fun BackendOperation.toFailedOperation(): FailedOperation {
        return when (this) {
            BackendOperation.START_SESSION -> FailedOperation.START_SESSION
            BackendOperation.LOAD_QUESTIONS -> FailedOperation.LOAD_QUESTIONS
            BackendOperation.REPLACEMENT -> FailedOperation.REPLACEMENT
            BackendOperation.FINISH_SESSION -> FailedOperation.FINISH_SESSION
        }
    }

    private fun FailedOperation.toBackendOperation(): BackendOperation? {
        return when (this) {
            FailedOperation.START_SESSION -> BackendOperation.START_SESSION
            FailedOperation.LOAD_QUESTIONS -> BackendOperation.LOAD_QUESTIONS
            FailedOperation.REPLACEMENT -> BackendOperation.REPLACEMENT
            FailedOperation.FINISH_SESSION -> BackendOperation.FINISH_SESSION
            FailedOperation.RECOVERY_BLOCKED -> null
        }
    }

    private fun fail(
        token: Long,
        message: String,
        operation: FailedOperation,
        error: Exception
    ) {
        synchronized(this) {
            if (generation != token || !active) {
                return
            }

            isPaused = true
            answerTransitionInProgress = false
            replacementInProgress = false
            countdownRunning = false
            feedbackTransitionDueAt = 0L
            phase = Phase.ERROR
            if ((pendingOperation?.attempt ?: 0) >= MAX_OPERATION_ATTEMPTS) {
                errorMessage = "$message; recovery retry limit reached"
                failedOperation = FailedOperation.RECOVERY_BLOCKED
            } else {
                errorMessage = message
                failedOperation = operation
            }
        }

        mainHandler.removeCallbacks(countdownRunnable)
        Log.e(TAG, message, error)
        publishSnapshot()
    }

    @Synchronized
    private fun getSessionId(): String {
        return sessionId
    }

    private fun publishSnapshot(
        durability: PersistenceDurability = PersistenceDurability.CRITICAL
    ): Boolean {
        val currentListener: Listener?
        val snapshot: Snapshot
        val persisted: Boolean

        synchronized(this) {
            snapshot = snapshotLocked()
            persisted = persistSnapshotLocked(snapshot, durability)
            currentListener = listener
        }

        val registeredListener = currentListener ?: return persisted

        mainHandler.post {
            val stillRegistered = synchronized(this) {
                listener === registeredListener
            }

            if (stillRegistered) {
                registeredListener.onQuizStateChanged(snapshot)
            }
        }

        return persisted
    }

    private fun publishCompleted(snapshot: Snapshot) {
        val currentListener = synchronized(this) {
            listener
        } ?: return

        mainHandler.post {
            val stillRegistered = synchronized(this) {
                listener === currentListener
            }

            if (stillRegistered) {
                currentListener.onQuizCompleted(snapshot)
            }
        }
    }

    private fun snapshotLocked(): Snapshot {
        return Snapshot(
            lifecycleId = generation,
            quizRequired = quizRequired,
            active = active,
            completed = completed,
            phase = phase,
            userName = userName,
            haloGreeting = haloGreeting,
            haloLighter = haloLighter,
            haloMessage = haloMessage,
            sessionId = sessionId,
            questions = questions.toList(),
            currentQuestion = currentQuestion,
            quizSeconds = quizSeconds,
            questionStartTime = questionStartTime,
            isPaused = isPaused,
            answerTransitionInProgress = answerTransitionInProgress,
            replacementInProgress = replacementInProgress,
            feedback = feedback,
            errorMessage = errorMessage,
            canRetry = failedOperation != null &&
                failedOperation != FailedOperation.RECOVERY_BLOCKED
        )
    }

    private fun ensureHaloContentLocked() {
        if (haloGreeting.isBlank()) {
            haloGreeting = GREETINGS.random()
        }
        if (haloLighter.isBlank()) {
            haloLighter = LIGHTER.random()
        }
        if (haloMessage.isBlank()) {
            haloMessage = PERSUASIONS.random()
        }
    }

    private fun persistSnapshotLocked(
        snapshot: Snapshot,
        durability: PersistenceDurability
    ): Boolean {
        val currentPersistence = persistence ?: return true

        if (
            !snapshot.quizRequired &&
            !snapshot.active &&
            snapshot.phase == Phase.IDLE
        ) {
            return removeSnapshotLocked(durability)
        }

        val json = JSONObject().apply {
            put("version", SNAPSHOT_VERSION)
            put("savedAt", System.currentTimeMillis())
            put("lifecycleId", generation)
            put("quizRequired", quizRequired)
            put("active", active)
            put("completed", completed)
            put("phase", phase.name)
            put("userId", userId)
            put("userName", userName)
            put("haloGreeting", haloGreeting)
            put("haloLighter", haloLighter)
            put("haloMessage", haloMessage)
            put("sessionId", sessionId)
            put(
                "questions",
                JSONArray().apply {
                    questions.forEach { put(questionToJson(it)) }
                }
            )
            put("currentQuestion", currentQuestion)
            put("quizSeconds", quizSeconds)
            put("questionStartTime", questionStartTime)
            put("isPaused", isPaused)
            put("answerTransitionInProgress", answerTransitionInProgress)
            put("replacementInProgress", replacementInProgress)
            put("countdownRunning", countdownRunning)
            put("feedbackTransitionDueAt", feedbackTransitionDueAt)
            put("feedback", feedback?.let(::feedbackToJson) ?: JSONObject.NULL)
            put("errorMessage", errorMessage ?: JSONObject.NULL)
            put("failedOperation", failedOperation?.name ?: JSONObject.NULL)
            put("pendingOperation", pendingOperation?.let(::pendingOperationToJson) ?: JSONObject.NULL)
            put("answerJournal", answerJournal?.let(::answerJournalToJson) ?: JSONObject.NULL)
            put("operationSequence", operationSequence)
        }

        val editor = currentPersistence.edit().putString(SNAPSHOT_KEY, json.toString())
        val success = when (durability) {
            PersistenceDurability.ASYNC -> {
                editor.apply()
                true
            }
            PersistenceDurability.CRITICAL -> editor.commit()
        }

        if (!success) {
            Log.e(TAG, "QUIZ SNAPSHOT COMMIT FAILED")
        }

        return success
    }

    private fun removeSnapshotLocked(
        durability: PersistenceDurability
    ): Boolean {
        val currentPersistence = persistence ?: return true
        if (!currentPersistence.contains(SNAPSHOT_KEY)) {
            return true
        }

        val editor = currentPersistence.edit().remove(SNAPSHOT_KEY)
        val success = when (durability) {
            PersistenceDurability.ASYNC -> {
                editor.apply()
                true
            }
            PersistenceDurability.CRITICAL -> editor.commit()
        }

        if (success) {
            Log.d(TAG, "QUIZ SNAPSHOT CLEARED")
        } else {
            Log.e(TAG, "QUIZ SNAPSHOT CLEAR FAILED")
        }

        return success
    }

    private fun restoreSnapshotLocked(): Boolean {
        val currentPersistence = persistence ?: return false
        val rawSnapshot = currentPersistence.getString(SNAPSHOT_KEY, null) ?: return false

        return try {
            val json = JSONObject(rawSnapshot)
            val version = json.optInt("version", -1)
            if (version != LEGACY_SNAPSHOT_VERSION && version != SNAPSHOT_VERSION) {
                throw IllegalStateException("Unsupported quiz snapshot version")
            }

            requireJsonBoolean(json, "quizRequired")
            requireJsonBoolean(json, "active")
            val restoredPhase = json.optString("phase", "").takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("Quiz snapshot phase is missing")

            generation = json.optLong("lifecycleId", generation).coerceAtLeast(1L)
            quizRequired = json.optBoolean("quizRequired", false)
            active = json.optBoolean("active", false)
            completed = json.optBoolean("completed", false)
            phase = Phase.valueOf(restoredPhase)
            userId = json.optString("userId", "")
            userName = json.optString("userName", "")
            haloGreeting = json.optString("haloGreeting", "")
            haloLighter = json.optString("haloLighter", "")
            haloMessage = json.optString("haloMessage", "")
            sessionId = json.optString("sessionId", "")
            questions = json.optJSONArray("questions").toQuestionList()
            currentQuestion = json.optInt("currentQuestion", 0).coerceAtLeast(0)
            quizSeconds = json.optInt("quizSeconds", INITIAL_QUIZ_SECONDS)
                .coerceAtLeast(0)
            questionStartTime = json.optLong("questionStartTime", 0L)
            isPaused = json.optBoolean("isPaused", false)
            answerTransitionInProgress =
                json.optBoolean("answerTransitionInProgress", false)
            replacementInProgress = json.optBoolean("replacementInProgress", false)
            countdownRunning = json.optBoolean("countdownRunning", false)
            feedbackTransitionDueAt = json.optLong("feedbackTransitionDueAt", 0L)
            feedback = json.optJSONObject("feedback")?.toFeedback()
            errorMessage = json.nullableString("errorMessage")
            failedOperation = json.nullableString("failedOperation")?.let { operation ->
                runCatching { FailedOperation.valueOf(operation) }.getOrNull()
            }
            pendingOperation = if (version >= SNAPSHOT_VERSION) {
                json.optJSONObject("pendingOperation")?.toPendingOperation()
            } else {
                null
            }
            answerJournal = if (version >= SNAPSHOT_VERSION) {
                json.optJSONObject("answerJournal")?.toAnswerJournal()
            } else {
                null
            }
            operationSequence = if (version >= SNAPSHOT_VERSION) {
                json.optLong("operationSequence", 0L).coerceAtLeast(0L)
            } else {
                0L
            }
            if (pendingOperation != null && pendingOperation?.lifecycleId != generation) {
                throw IllegalStateException("Pending operation lifecycle does not match snapshot")
            }
            if (answerJournal != null && answerJournal?.lifecycleId != generation) {
                throw IllegalStateException("Answer journal lifecycle does not match snapshot")
            }
            if (completed != (phase == Phase.COMPLETED)) {
                throw IllegalStateException("Quiz snapshot completion state is inconsistent")
            }
            validateAnswerRecoveryStateLocked()
            completionCleanupClaimed = false

            if (!quizRequired && !active) {
                removeSnapshotLocked(PersistenceDurability.CRITICAL)
                return false
            }

            if (
                phase in setOf(
                    Phase.HALO,
                    Phase.QUESTION,
                    Phase.FEEDBACK,
                    Phase.FINISHING,
                    Phase.COMPLETED
                ) &&
                sessionId.isBlank()
            ) {
                throw IllegalStateException("Active quiz snapshot has no backend session")
            }

            if (active && !quizRequired) {
                quizRequired = true
            }

            if (quizRequired && !active) {
                active = true
                completed = false
                phase = Phase.ERROR
                failedOperation = FailedOperation.START_SESSION
                errorMessage = "Unable to start quiz session"
                pendingOperation = recoveryOperationLocked(
                    BackendOperation.START_SESSION
                )
            }

            if (
                answerJournal?.delivery == AnalyticsDelivery.INTENDED ||
                answerJournal?.delivery == AnalyticsDelivery.IN_FLIGHT
            ) {
                answerJournal = answerJournal?.copy(
                    delivery = AnalyticsDelivery.UNKNOWN
                )
                Log.d(TAG, "RESTORED ANSWER ANALYTICS DELIVERY UNKNOWN")
            }

            when (phase) {
                Phase.IDLE -> {
                    phase = Phase.ERROR
                    val backendOperation = if (sessionId.isBlank()) {
                        BackendOperation.START_SESSION
                    } else {
                        BackendOperation.LOAD_QUESTIONS
                    }
                    pendingOperation = pendingOperation
                        ?: recoveryOperationLocked(backendOperation)
                    failedOperation = backendOperation.toFailedOperation()
                    errorMessage = recoveryErrorMessage(backendOperation)
                }

                Phase.INITIALIZING -> {
                    phase = Phase.ERROR
                    val backendOperation = if (sessionId.isBlank()) {
                        BackendOperation.START_SESSION
                    } else {
                        BackendOperation.LOAD_QUESTIONS
                    }
                    pendingOperation = pendingOperation
                        ?.takeIf { it.type == backendOperation }
                        ?: recoveryOperationLocked(backendOperation)
                    failedOperation = backendOperation.toFailedOperation()
                    errorMessage = recoveryErrorMessage(backendOperation)
                }

                Phase.HALO -> {
                    if (questions.isEmpty()) {
                        phase = Phase.ERROR
                        failedOperation = FailedOperation.LOAD_QUESTIONS
                        errorMessage = "Unable to load quiz questions"
                    } else {
                        ensureHaloContentLocked()
                    }
                }

                Phase.QUESTION -> {
                    if (questions.getOrNull(currentQuestion) == null) {
                        phase = Phase.ERROR
                        failedOperation = FailedOperation.LOAD_QUESTIONS
                        errorMessage = "Unable to load quiz questions"
                    } else if (replacementInProgress) {
                        phase = Phase.ERROR
                        isPaused = true
                        answerTransitionInProgress = true
                        countdownRunning = false
                        failedOperation = FailedOperation.REPLACEMENT
                        errorMessage = "Unable to load replacement question"
                        val source = questions.getOrNull(currentQuestion)
                        pendingOperation = pendingOperation
                            ?.takeIf { it.type == BackendOperation.REPLACEMENT }
                            ?: recoveryOperationLocked(
                                type = BackendOperation.REPLACEMENT,
                                questionIndex = currentQuestion,
                                sourceQuestionId = source?.id.orEmpty(),
                                category = source?.category.orEmpty()
                            )
                    } else if (answerTransitionInProgress && feedback != null) {
                        phase = Phase.FEEDBACK
                        isPaused = true
                    }
                }

                Phase.FEEDBACK -> {
                    if (feedback == null) {
                        throw IllegalStateException("Feedback snapshot is missing answer state")
                    } else {
                        isPaused = true
                        answerTransitionInProgress = true
                        countdownRunning = quizSeconds > 0
                        if (feedbackTransitionDueAt <= 0L) {
                            feedbackTransitionDueAt =
                                System.currentTimeMillis() + FEEDBACK_DELAY_MS
                        }
                    }
                }

                Phase.FINISHING -> {
                    phase = Phase.ERROR
                    isPaused = true
                    countdownRunning = false
                    failedOperation = FailedOperation.FINISH_SESSION
                    errorMessage = "Unable to finish quiz session"
                    pendingOperation = pendingOperation
                        ?.takeIf { it.type == BackendOperation.FINISH_SESSION }
                        ?: recoveryOperationLocked(BackendOperation.FINISH_SESSION)
                }

                Phase.COMPLETED -> {
                    active = true
                    completed = true
                    quizRequired = true
                    isPaused = true
                    countdownRunning = false
                    pendingOperation = null
                    answerJournal = null
                }

                Phase.ERROR -> {
                    isPaused = true
                    countdownRunning = false
                    if (failedOperation == null) {
                        failedOperation = pendingOperation?.type?.toFailedOperation()
                            ?: when {
                                sessionId.isBlank() -> FailedOperation.START_SESSION
                                questions.isEmpty() -> FailedOperation.LOAD_QUESTIONS
                                currentQuestion >= questions.size -> FailedOperation.FINISH_SESSION
                                else -> FailedOperation.REPLACEMENT
                            }
                    }

                    if (pendingOperation == null && failedOperation != FailedOperation.RECOVERY_BLOCKED) {
                        failedOperation?.toBackendOperation()?.let { backendOperation ->
                            val source = questions.getOrNull(currentQuestion)
                            pendingOperation = recoveryOperationLocked(
                                type = backendOperation,
                                questionIndex = if (backendOperation == BackendOperation.REPLACEMENT) {
                                    currentQuestion
                                } else {
                                    -1
                                },
                                sourceQuestionId = source?.id.orEmpty(),
                                category = source?.category.orEmpty()
                            )
                        }
                    }
                }
            }

            pendingOperation?.let { pending ->
                if (phase != Phase.ERROR && phase != Phase.COMPLETED) {
                    phase = Phase.ERROR
                    isPaused = true
                    countdownRunning = false
                    failedOperation = pending.type.toFailedOperation()
                    errorMessage = recoveryErrorMessage(pending.type)
                }

                if (
                    phase == Phase.ERROR &&
                    pending.attempt >= MAX_OPERATION_ATTEMPTS
                ) {
                    failedOperation = FailedOperation.RECOVERY_BLOCKED
                    errorMessage = "Quiz recovery retry limit reached; obligation preserved"
                }
            }

            if (
                phase == Phase.QUESTION &&
                countdownRunning &&
                !isPaused &&
                quizSeconds > 0
            ) {
                val savedAt = json.optLong("savedAt", System.currentTimeMillis())
                val elapsedSeconds =
                    ((System.currentTimeMillis() - savedAt).coerceAtLeast(0L) / 1_000L)
                        .toInt()
                quizSeconds = (quizSeconds - elapsedSeconds).coerceAtLeast(0)
                countdownRunning = quizSeconds > 0
            } else if (phase != Phase.FEEDBACK) {
                countdownRunning = false
            }

            if (version == LEGACY_SNAPSHOT_VERSION) {
                Log.d(TAG, "QUIZ SNAPSHOT MIGRATED V1 TO V2")
            }

            true
        } catch (error: Exception) {
            Log.e(TAG, "QUIZ SNAPSHOT RESTORE FAILED", error)
            restoreCorruptSnapshotFailClosedLocked(error)
            true
        }
    }

    private fun questionToJson(question: QuizQuestion): JSONObject {
        return JSONObject().apply {
            put("id", question.id)
            put("question", question.question)
            put("category", question.category)
            put("optionA", question.optionA)
            put("optionB", question.optionB)
            put("optionC", question.optionC)
            put("optionD", question.optionD)
            put("answer", question.answer)
            put("questionImage", question.questionImage ?: JSONObject.NULL)
            put("imageA", question.imageA ?: JSONObject.NULL)
            put("imageB", question.imageB ?: JSONObject.NULL)
            put("imageC", question.imageC ?: JSONObject.NULL)
            put("imageD", question.imageD ?: JSONObject.NULL)
            put("targetWord", question.targetWord ?: JSONObject.NULL)
            put("inkColor", question.inkColor ?: JSONObject.NULL)
        }
    }

    private fun pendingOperationToJson(value: PendingOperation): JSONObject {
        return JSONObject().apply {
            put("id", value.id)
            put("lifecycleId", value.lifecycleId)
            put("type", value.type.name)
            put("stage", value.stage.name)
            put("attempt", value.attempt)
            put("startedAt", value.startedAt)
            put("questionIndex", value.questionIndex)
            put("sourceQuestionId", value.sourceQuestionId)
            put("category", value.category)
        }
    }

    private fun JSONObject.toPendingOperation(): PendingOperation {
        val restoredId = optString("id", "")
        val restoredType = optString("type", "")
        val restoredStage = optString("stage", "")
        if (restoredId.isBlank() || restoredType.isBlank() || restoredStage.isBlank()) {
            throw IllegalStateException("Pending quiz operation is malformed")
        }

        val lifecycleId = optLong("lifecycleId", -1L)
        if (lifecycleId <= 0L) {
            throw IllegalStateException("Pending quiz operation lifecycle is malformed")
        }

        val type = BackendOperation.valueOf(restoredType)
        val questionIndex = optInt("questionIndex", -1)
        val sourceQuestionId = optString("sourceQuestionId", "")
        val category = optString("category", "")
        if (
            type == BackendOperation.REPLACEMENT &&
            (questionIndex < 0 || sourceQuestionId.isBlank() || category.isBlank())
        ) {
            throw IllegalStateException("Replacement operation metadata is malformed")
        }

        return PendingOperation(
            id = restoredId,
            lifecycleId = lifecycleId,
            type = type,
            stage = OperationStage.valueOf(restoredStage),
            attempt = optInt("attempt", 1).coerceAtLeast(1),
            startedAt = optLong("startedAt", 0L),
            questionIndex = questionIndex,
            sourceQuestionId = sourceQuestionId,
            category = category
        )
    }

    private fun answerJournalToJson(value: AnswerJournal): JSONObject {
        return JSONObject().apply {
            put("id", value.id)
            put("lifecycleId", value.lifecycleId)
            put("questionIndex", value.questionIndex)
            put("questionId", value.questionId)
            put("category", value.category)
            put("selectedAnswer", value.selectedAnswer)
            put("correctAnswer", value.correctAnswer)
            put("isCorrect", value.isCorrect)
            put("isReplacement", value.isReplacement)
            put("responseTimeMs", value.responseTimeMs)
            put("delivery", value.delivery.name)
            put("attempt", value.attempt)
        }
    }

    private fun JSONObject.toAnswerJournal(): AnswerJournal {
        val restoredId = optString("id", "")
        val restoredQuestionId = optString("questionId", "")
        val restoredSelected = optString("selectedAnswer", "")
        val restoredCorrect = optString("correctAnswer", "")
        val restoredDelivery = optString("delivery", "")
        if (
            restoredId.isBlank() ||
            restoredQuestionId.isBlank() ||
            optString("category", "").isBlank() ||
            restoredSelected.isBlank() ||
            restoredCorrect.isBlank() ||
            restoredDelivery.isBlank()
        ) {
            throw IllegalStateException("Answer journal is malformed")
        }

        val lifecycleId = optLong("lifecycleId", -1L)
        if (lifecycleId <= 0L) {
            throw IllegalStateException("Answer journal lifecycle is malformed")
        }

        return AnswerJournal(
            id = restoredId,
            lifecycleId = lifecycleId,
            questionIndex = optInt("questionIndex", -1),
            questionId = restoredQuestionId,
            category = optString("category", ""),
            selectedAnswer = restoredSelected,
            correctAnswer = restoredCorrect,
            isCorrect = requireJsonBoolean(this, "isCorrect"),
            isReplacement = requireJsonBoolean(this, "isReplacement"),
            responseTimeMs = optLong("responseTimeMs", 0L).coerceAtLeast(0L),
            delivery = AnalyticsDelivery.valueOf(restoredDelivery),
            attempt = optInt("attempt", 1).coerceAtLeast(1)
        )
    }

    private fun recoveryOperationLocked(
        type: BackendOperation,
        questionIndex: Int = -1,
        sourceQuestionId: String = "",
        category: String = ""
    ): PendingOperation {
        return PendingOperation(
            id = nextOperationIdLocked("RECOVERED-${type.name}"),
            lifecycleId = generation,
            type = type,
            stage = OperationStage.IN_FLIGHT,
            attempt = 1,
            startedAt = System.currentTimeMillis(),
            questionIndex = questionIndex,
            sourceQuestionId = sourceQuestionId,
            category = category
        )
    }

    private fun recoveryErrorMessage(operation: BackendOperation): String {
        return when (operation) {
            BackendOperation.START_SESSION -> "Quiz session start outcome is uncertain"
            BackendOperation.LOAD_QUESTIONS -> "Unable to restore quiz questions"
            BackendOperation.REPLACEMENT -> "Replacement question outcome is uncertain"
            BackendOperation.FINISH_SESSION -> "Quiz completion outcome is uncertain"
        }
    }

    private fun validateAnswerRecoveryStateLocked() {
        val labels = listOf("A", "B", "C", "D")
        val restoredFeedback = feedback
        if (restoredFeedback != null) {
            val question = questions.getOrNull(currentQuestion)
                ?: throw IllegalStateException("Feedback question is missing")
            val expectedCorrectIndex = labels.indexOf(question.answer)
            if (
                restoredFeedback.selectedIndex !in labels.indices ||
                restoredFeedback.correctIndex != expectedCorrectIndex ||
                labels[restoredFeedback.selectedIndex] != restoredFeedback.selectedAnswer ||
                restoredFeedback.correctAnswer != question.answer ||
                restoredFeedback.isCorrect !=
                    (restoredFeedback.selectedAnswer == question.answer)
            ) {
                throw IllegalStateException("Feedback snapshot does not match its question")
            }
        }

        val journal = answerJournal ?: return
        val question = questions.getOrNull(journal.questionIndex)
            ?: throw IllegalStateException("Answer journal question is missing")
        if (
            journal.questionIndex != currentQuestion ||
            journal.questionId != question.id ||
            journal.category != question.category ||
            journal.selectedAnswer !in labels ||
            journal.correctAnswer != question.answer ||
            journal.isCorrect != (journal.selectedAnswer == question.answer) ||
            journal.isReplacement == journal.isCorrect
        ) {
            throw IllegalStateException("Answer journal does not match its question")
        }

        if (
            restoredFeedback != null &&
            (
                restoredFeedback.selectedAnswer != journal.selectedAnswer ||
                    restoredFeedback.correctAnswer != journal.correctAnswer ||
                    restoredFeedback.isCorrect != journal.isCorrect
                )
        ) {
            throw IllegalStateException("Feedback snapshot does not match answer journal")
        }
    }

    private fun restoreCorruptSnapshotFailClosedLocked(error: Exception) {
        generation = max(generation + 1L, System.currentTimeMillis())
        quizRequired = true
        active = true
        completed = false
        phase = Phase.ERROR
        userId = ""
        userName = ""
        haloGreeting = ""
        haloLighter = ""
        haloMessage = ""
        sessionId = ""
        questions = emptyList()
        currentQuestion = 0
        quizSeconds = INITIAL_QUIZ_SECONDS
        questionStartTime = 0L
        isPaused = true
        answerTransitionInProgress = false
        replacementInProgress = false
        feedback = null
        errorMessage = "Stored quiz state is damaged; blocking obligation preserved"
        failedOperation = FailedOperation.RECOVERY_BLOCKED
        pendingOperation = null
        answerJournal = null
        completionCleanupClaimed = false
        countdownRunning = false
        feedbackTransitionDueAt = 0L
        operationSequence = 0L

        val persisted = persistSnapshotLocked(
            snapshotLocked(),
            PersistenceDurability.CRITICAL
        )
        if (!persisted) {
            Log.e(TAG, "CORRUPT QUIZ FAIL-CLOSED STATE COULD NOT BE PERSISTED", error)
        } else {
            Log.e(TAG, "CORRUPT QUIZ SNAPSHOT REPLACED WITH FAIL-CLOSED STATE")
        }
    }

    private fun requireJsonBoolean(json: JSONObject, key: String): Boolean {
        if (!json.has(key) || json.isNull(key) || json.opt(key) !is Boolean) {
            throw IllegalStateException("Quiz snapshot $key is malformed")
        }
        return json.getBoolean(key)
    }

    private fun feedbackToJson(value: Feedback): JSONObject {
        return JSONObject().apply {
            put("selectedIndex", value.selectedIndex)
            put("correctIndex", value.correctIndex)
            put("selectedAnswer", value.selectedAnswer)
            put("correctAnswer", value.correctAnswer)
            put("isCorrect", value.isCorrect)
            put("title", value.title)
        }
    }

    private fun JSONArray?.toQuestionList(): List<QuizQuestion> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val json = optJSONObject(index)
                    ?: throw IllegalStateException("Quiz snapshot question is malformed")
                val question = QuizQuestion.fromJson(json)
                if (
                    question.id.isBlank() ||
                    question.category.isBlank() ||
                    question.answer !in listOf("A", "B", "C", "D")
                ) {
                    throw IllegalStateException("Quiz snapshot question identity is malformed")
                }
                add(question)
            }
        }
    }

    private fun JSONObject.toFeedback(): Feedback {
        return Feedback(
            selectedIndex = optInt("selectedIndex", -1),
            correctIndex = optInt("correctIndex", -1),
            selectedAnswer = optString("selectedAnswer", ""),
            correctAnswer = optString("correctAnswer", ""),
            isCorrect = requireJsonBoolean(this, "isCorrect"),
            title = optString("title", "")
        )
    }

    private fun JSONObject.nullableString(key: String): String? {
        if (isNull(key)) {
            return null
        }
        return optString(key).takeIf { it.isNotBlank() }
    }
}
