package com.synapause

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

internal data class QuizQuestion(
    val id: String,
    val question: String,
    val category: String,
    val optionA: String,
    val optionB: String,
    val optionC: String,
    val optionD: String,
    val answer: String,
    val questionImage: String?,
    val imageA: String?,
    val imageB: String?,
    val imageC: String?,
    val imageD: String?,
    val targetWord: String?,
    val inkColor: String?
) {
    val options: List<String>
        get() = listOf(optionA, optionB, optionC, optionD)

    val optionImages: List<String?>
        get() = listOf(imageA, imageB, imageC, imageD)

    fun toMap(): Map<String, Any?> {
        return mapOf(
            "id" to id,
            "question" to question,
            "category" to category,
            "optionA" to optionA,
            "optionB" to optionB,
            "optionC" to optionC,
            "optionD" to optionD,
            "answer" to answer,
            "questionImage" to questionImage,
            "imageA" to imageA,
            "imageB" to imageB,
            "imageC" to imageC,
            "imageD" to imageD,
            "targetWord" to targetWord,
            "inkColor" to inkColor
        )
    }

    companion object {
        fun fromJson(json: JSONObject): QuizQuestion {
            return QuizQuestion(
                id = json.stringValue("id"),
                question = json.stringValue("question"),
                category = json.stringValue("category"),
                optionA = json.stringValue("optionA"),
                optionB = json.stringValue("optionB"),
                optionC = json.stringValue("optionC"),
                optionD = json.stringValue("optionD"),
                answer = json.stringValue("answer"),
                questionImage = json.nullableStringValue("questionImage"),
                imageA = json.nullableStringValue("imageA"),
                imageB = json.nullableStringValue("imageB"),
                imageC = json.nullableStringValue("imageC"),
                imageD = json.nullableStringValue("imageD"),
                targetWord = json.nullableStringValue("targetWord"),
                inkColor = json.nullableStringValue("inkColor")
            )
        }

        fun fromMap(values: Map<*, *>): QuizQuestion {
            fun value(key: String): String {
                return values[key]?.toString().orEmpty()
            }

            fun nullableValue(key: String): String? {
                return values[key]?.toString()?.takeIf { it.isNotBlank() }
            }

            return QuizQuestion(
                id = value("id"),
                question = value("question"),
                category = value("category"),
                optionA = value("optionA"),
                optionB = value("optionB"),
                optionC = value("optionC"),
                optionD = value("optionD"),
                answer = value("answer"),
                questionImage = nullableValue("questionImage"),
                imageA = nullableValue("imageA"),
                imageB = nullableValue("imageB"),
                imageC = nullableValue("imageC"),
                imageD = nullableValue("imageD"),
                targetWord = nullableValue("targetWord"),
                inkColor = nullableValue("inkColor")
            )
        }
    }
}

internal enum class QuizApiMethod {
    GET,
    POST_FORM
}

internal data class QuizApiRequest(
    val method: QuizApiMethod,
    val url: String,
    val fields: Map<String, String> = emptyMap()
)

internal object QuizApiContract {
    private const val QUESTION_API =
        "https://script.google.com/macros/s/AKfycby68KOeiPvpNscnSwTqtZa18eLCxLOsZLCSNaYEnJa7py1g9poZrDP4IT5jGKh0_nD0/exec"

    private const val ANALYTICS_API =
        "https://script.google.com/macros/s/AKfycbzDvygssssnKnU79C_MYw9ozTz5xdvq5AE4HgmyMkwIGi9YBYRIfVsTNjyfzLYczR6y/exec"

    fun startSession(userId: String) = QuizApiRequest(
        method = QuizApiMethod.POST_FORM,
        url = ANALYTICS_API,
        fields = linkedMapOf(
                "action" to "startSession",
                "userId" to userId
            )
    )

    fun getQuiz(userId: String) = QuizApiRequest(
        method = QuizApiMethod.GET,
        url = QUESTION_API +
            "?action=getQuiz" +
            "&userId=" + encode(userId)
    )

    fun getNextQuestion(
        userId: String,
        category: String,
        currentQuestionId: String
    ) = QuizApiRequest(
        method = QuizApiMethod.GET,
        url = QUESTION_API +
            "?action=getNextQuestion" +
            "&userId=" + encode(userId) +
            "&category=" + encode(category) +
            "&currentQuestionId=" + encode(currentQuestionId)
    )

    fun saveAnswer(
        sessionId: String,
        userId: String,
        question: QuizQuestion,
        selectedAnswer: String,
        isCorrect: Boolean,
        responseTimeMs: Long
    ) = QuizApiRequest(
        method = QuizApiMethod.POST_FORM,
        url = ANALYTICS_API,
        fields = linkedMapOf(
            "action" to "saveAnswer",
            "sessionId" to sessionId,
            "userId" to userId,
            "questionId" to question.id,
            "category" to question.category,
            "selectedAnswer" to selectedAnswer,
            "correctAnswer" to question.answer,
            "isCorrect" to isCorrect.toString(),
            "responseTimeMS" to responseTimeMs.toString(),
            "isReplacement" to (!isCorrect).toString()
        )
    )

    fun finishSession(sessionId: String) = QuizApiRequest(
        method = QuizApiMethod.POST_FORM,
        url = ANALYTICS_API,
        fields = linkedMapOf(
            "action" to "finishSession",
            "sessionId" to sessionId
        )
    )

    private fun encode(value: String): String {
        return URLEncoder.encode(value, "UTF-8")
    }
}

internal object QuizApiClient {
    fun startSession(userId: String): String {
        val result = execute(QuizApiContract.startSession(userId))

        val sessionId = result.optString("sessionId", "").trim()
        if (sessionId.isEmpty()) {
            throw IllegalStateException("startSession response did not include a sessionId")
        }

        return sessionId
    }

    fun getQuiz(userId: String): List<QuizQuestion> {
        val result = execute(QuizApiContract.getQuiz(userId))

        val array = result.getJSONArray("questions")
        return array.toQuizQuestions()
    }

    fun getNextQuestion(
        userId: String,
        category: String,
        currentQuestionId: String
    ): QuizQuestion {
        val result = execute(
            QuizApiContract.getNextQuestion(
                userId,
                category,
                currentQuestionId
            )
        )

        return QuizQuestion.fromJson(
            result.getJSONObject("question")
        )
    }

    fun saveAnswer(
        sessionId: String,
        userId: String,
        question: QuizQuestion,
        selectedAnswer: String,
        isCorrect: Boolean,
        responseTimeMs: Long
    ) {
        execute(
            QuizApiContract.saveAnswer(
                sessionId = sessionId,
                userId = userId,
                question = question,
                selectedAnswer = selectedAnswer,
                isCorrect = isCorrect,
                responseTimeMs = responseTimeMs
            )
        )
    }

    fun finishSession(sessionId: String) {
        execute(QuizApiContract.finishSession(sessionId))
    }

    private fun execute(request: QuizApiRequest): JSONObject {
        return when (request.method) {
            QuizApiMethod.GET -> getJson(request.url)
            QuizApiMethod.POST_FORM -> postForm(request.url, request.fields)
        }
    }

    private fun getJson(url: String): JSONObject {
        val connection = URL(url).openConnection() as HttpURLConnection
        configure(connection)
        connection.requestMethod = "GET"
        return execute(connection)
    }

    private fun postForm(
        url: String,
        fields: Map<String, String>
    ): JSONObject {
        val body = fields.entries.joinToString("&") { entry ->
            encode(entry.key) + "=" + encode(entry.value)
        }

        val connection = URL(url).openConnection() as HttpURLConnection
        configure(connection)
        connection.requestMethod = "POST"
        connection.doOutput = true
        connection.setRequestProperty(
            "Content-Type",
            "application/x-www-form-urlencoded;charset=UTF-8"
        )

        connection.outputStream.use { stream ->
            stream.write(body.toByteArray(Charsets.UTF_8))
        }

        return execute(connection)
    }

    private fun execute(connection: HttpURLConnection): JSONObject {
        return try {
            val status = connection.responseCode
            val stream = if (status >= 400) {
                connection.errorStream
            } else {
                connection.inputStream
            }

            val body = stream?.bufferedReader(Charsets.UTF_8)?.use {
                it.readText()
            }.orEmpty()

            JSONObject(body)
        } finally {
            connection.disconnect()
        }
    }

    private fun configure(connection: HttpURLConnection) {
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        connection.instanceFollowRedirects = true
    }

    private fun encode(value: String): String {
        return URLEncoder.encode(value, "UTF-8")
    }
}

private fun JSONArray.toQuizQuestions(): List<QuizQuestion> {
    return buildList {
        for (index in 0 until length()) {
            add(
                QuizQuestion.fromJson(
                    getJSONObject(index)
                )
            )
        }
    }
}

private fun JSONObject.stringValue(key: String): String {
    return nullableStringValue(key).orEmpty()
}

private fun JSONObject.nullableStringValue(key: String): String? {
    if (!has(key) || isNull(key)) {
        return null
    }

    return get(key).toString()
}
