package com.synapause

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

class ForegroundAppModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(
    reactContext
) {
    //=======MODULE=======//
    override fun getName(): String {
        return "ForegroundAppModule"
    }

    //=======OVERLAY PERMISSION=======//
    @ReactMethod
    fun hasOverlayPermission(
        promise: Promise
    ){
        try{
            val granted =
                if(
                    Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.M
                ){
                    Settings.canDrawOverlays(
                        reactApplicationContext
                    )
                }

                else{
                    true
                }

            promise.resolve(
                granted
            )
        }

        catch(error: Exception){
            promise.reject(
                "OVERLAY_PERMISSION_ERROR",
                error
            )
        }
    }


    @ReactMethod
    fun requestOverlayPermission(
        promise: Promise
    ){
        try{
            if(
                Build.VERSION.SDK_INT <
                Build.VERSION_CODES.M
            ){
                promise.resolve(
                    true
                )

                return
            }


            if(
                Settings.canDrawOverlays(
                    reactApplicationContext
                )
            ){
                promise.resolve(
                    true
                )

                return
            }

            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse(
                    "package:${reactApplicationContext.packageName}"
                )
            )


            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
            )


            reactApplicationContext.startActivity(
                intent
            )


            promise.resolve(
                false
            )
        }

        catch(error: Exception){
            promise.reject(
                "OVERLAY_PERMISSION_REQUEST_ERROR",
                error
            )
        }
    }



    //=======SERVICE=======//
    @ReactMethod
    fun startMonitoring(
        promise: Promise
    ){
        try{
            if(
                !ForegroundMonitorService.hasValidPersistedUser(
                    reactApplicationContext
                )
            ){
                promise.reject(
                    "USER_REQUIRED",
                    "A valid synchronized user is required before monitoring can start."
                )

                return
            }

            val intent = Intent(
                reactApplicationContext,
                ForegroundMonitorService::class.java
            )

            if(
                Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.O
            ){
                reactApplicationContext.startForegroundService(
                    intent
                )
            }

            else{
                reactApplicationContext.startService(
                    intent
                )
            }

            promise.resolve(
                true
            )
        }

        catch(error: Exception){
            promise.reject(
                "START_MONITOR_ERROR",
                error
            )
        }
    }

    @ReactMethod
    fun updateLoggedInUser(
        user: ReadableMap,
        promise: Promise
    ) {
        try {
            val id = getValidUserField(user, "id")
            val username = getValidUserField(user, "username")
            val email = getValidUserField(user, "email")

            if(
                id == null ||
                username == null ||
                email == null
            ){
                ForegroundMonitorService.clearPersistedUser(
                    reactApplicationContext
                )

                sendUserMirrorBroadcast(
                    ForegroundMonitorService.ACTION_USER_MIRROR_CLEARED
                )

                promise.reject(
                    "INVALID_USER",
                    "User must contain valid id, username, and email strings."
                )

                return
            }

            if(
                !ForegroundMonitorService.updatePersistedUser(
                    reactApplicationContext,
                    id,
                    username,
                    email
                )
            ){
                promise.reject(
                    "UPDATE_USER_ERROR",
                    "Native user mirror could not be persisted."
                )

                return
            }

            sendUserMirrorBroadcast(
                ForegroundMonitorService.ACTION_USER_MIRROR_UPDATED
            )

            promise.resolve(true)
        }

        catch(error: Exception){
            promise.reject(
                "UPDATE_USER_ERROR",
                error
            )
        }
    }

    private fun getValidUserField(
        user: ReadableMap,
        key: String
    ): String? {
        if(
            !user.hasKey(key) ||
            user.isNull(key) ||
            user.getType(key) != ReadableType.String
        ){
            return null
        }

        return user.getString(key)
            ?.takeIf { value ->
                value.isNotBlank()
            }
    }

    @ReactMethod
    fun updateMonitoredSites(
        sites: ReadableMap,
        promise: Promise
    ) {
        try {
            val enabledByKey = linkedMapOf<String, Boolean>()

            MonitoredSiteConfig.siteKeys.forEach { key ->
                if (
                    !sites.hasKey(key) ||
                    sites.isNull(key) ||
                    sites.getType(key) != ReadableType.Boolean
                ) {
                    promise.reject(
                        "INVALID_MONITORED_SITES",
                        "Monitored sites must contain six boolean platform values."
                    )
                    return
                }

                enabledByKey[key] = sites.getBoolean(key)
            }

            val snapshot =
                MonitoredSiteConfig.createSnapshot(enabledByKey)

            if (snapshot == null) {
                promise.reject(
                    "INVALID_MONITORED_SITES",
                    "At least one monitored platform must remain enabled."
                )
                return
            }

            if (
                !MonitoredSiteConfig.persist(
                    reactApplicationContext,
                    snapshot
                )
            ) {
                promise.reject(
                    "UPDATE_MONITORED_SITES_ERROR",
                    "Native monitored-site mirror could not be persisted."
                )
                return
            }

            sendUserMirrorBroadcast(
                ForegroundMonitorService.ACTION_MONITORED_SITES_UPDATED
            )

            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject(
                "UPDATE_MONITORED_SITES_ERROR",
                error
            )
        }
    }

    @ReactMethod
    fun clearLoggedInUser(
        promise: Promise
    ) {
        try {
            ForegroundMonitorService.clearPersistedUser(
                reactApplicationContext
            )

            sendUserMirrorBroadcast(
                ForegroundMonitorService.ACTION_USER_MIRROR_CLEARED
            )

            promise.resolve(true)
        }

        catch(error: Exception){
            promise.reject(
                "CLEAR_USER_ERROR",
                error
            )
        }
    }

    private fun sendUserMirrorBroadcast(
        action: String
    ) {
        val broadcast = Intent(action)
        broadcast.setPackage(reactApplicationContext.packageName)
        reactApplicationContext.sendBroadcast(broadcast)
    }

}
