package com.synapause

import android.content.Context
import org.json.JSONObject

internal object MonitoredSiteConfig {
    private const val PREFERENCES_NAME = "synapause_monitoring_config"
    private const val PREFERENCES_KEY = "monitoredSites"

    internal enum class Platform(
        val key: String,
        val packageNames: Set<String>
    ) {
        YOUTUBE(
            key = "youtube",
            packageNames = setOf("com.google.android.youtube")
        ),
        INSTAGRAM(
            key = "instagram",
            packageNames = setOf("com.instagram.android")
        ),
        TIKTOK(
            key = "tiktok",
            packageNames = setOf(
                "com.zhiliaoapp.musically",
                "com.ss.android.ugc.trill"
            )
        ),
        FACEBOOK(
            key = "facebook",
            packageNames = setOf("com.facebook.katana")
        ),
        X(
            key = "x",
            packageNames = setOf("com.twitter.android")
        ),
        THREADS(
            key = "threads",
            packageNames = setOf("com.instagram.barcelona")
        )
    }

    internal data class Snapshot(
        private val enabledByKey: Map<String, Boolean>
    ) {
        fun isEnabled(platform: Platform): Boolean {
            return enabledByKey[platform.key] == true
        }

        fun asMap(): Map<String, Boolean> {
            return enabledByKey.toMap()
        }
    }

    internal data class LoadResult(
        val snapshot: Snapshot,
        val repaired: Boolean
    )

    val siteKeys: List<String> =
        Platform.values().map { platform -> platform.key }

    val defaultSnapshot = Snapshot(
        Platform.values().associate { platform ->
            platform.key to true
        }
    )

    private val packageLookup: Map<String, Platform> =
        Platform.values()
            .flatMap { platform ->
                platform.packageNames.map { packageName ->
                    packageName to platform
                }
            }
            .toMap()

    fun resolvePlatform(packageName: String?): Platform? {
        if (packageName.isNullOrBlank()) {
            return null
        }

        return packageLookup[packageName]
    }

    fun createSnapshot(
        enabledByKey: Map<String, Boolean>
    ): Snapshot? {
        if (
            siteKeys.any { key -> !enabledByKey.containsKey(key) } ||
            siteKeys.none { key -> enabledByKey[key] == true }
        ) {
            return null
        }

        return Snapshot(
            siteKeys.associateWith { key ->
                enabledByKey[key] == true
            }
        )
    }

    /**
     * Pure decoder for the persisted native mirror. The Context-backed load
     * path below remains responsible for repairing storage when requested.
     */
    internal fun decodeStored(raw: String?): LoadResult {
        if (raw.isNullOrBlank()) {
            return LoadResult(defaultSnapshot, repaired = true)
        }

        val parsed = try {
            JSONObject(raw)
        } catch (_: Exception) {
            return LoadResult(defaultSnapshot, repaired = true)
        }

        var repaired = false
        val normalized = linkedMapOf<String, Boolean>()

        siteKeys.forEach { key ->
            val value = parsed.opt(key)

            if (value is Boolean) {
                normalized[key] = value
            } else {
                normalized[key] = true
                repaired = true
            }
        }

        val snapshot = if (normalized.values.any { enabled -> enabled }) {
            Snapshot(normalized)
        } else {
            repaired = true
            defaultSnapshot
        }

        return LoadResult(snapshot, repaired)
    }

    fun persist(
        context: Context,
        snapshot: Snapshot
    ): Boolean {
        val json = JSONObject().apply {
            snapshot.asMap().forEach { (key, enabled) ->
                put(key, enabled)
            }
        }

        return try {
            context.getSharedPreferences(
                PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )
                .edit()
                .putString(PREFERENCES_KEY, json.toString())
                .commit()
        } catch (_: Exception) {
            false
        }
    }

    fun load(context: Context): LoadResult {
        val preferences = context.getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE
        )

        val raw = try {
            preferences.getString(PREFERENCES_KEY, null)
        } catch (_: Exception) {
            null
        }

        val result = decodeStored(raw)

        if (result.repaired) {
            persist(context, result.snapshot)
        }

        return result
    }
}
