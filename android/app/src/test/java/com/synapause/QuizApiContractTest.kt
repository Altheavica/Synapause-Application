package com.synapause

import java.net.URLDecoder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class QuizApiContractTest {
    private val question = QuizQuestion(
        id = "question 1",
        question = "Question?",
        category = "Visual & Image",
        optionA = "A",
        optionB = "B",
        optionC = "C",
        optionD = "D",
        answer = "A",
        questionImage = null,
        imageA = null,
        imageB = null,
        imageC = null,
        imageD = null,
        targetWord = null,
        inkColor = null
    )

    @Test
    fun startSessionUsesTheAnalyticsPostContract() {
        val request = QuizApiContract.startSession("user 1")

        assertEquals(QuizApiMethod.POST_FORM, request.method)
        assertTrue(request.url.contains("script.google.com/macros/s/"))
        assertEquals(
            linkedMapOf("action" to "startSession", "userId" to "user 1"),
            request.fields
        )
    }

    @Test
    fun getQuizUsesAnEncodedGetQuery() {
        val request = QuizApiContract.getQuiz("user+1@example.com")

        assertEquals(QuizApiMethod.GET, request.method)
        assertEquals(
            mapOf("action" to "getQuiz", "userId" to "user+1@example.com"),
            decodedQuery(request.url)
        )
        assertTrue(request.fields.isEmpty())
    }

    @Test
    fun replacementUsesTheExactCategoryAndSourceQuestionFields() {
        val request = QuizApiContract.getNextQuestion(
            userId = "user 1",
            category = "Visual & Image",
            currentQuestionId = "question/1"
        )

        assertEquals(QuizApiMethod.GET, request.method)
        assertEquals(
            mapOf(
                "action" to "getNextQuestion",
                "userId" to "user 1",
                "category" to "Visual & Image",
                "currentQuestionId" to "question/1"
            ),
            decodedQuery(request.url)
        )
    }

    @Test
    fun saveAnswerUsesTheExactAnalyticsFields() {
        val request = QuizApiContract.saveAnswer(
            sessionId = "session-1",
            userId = "user-1",
            question = question,
            selectedAnswer = "B",
            isCorrect = false,
            responseTimeMs = 1234L
        )

        assertEquals(QuizApiMethod.POST_FORM, request.method)
        assertEquals(
            linkedMapOf(
                "action" to "saveAnswer",
                "sessionId" to "session-1",
                "userId" to "user-1",
                "questionId" to "question 1",
                "category" to "Visual & Image",
                "selectedAnswer" to "B",
                "correctAnswer" to "A",
                "isCorrect" to "false",
                "responseTimeMS" to "1234",
                "isReplacement" to "true"
            ),
            request.fields
        )
    }

    @Test
    fun finishSessionUsesOnlyTheRequiredPostFields() {
        val request = QuizApiContract.finishSession("session-1")

        assertEquals(QuizApiMethod.POST_FORM, request.method)
        assertEquals(
            linkedMapOf("action" to "finishSession", "sessionId" to "session-1"),
            request.fields
        )
    }

    private fun decodedQuery(url: String): Map<String, String> {
        return url.substringAfter('?')
            .split('&')
            .associate { part ->
                val pieces = part.split('=', limit = 2)
                URLDecoder.decode(pieces[0], "UTF-8") to
                    URLDecoder.decode(pieces[1], "UTF-8")
            }
    }
}
