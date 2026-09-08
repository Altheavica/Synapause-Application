package com.synapause

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicLong

internal class OverlayManager(
    private val context: Context,
    private val onContinue: () -> Unit,
    private val onAnswer: (Int) -> Unit,
    private val onRetry: () -> Unit
) {
    companion object {
        private const val TAG = "SynapauseMonitor"
        private const val IMAGE_CONNECT_TIMEOUT_MS = 8_000
        private const val IMAGE_READ_TIMEOUT_MS = 10_000
    }

    internal enum class RenderResult {
        NO_SURFACE_REQUIRED,
        ATTACHED,
        ALREADY_ATTACHED,
        PERMISSION_MISSING,
        ATTACH_FAILED,
        DETACH_FAILED,
        DESTROYED;

        val hasUsableSurface: Boolean
            get() = this == ATTACHED || this == ALREADY_ATTACHED
    }

    private enum class Surface {
        HALO,
        QUIZ
    }

    private enum class ImageStatus {
        LOADING,
        LOADED,
        FAILED
    }

    private data class ImageRequest(
        val id: Long,
        val url: String,
        val surfaceGeneration: Long,
        val renderIdentity: String,
        val status: ImageStatus
    )

    private val windowManager =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private val imageExecutor: ExecutorService = Executors.newFixedThreadPool(3)
    private val imageRequestIds = AtomicLong(0L)
    private val imageRequests = ConcurrentHashMap<ImageView, ImageRequest>()
    private val imageConnections = ConcurrentHashMap<Long, HttpURLConnection>()
    private var overlayView: View? = null
    private var surface: Surface? = null
    private var renderedQuestionKey: String? = null
    private var answerViews: List<View> = emptyList()
    private var lastQuizSeconds = -1
    @Volatile
    private var surfaceGeneration = 0L
    @Volatile
    private var currentRenderIdentity = ""
    @Volatile
    private var destroyed = false

    fun render(snapshot: QuizSession.Snapshot): RenderResult {
        if (destroyed) {
            return RenderResult.DESTROYED
        }

        return when (snapshot.phase) {
            QuizSession.Phase.IDLE -> {
                if (hide()) {
                    RenderResult.NO_SURFACE_REQUIRED
                } else {
                    RenderResult.DETACH_FAILED
                }
            }

            QuizSession.Phase.INITIALIZING -> RenderResult.NO_SURFACE_REQUIRED

            QuizSession.Phase.HALO -> renderHalo(snapshot)

            QuizSession.Phase.QUESTION,
            QuizSession.Phase.FEEDBACK,
            QuizSession.Phase.FINISHING,
            QuizSession.Phase.COMPLETED -> renderQuiz(snapshot)

            QuizSession.Phase.ERROR -> {
                Log.e(
                    TAG,
                    "NATIVE QUIZ UI ERROR: ${snapshot.errorMessage.orEmpty()}"
                )
                renderError(snapshot)
            }
        }
    }

    fun hide(): Boolean {
        val view = overlayView

        if (view != null) {
            if (!detachView(view)) {
                return false
            }
        }

        clearSurfaceState()
        return true
    }

    fun destroy(): Boolean {
        val detached = hide()
        destroyed = true
        cancelImageRequests()
        imageExecutor.shutdownNow()
        return detached
    }

    private fun clearSurfaceState() {
        cancelImageRequests()
        surfaceGeneration++
        overlayView = null
        surface = null
        renderedQuestionKey = null
        currentRenderIdentity = ""
        answerViews = emptyList()
        lastQuizSeconds = -1
    }

    private fun renderHalo(snapshot: QuizSession.Snapshot): RenderResult {
        val attachResult = ensureSurface(R.layout.overlay_halo, Surface.HALO)
        if (!attachResult.hasUsableSurface) {
            return attachResult
        }

        val root = overlayView ?: return RenderResult.ATTACH_FAILED
        currentRenderIdentity = "${snapshot.lifecycleId}:HALO"
        val displayName = snapshot.userName.ifBlank { "Teman" }
        val greeting = snapshot.haloGreeting.ifBlank { "HALOW" }

        root.findViewById<TextView>(R.id.haloTitle).text =
            "$greeting, $displayName!"
        root.findViewById<TextView>(R.id.haloLighter).text = snapshot.haloLighter
        root.findViewById<TextView>(R.id.haloAuthor).text = ""
        root.findViewById<TextView>(R.id.haloMessage).text = snapshot.haloMessage
        root.findViewById<Button>(R.id.continueButton).apply {
            text = "Lanjut ke Quiz"
            setOnClickListener {
                onContinue()
            }
        }

        lastQuizSeconds = -1
        return attachResult
    }

    private fun renderQuiz(snapshot: QuizSession.Snapshot): RenderResult {
        val attachResult = ensureSurface(R.layout.overlay_quiz, Surface.QUIZ)
        if (!attachResult.hasUsableSurface) {
            return attachResult
        }

        val root = overlayView ?: return RenderResult.ATTACH_FAILED
        val timer = root.findViewById<TextView>(R.id.quizTimer)
        timer.text = "00:${snapshot.quizSeconds.toString().padStart(2, '0')}"

        if (lastQuizSeconds > 0 && snapshot.quizSeconds == 0) {
            Toast.makeText(
                context,
                "Time's Up!",
                Toast.LENGTH_SHORT
            ).show()
        }
        lastQuizSeconds = snapshot.quizSeconds

        when (snapshot.phase) {
            QuizSession.Phase.FINISHING -> {
                currentRenderIdentity = "${snapshot.lifecycleId}:FINISHING"
                renderTerminal(root, "Menyelesaikan sesi...")
                return attachResult
            }

            QuizSession.Phase.COMPLETED -> {
                currentRenderIdentity = "${snapshot.lifecycleId}:COMPLETED"
                renderTerminal(root, "Quiz selesai.")
                return attachResult
            }

            else -> Unit
        }

        val question = snapshot.question ?: return attachResult
        root.findViewById<TextView>(R.id.questionCount).text =
            "Question ${snapshot.currentQuestion + 1} / ${snapshot.questions.size}"
        root.findViewById<TextView>(R.id.questionText).text = question.question

        val questionKey = "${snapshot.currentQuestion}:${question.id}:${question.hashCode()}"
        val questionChanged = renderedQuestionKey != questionKey
        if (questionChanged) {
            cancelImageRequests()
        }
        currentRenderIdentity = "${snapshot.lifecycleId}:QUESTION:$questionKey"

        renderStroop(root, question)
        renderQuestionImage(root, question, currentRenderIdentity)

        if (questionChanged) {
            renderAnswers(root, question, currentRenderIdentity)
            renderedQuestionKey = questionKey
        }

        renderAnswerState(snapshot)

        val feedbackTitle = root.findViewById<TextView>(R.id.feedbackTitle)
        val currentFeedback = snapshot.feedback
        if (currentFeedback == null) {
            feedbackTitle.visibility = View.GONE
            feedbackTitle.text = ""
        } else {
            feedbackTitle.visibility = View.VISIBLE
            feedbackTitle.text = currentFeedback.title
        }

        return attachResult
    }

    private fun renderTerminal(
        root: View,
        message: String
    ) {
        cancelImageRequests()
        root.findViewById<TextView>(R.id.questionCount).text = ""
        root.findViewById<TextView>(R.id.questionText).text = message
        root.findViewById<TextView>(R.id.stroopWord).visibility = View.GONE
        root.findViewById<ImageView>(R.id.questionImage).visibility = View.GONE
        root.findViewById<LinearLayout>(R.id.answersContainer).removeAllViews()
        root.findViewById<TextView>(R.id.feedbackTitle).visibility = View.GONE
        answerViews = emptyList()
        renderedQuestionKey = null
    }

    private fun renderError(snapshot: QuizSession.Snapshot): RenderResult {
        val attachResult = ensureSurface(R.layout.overlay_quiz, Surface.QUIZ)
        if (!attachResult.hasUsableSurface) {
            return attachResult
        }

        val root = overlayView ?: return RenderResult.ATTACH_FAILED
        currentRenderIdentity = "${snapshot.lifecycleId}:ERROR"
        cancelImageRequests()
        root.findViewById<TextView>(R.id.quizTimer).text = ""
        root.findViewById<TextView>(R.id.questionCount).text = "Quiz Error"
        root.findViewById<TextView>(R.id.questionText).text =
            snapshot.errorMessage ?: "Quiz gagal dimuat."
        root.findViewById<TextView>(R.id.stroopWord).visibility = View.GONE
        root.findViewById<ImageView>(R.id.questionImage).visibility = View.GONE
        root.findViewById<TextView>(R.id.feedbackTitle).visibility = View.GONE

        val answers = root.findViewById<LinearLayout>(R.id.answersContainer)
        answers.removeAllViews()
        answerViews = emptyList()
        renderedQuestionKey = null

        if (snapshot.canRetry) {
            val retryButton = Button(context).apply {
                text = "Coba lagi"
                isAllCaps = false
                setTextColor(Color.rgb(17, 24, 39))
                background = answerBackground(AnswerStyle.NORMAL)
                setOnClickListener {
                    isEnabled = false
                    onRetry()
                }
            }
            val layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            answers.addView(retryButton, layoutParams)
        }

        return attachResult
    }

    private fun renderStroop(
        root: View,
        question: QuizQuestion
    ) {
        val stroopWord = root.findViewById<TextView>(R.id.stroopWord)
        if (question.category != "Stroop") {
            stroopWord.visibility = View.GONE
            return
        }

        stroopWord.text = question.targetWord.orEmpty()
        stroopWord.setTextColor(
            when (question.inkColor) {
                "Merah" -> Color.RED
                "Hijau" -> Color.GREEN
                "Biru" -> Color.BLUE
                "Kuning" -> Color.rgb(255, 215, 0)
                "Hitam" -> Color.BLACK
                "Putih" -> Color.WHITE
                "Ungu" -> Color.rgb(128, 0, 128)
                "Jingga" -> Color.rgb(255, 165, 0)
                else -> Color.WHITE
            }
        )
        stroopWord.visibility = View.VISIBLE
    }

    private fun renderQuestionImage(
        root: View,
        question: QuizQuestion,
        renderIdentity: String
    ) {
        val imageView = root.findViewById<ImageView>(R.id.questionImage)
        val imageUrl = question.questionImage

        if (imageUrl.isNullOrBlank()) {
            imageView.visibility = View.GONE
            imageView.setImageDrawable(null)
            imageView.tag = null
            return
        }

        imageView.visibility = View.VISIBLE
        loadQuestionImage(imageUrl, imageView, renderIdentity)
    }

    private fun renderAnswers(
        root: View,
        question: QuizQuestion,
        renderIdentity: String
    ) {
        val container = root.findViewById<LinearLayout>(R.id.answersContainer)
        container.removeAllViews()

        answerViews = if (question.category == "Visual") {
            createVisualAnswers(container, question, renderIdentity)
        } else {
            createTextAnswers(container, question)
        }
    }

    private fun createTextAnswers(
        container: LinearLayout,
        question: QuizQuestion
    ): List<View> {
        return question.options.mapIndexed { index, option ->
            val button = Button(context).apply {
                text = option
                isAllCaps = false
                textSize = 15f
                minHeight = dp(58)
                setTextColor(Color.rgb(17, 24, 39))
                stateListAnimator = null
                setPadding(dp(12), dp(12), dp(12), dp(12))
                setOnClickListener { onAnswer(index) }
                background = answerBackground(AnswerStyle.NORMAL)
            }

            val params = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(12)
            }
            container.addView(button, params)
            button
        }
    }

    private fun createVisualAnswers(
        container: LinearLayout,
        question: QuizQuestion,
        renderIdentity: String
    ): List<View> {
        val views = mutableListOf<View>()

        for (rowIndex in 0 until 2) {
            val row = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
            }
            val rowParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(12)
            }
            container.addView(row, rowParams)

            for (columnIndex in 0 until 2) {
                val answerIndex = rowIndex * 2 + columnIndex
                val imageButton = ImageButton(context).apply {
                    contentDescription = question.options[answerIndex]
                    scaleType = ImageView.ScaleType.CENTER_INSIDE
                    adjustViewBounds = true
                    setPadding(dp(10), dp(10), dp(10), dp(10))
                    setOnClickListener { onAnswer(answerIndex) }
                    background = answerBackground(AnswerStyle.NORMAL)
                }

                val params = LinearLayout.LayoutParams(
                    0,
                    dp(120),
                    1f
                ).apply {
                    leftMargin = if (columnIndex == 0) 0 else dp(6)
                    rightMargin = if (columnIndex == 0) dp(6) else 0
                }
                row.addView(imageButton, params)

                question.optionImages[answerIndex]?.takeIf {
                    it.isNotBlank()
                }?.let { imageUrl ->
                    loadVisualAnswerImage(
                        imageUrl = imageUrl,
                        imageButton = imageButton,
                        answerIndex = answerIndex,
                        answerLabel = question.options[answerIndex],
                        renderIdentity = renderIdentity
                    )
                }

                views.add(imageButton)
            }
        }

        return views
    }

    private fun renderAnswerState(snapshot: QuizSession.Snapshot) {
        val feedback = snapshot.feedback
        val controlsEnabled =
            snapshot.phase == QuizSession.Phase.QUESTION &&
                !snapshot.answerTransitionInProgress &&
                !snapshot.replacementInProgress

        answerViews.forEachIndexed { index, view ->
            val style = when {
                feedback != null && index == feedback.selectedIndex && !feedback.isCorrect ->
                    AnswerStyle.WRONG

                feedback != null && index == feedback.correctIndex ->
                    AnswerStyle.CORRECT

                else -> AnswerStyle.NORMAL
            }

            view.isEnabled = controlsEnabled
            view.background = answerBackground(style)

            if (view is Button) {
                view.setTextColor(
                    if (style == AnswerStyle.NORMAL) {
                        Color.rgb(17, 24, 39)
                    } else {
                        Color.WHITE
                    }
                )
            }
        }
    }

    private fun ensureSurface(
        layoutId: Int,
        newSurface: Surface
    ): RenderResult {
        if (destroyed) {
            return RenderResult.DESTROYED
        }

        val currentView = overlayView
        if (currentView != null && !isViewRegistered(currentView)) {
            Log.w(
                TAG,
                "STALE NATIVE OVERLAY REFERENCE CLEARED root=${System.identityHashCode(currentView)}"
            )
            clearSurfaceState()
        }

        if (!hasOverlayPermission()) {
            if (overlayView != null && !hide()) {
                return RenderResult.DETACH_FAILED
            }
            return RenderResult.PERMISSION_MISSING
        }

        if (
            surface == newSurface &&
            overlayView?.let(::isViewRegistered) == true
        ) {
            return RenderResult.ALREADY_ATTACHED
        }

        if (overlayView != null && !hide()) {
            return RenderResult.DETACH_FAILED
        }

        val view = LayoutInflater.from(context).inflate(layoutId, null)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        if (!hasOverlayPermission()) {
            return RenderResult.PERMISSION_MISSING
        }

        try {
            windowManager.addView(view, params)
            overlayView = view
            surface = newSurface
            surfaceGeneration++
            Log.d(
                TAG,
                "NATIVE OVERLAY ATTACHED surface=${newSurface.name} " +
                    "generation=$surfaceGeneration root=${System.identityHashCode(view)}"
            )
            return RenderResult.ATTACHED
        } catch (error: SecurityException) {
            Log.e(TAG, "SHOW NATIVE OVERLAY PERMISSION FAILED", error)
        } catch (error: WindowManager.BadTokenException) {
            Log.e(TAG, "SHOW NATIVE OVERLAY TOKEN FAILED", error)
        } catch (error: IllegalStateException) {
            Log.e(TAG, "SHOW NATIVE OVERLAY STATE FAILED", error)
        } catch (error: RuntimeException) {
            Log.e(TAG, "SHOW NATIVE OVERLAY FAILED", error)
        }

        if (isViewRegistered(view) && !detachView(view)) {
            overlayView = view
            surface = newSurface
            return RenderResult.DETACH_FAILED
        }
        clearSurfaceState()
        return RenderResult.ATTACH_FAILED
    }

    private fun hasOverlayPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true
        }

        return try {
            Settings.canDrawOverlays(context)
        } catch (error: RuntimeException) {
            Log.e(TAG, "OVERLAY PERMISSION CHECK FAILED", error)
            false
        }
    }

    private fun isViewRegistered(view: View): Boolean {
        return NativeRuntimePolicy.isOverlayViewRegistered(
            isAttachedToWindow = view.isAttachedToWindow,
            hasParent = view.parent != null
        )
    }

    private fun detachView(view: View): Boolean {
        if (!isViewRegistered(view)) {
            return true
        }

        try {
            windowManager.removeViewImmediate(view)
        } catch (_: IllegalArgumentException) {
            return !isViewRegistered(view)
        } catch (error: SecurityException) {
            Log.e(TAG, "HIDE NATIVE OVERLAY PERMISSION FAILED", error)
        } catch (error: IllegalStateException) {
            Log.e(TAG, "HIDE NATIVE OVERLAY STATE FAILED", error)
        } catch (error: RuntimeException) {
            Log.e(TAG, "HIDE NATIVE OVERLAY FAILED", error)
        }

        if (!isViewRegistered(view)) {
            return true
        }

        return try {
            windowManager.removeView(view)
            !isViewRegistered(view)
        } catch (_: IllegalArgumentException) {
            !isViewRegistered(view)
        } catch (error: RuntimeException) {
            Log.e(TAG, "HIDE NATIVE OVERLAY FALLBACK FAILED", error)
            !isViewRegistered(view)
        }
    }

    private fun loadQuestionImage(
        imageUrl: String,
        imageView: ImageView,
        renderIdentity: String,
        forceRetry: Boolean = false
    ) {
        loadImage(
            imageUrl = imageUrl,
            imageView = imageView,
            renderIdentity = renderIdentity,
            forceRetry = forceRetry,
            onSuccess = {
                imageView.contentDescription = "Quiz question image"
                imageView.isClickable = false
                imageView.setOnClickListener(null)
            },
            onFailure = {
                imageView.contentDescription =
                    "Gambar soal gagal dimuat. Ketuk untuk mencoba lagi."
                imageView.isClickable = true
                imageView.setOnClickListener {
                    loadQuestionImage(
                        imageUrl,
                        imageView,
                        renderIdentity,
                        forceRetry = true
                    )
                }
            }
        )
    }

    private fun loadVisualAnswerImage(
        imageUrl: String,
        imageButton: ImageButton,
        answerIndex: Int,
        answerLabel: String,
        renderIdentity: String,
        forceRetry: Boolean = false
    ) {
        loadImage(
            imageUrl = imageUrl,
            imageView = imageButton,
            renderIdentity = renderIdentity,
            forceRetry = forceRetry,
            onSuccess = {
                imageButton.contentDescription = answerLabel
                imageButton.setOnClickListener { onAnswer(answerIndex) }
            },
            onFailure = {
                imageButton.contentDescription =
                    "$answerLabel. Gambar gagal dimuat. Ketuk untuk mencoba lagi."
                imageButton.setOnClickListener {
                    loadVisualAnswerImage(
                        imageUrl,
                        imageButton,
                        answerIndex,
                        answerLabel,
                        renderIdentity,
                        forceRetry = true
                    )
                }
            }
        )
    }

    private fun loadImage(
        imageUrl: String,
        imageView: ImageView,
        renderIdentity: String,
        forceRetry: Boolean,
        onSuccess: () -> Unit,
        onFailure: () -> Unit
    ) {
        val existing = imageRequests[imageView]
        if (
            existing != null &&
            existing.url == imageUrl &&
            existing.surfaceGeneration == surfaceGeneration &&
            existing.renderIdentity == renderIdentity &&
            (existing.status == ImageStatus.LOADING || !forceRetry)
        ) {
            return
        }

        val request = ImageRequest(
            id = imageRequestIds.incrementAndGet(),
            url = imageUrl,
            surfaceGeneration = surfaceGeneration,
            renderIdentity = renderIdentity,
            status = ImageStatus.LOADING
        )
        imageRequests[imageView] = request
        imageView.tag = null
        imageView.setImageResource(android.R.drawable.ic_popup_sync)
        imageView.setOnClickListener(null)

        try {
            imageExecutor.execute {
                loadImageRequest(request, imageView, onSuccess, onFailure)
            }
        } catch (error: RejectedExecutionException) {
            if (!destroyed) {
                completeImageFailure(request, imageView, onFailure, error)
            }
        }
    }

    private fun loadImageRequest(
        request: ImageRequest,
        imageView: ImageView,
        onSuccess: () -> Unit,
        onFailure: () -> Unit
    ) {
        if (!isImageRequestCurrent(request, imageView)) {
            return
        }

        var connection: HttpURLConnection? = null

        try {
            connection = URL(request.url).openConnection() as HttpURLConnection
            connection.connectTimeout = IMAGE_CONNECT_TIMEOUT_MS
            connection.readTimeout = IMAGE_READ_TIMEOUT_MS
            connection.instanceFollowRedirects = true
            connection.useCaches = true
            imageConnections[request.id] = connection

            if (!isImageRequestCurrent(request, imageView)) {
                return
            }

            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                throw IOException("Quiz image HTTP $responseCode")
            }

            val bitmap = connection.inputStream.use { stream ->
                BitmapFactory.decodeStream(stream)
                    ?: throw IOException("Quiz image could not be decoded")
            }

            mainHandler.post {
                if (isImageRequestCurrent(request, imageView)) {
                    imageRequests[imageView] = request.copy(status = ImageStatus.LOADED)
                    imageView.setImageBitmap(bitmap)
                    onSuccess()
                }
            }
        } catch (error: Exception) {
            if (isImageRequestCurrent(request, imageView)) {
                completeImageFailure(request, imageView, onFailure, error)
            }
        } finally {
            connection?.let { activeConnection ->
                imageConnections.remove(request.id, activeConnection)
                try {
                    activeConnection.disconnect()
                } catch (_: RuntimeException) {
                }
            }
        }
    }

    private fun completeImageFailure(
        request: ImageRequest,
        imageView: ImageView,
        onFailure: () -> Unit,
        error: Exception
    ) {
        Log.e(TAG, "QUIZ IMAGE LOAD FAILED (${request.id})", error)

        mainHandler.post {
            if (isImageRequestCurrent(request, imageView)) {
                imageRequests[imageView] = request.copy(status = ImageStatus.FAILED)
                imageView.tag = null
                imageView.setImageResource(android.R.drawable.ic_dialog_alert)
                onFailure()
            }
        }
    }

    private fun isImageRequestCurrent(
        request: ImageRequest,
        imageView: ImageView
    ): Boolean {
        if (
            destroyed ||
            request.surfaceGeneration != surfaceGeneration ||
            request.renderIdentity != currentRenderIdentity
        ) {
            return false
        }

        return imageRequests[imageView]?.id == request.id
    }

    private fun cancelImageRequests() {
        imageConnections.values.forEach { connection ->
            try {
                connection.disconnect()
            } catch (_: RuntimeException) {
            }
        }
        imageConnections.clear()
        imageRequests.clear()
    }

    private fun answerBackground(style: AnswerStyle): GradientDrawable {
        val fillColor = when (style) {
            AnswerStyle.NORMAL -> Color.rgb(248, 250, 252)
            AnswerStyle.CORRECT -> Color.rgb(34, 197, 94)
            AnswerStyle.WRONG -> Color.rgb(239, 68, 68)
        }

        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(12).toFloat()
            setColor(fillColor)
            setStroke(dp(1), Color.rgb(229, 231, 235))
        }
    }

    private fun dp(value: Int): Int {
        return (value * context.resources.displayMetrics.density).toInt()
    }

    private enum class AnswerStyle {
        NORMAL,
        CORRECT,
        WRONG
    }
}
