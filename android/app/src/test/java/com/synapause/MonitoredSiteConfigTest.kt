package com.synapause

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MonitoredSiteConfigTest {
    @Test
    fun resolvesOnlyTheApprovedPlatformPackages() {
        val expected = mapOf(
            "com.google.android.youtube" to MonitoredSiteConfig.Platform.YOUTUBE,
            "com.instagram.android" to MonitoredSiteConfig.Platform.INSTAGRAM,
            "com.zhiliaoapp.musically" to MonitoredSiteConfig.Platform.TIKTOK,
            "com.ss.android.ugc.trill" to MonitoredSiteConfig.Platform.TIKTOK,
            "com.facebook.katana" to MonitoredSiteConfig.Platform.FACEBOOK,
            "com.twitter.android" to MonitoredSiteConfig.Platform.X,
            "com.instagram.barcelona" to MonitoredSiteConfig.Platform.THREADS
        )

        expected.forEach { (packageName, platform) ->
            assertEquals(platform, MonitoredSiteConfig.resolvePlatform(packageName))
        }

        assertNull(MonitoredSiteConfig.resolvePlatform(null))
        assertNull(MonitoredSiteConfig.resolvePlatform(""))
        assertNull(MonitoredSiteConfig.resolvePlatform("com.example.youtube"))
        assertNull(MonitoredSiteConfig.resolvePlatform("com.google.android.youtube.kids"))
    }

    @Test
    fun createsOnlyCompleteNonEmptySixPlatformSnapshots() {
        val allEnabled = MonitoredSiteConfig.siteKeys.associateWith { true }
        val snapshot = MonitoredSiteConfig.createSnapshot(allEnabled)

        requireNotNull(snapshot)
        MonitoredSiteConfig.Platform.values().forEach { platform ->
            assertTrue(snapshot.isEnabled(platform))
        }

        val youtubeDisabled = allEnabled + ("youtube" to false)
        val disabledSnapshot = MonitoredSiteConfig.createSnapshot(youtubeDisabled)
        requireNotNull(disabledSnapshot)
        assertFalse(disabledSnapshot.isEnabled(MonitoredSiteConfig.Platform.YOUTUBE))
        assertTrue(disabledSnapshot.isEnabled(MonitoredSiteConfig.Platform.TIKTOK))

        assertNull(
            MonitoredSiteConfig.createSnapshot(
                allEnabled - "threads"
            )
        )
        assertNull(
            MonitoredSiteConfig.createSnapshot(
                MonitoredSiteConfig.siteKeys.associateWith { false }
            )
        )
    }

    @Test
    fun persistedMirrorDecoderRepairsMissingMalformedPartialAndAllDisabledData() {
        listOf(null, "", "{").forEach { raw ->
            val result = MonitoredSiteConfig.decodeStored(raw)
            assertTrue(result.repaired)
            assertEquals(
                MonitoredSiteConfig.defaultSnapshot.asMap(),
                result.snapshot.asMap()
            )
        }

        val partial = MonitoredSiteConfig.decodeStored(
            JSONObject()
                .put("youtube", false)
                .put("instagram", true)
                .toString()
        )
        assertTrue(partial.repaired)
        assertFalse(
            partial.snapshot.isEnabled(MonitoredSiteConfig.Platform.YOUTUBE)
        )
        assertTrue(
            partial.snapshot.isEnabled(MonitoredSiteConfig.Platform.THREADS)
        )

        val allDisabled = JSONObject().apply {
            MonitoredSiteConfig.siteKeys.forEach { key -> put(key, false) }
        }
        val disabledResult = MonitoredSiteConfig.decodeStored(allDisabled.toString())
        assertTrue(disabledResult.repaired)
        assertEquals(
            MonitoredSiteConfig.defaultSnapshot.asMap(),
            disabledResult.snapshot.asMap()
        )
    }

    @Test
    fun completePersistedMirrorNeedsNoRepairAndIgnoresUnknownFields() {
        val expected = MonitoredSiteConfig.siteKeys.associateWith { key ->
            key != "x"
        }
        val json = JSONObject(expected).put("unknown", false)

        val result = MonitoredSiteConfig.decodeStored(json.toString())

        assertFalse(result.repaired)
        assertEquals(expected, result.snapshot.asMap())
    }
}
