package com.synapause

import android.app.usage.UsageEvents
import android.os.Build

/**
 * Pure decisions used by the native runtime. Keeping these decisions free of
 * Service/Handler/WindowManager ownership makes their safety invariants
 * repeatable without changing who owns the runtime state.
 */
internal object NativeRuntimePolicy {
    const val MONITOR_THRESHOLD_SECONDS = 15
    const val FOREGROUND_EVENT_LOOKBACK_MS = 30_000L
    const val FOREGROUND_EVIDENCE_MAX_AGE_MS = 20_000L

    internal data class TimerTick(
        val seconds: Int,
        val thresholdReached: Boolean
    )

    fun canRunMonitorTimer(
        loggedIn: Boolean,
        quizRequired: Boolean,
        monitored: Boolean
    ): Boolean {
        return loggedIn && !quizRequired && monitored
    }

    fun advanceMonitorTimer(seconds: Int): TimerTick {
        val nextSeconds = (seconds + 1).coerceAtLeast(0)
        return TimerTick(
            seconds = nextSeconds,
            thresholdReached = nextSeconds >= MONITOR_THRESHOLD_SECONDS
        )
    }

    fun isForegroundEvent(eventType: Int, sdkInt: Int): Boolean {
        return if (sdkInt >= Build.VERSION_CODES.Q) {
            eventType == UsageEvents.Event.ACTIVITY_RESUMED
        } else {
            @Suppress("DEPRECATION")
            eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
        }
    }

    fun isBackgroundEvent(eventType: Int, sdkInt: Int): Boolean {
        return if (sdkInt >= Build.VERSION_CODES.Q) {
            eventType == UsageEvents.Event.ACTIVITY_PAUSED ||
                eventType == UsageEvents.Event.ACTIVITY_STOPPED
        } else {
            @Suppress("DEPRECATION")
            eventType == UsageEvents.Event.MOVE_TO_BACKGROUND
        }
    }

    fun isForegroundEvidenceFresh(
        nowMs: Long,
        evidenceAtMs: Long,
        screenInteractive: Boolean,
        usageAccessAvailable: Boolean
    ): Boolean {
        val ageMs = nowMs - evidenceAtMs
        return screenInteractive &&
            usageAccessAvailable &&
            ageMs >= 0L &&
            ageMs <= FOREGROUND_EVIDENCE_MAX_AGE_MS
    }

    fun isOverlayViewRegistered(
        isAttachedToWindow: Boolean,
        hasParent: Boolean
    ): Boolean {
        return isAttachedToWindow || hasParent
    }
}
