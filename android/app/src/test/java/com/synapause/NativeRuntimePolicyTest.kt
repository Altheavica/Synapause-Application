package com.synapause

import android.app.usage.UsageEvents
import android.os.Build
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeRuntimePolicyTest {
    @Test
    fun monitorTimerReachesTheThresholdOnceAtFifteenSeconds() {
        var seconds = 0

        repeat(NativeRuntimePolicy.MONITOR_THRESHOLD_SECONDS - 1) {
            val tick = NativeRuntimePolicy.advanceMonitorTimer(seconds)
            seconds = tick.seconds
            assertFalse(tick.thresholdReached)
        }

        val thresholdTick = NativeRuntimePolicy.advanceMonitorTimer(seconds)
        assertEquals(15, thresholdTick.seconds)
        assertTrue(thresholdTick.thresholdReached)
    }

    @Test
    fun timerEligibilityHonorsLoginMonitoringAndTheGlobalQuizLock() {
        assertTrue(
            NativeRuntimePolicy.canRunMonitorTimer(
                loggedIn = true,
                quizRequired = false,
                monitored = true
            )
        )
        assertFalse(NativeRuntimePolicy.canRunMonitorTimer(false, false, true))
        assertFalse(NativeRuntimePolicy.canRunMonitorTimer(true, true, true))
        assertFalse(NativeRuntimePolicy.canRunMonitorTimer(true, false, false))
    }

    @Test
    fun foregroundEventSelectionMatchesThePlatformVersion() {
        assertTrue(
            NativeRuntimePolicy.isForegroundEvent(
                UsageEvents.Event.ACTIVITY_RESUMED,
                Build.VERSION_CODES.Q
            )
        )
        assertFalse(
            NativeRuntimePolicy.isForegroundEvent(
                UsageEvents.Event.ACTIVITY_PAUSED,
                Build.VERSION_CODES.Q
            )
        )
        assertTrue(
            NativeRuntimePolicy.isForegroundEvent(
                UsageEvents.Event.MOVE_TO_FOREGROUND,
                Build.VERSION_CODES.P
            )
        )
        assertTrue(
            NativeRuntimePolicy.isBackgroundEvent(
                UsageEvents.Event.ACTIVITY_PAUSED,
                Build.VERSION_CODES.Q
            )
        )
        assertTrue(
            NativeRuntimePolicy.isBackgroundEvent(
                UsageEvents.Event.MOVE_TO_BACKGROUND,
                Build.VERSION_CODES.P
            )
        )
    }

    @Test
    fun foregroundEvidenceRequiresFreshTimeScreenAndUsageAccess() {
        val now = 100_000L
        val maxAge = NativeRuntimePolicy.FOREGROUND_EVIDENCE_MAX_AGE_MS

        assertTrue(NativeRuntimePolicy.isForegroundEvidenceFresh(now, now - maxAge, true, true))
        assertFalse(NativeRuntimePolicy.isForegroundEvidenceFresh(now, now - maxAge - 1, true, true))
        assertFalse(NativeRuntimePolicy.isForegroundEvidenceFresh(now, now + 1, true, true))
        assertFalse(NativeRuntimePolicy.isForegroundEvidenceFresh(now, now, false, true))
        assertFalse(NativeRuntimePolicy.isForegroundEvidenceFresh(now, now, true, false))
    }

    @Test
    fun pendingOrAttachedOverlayRootsRemainRegistered() {
        assertTrue(NativeRuntimePolicy.isOverlayViewRegistered(true, false))
        assertTrue(NativeRuntimePolicy.isOverlayViewRegistered(false, true))
        assertTrue(NativeRuntimePolicy.isOverlayViewRegistered(true, true))
        assertFalse(NativeRuntimePolicy.isOverlayViewRegistered(false, false))
    }
}
