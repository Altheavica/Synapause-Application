package com.synapause

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.Process
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

private data class MonitorSession(
    var active: Boolean = false,
    var appId: String? = null
)

class ForegroundMonitorService : Service() {
    companion object {
        const val CHANNEL_ID = "synapause_monitor_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_USER_MIRROR_UPDATED = "com.synapause.USER_MIRROR_UPDATED"
        const val ACTION_USER_MIRROR_CLEARED = "com.synapause.USER_MIRROR_CLEARED"
        const val ACTION_MONITORED_SITES_UPDATED = "com.synapause.MONITORED_SITES_UPDATED"
        private const val USER_PREFERENCES_NAME = "synapause_storage"
        private const val USER_PREFERENCES_KEY = "synapauseUser"
        private const val SURFACE_RECOVERY_DELAY_MS = 3_000L
        private const val COMPLETION_RECOVERY_DELAY_MS = 1_000L

        internal fun updatePersistedUser(
            context: Context,
            id: String,
            username: String,
            email: String
        ): Boolean {
            if(
                id.isBlank() ||
                username.isBlank() ||
                email.isBlank()
            ){
                return false
            }

            val json = JSONObject().apply {
                put("id", id)
                put("username", username)
                put("email", email)
            }

            return context.getSharedPreferences(
                USER_PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )
            .edit()
            .putString(USER_PREFERENCES_KEY, json.toString())
            .commit()
        }

        internal fun hasValidPersistedUser(
            context: Context
        ): Boolean {
            val preferences = context.getSharedPreferences(
                USER_PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )

            val raw = try {
                preferences.getString(USER_PREFERENCES_KEY, null)
            }
            catch(_: Exception){
                clearPersistedUser(context)
                return false
            } ?: return false

            val valid = try {
                if(raw.isBlank()){
                    false
                }
                else{
                    val json = JSONObject(raw)
                    listOf("id", "username", "email").all { key ->
                        val value = json.opt(key)
                        value is String && value.isNotBlank()
                    }
                }
            }
            catch(_: Exception){
                false
            }

            if(!valid){
                clearPersistedUser(context)
            }

            return valid
        }

        internal fun clearPersistedUser(
            context: Context
        ) {
            context.getSharedPreferences(
                USER_PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )
            .edit()
            .remove(USER_PREFERENCES_KEY)
            .commit()
        }
    }

    private lateinit var overlayManager: OverlayManager



    //=======GLOBAL=======//
    private val handler = Handler(
        Looper.getMainLooper()
    )

    private var currentForegroundPackage:String? = null
    private var currentForegroundEvidenceAt = 0L
    private var lastForegroundUnavailableReason:String? = null
    private var timerSeconds = 0
    private var timerRunning = false
    private var lastQuizLockAppId: String? = null
    private val monitorSession = MonitorSession()
    private lateinit var prefs: SharedPreferences
    private var userId:String? = null
    private var username:String? = null
    private var email:String? = null
    private var isLoggedIn = false
    private var surfaceRecoveryScheduled = false
    private var surfaceRecoveryLifecycleId: Long? = null
    private var lastSurfaceFailure: OverlayManager.RenderResult? = null
    private var completionRecoveryScheduled = false
    private var pendingCompletionLifecycleId: Long? = null
    private var monitoredSiteConfig =
        MonitoredSiteConfig.defaultSnapshot

    private val userMirrorReceiver = object : BroadcastReceiver() {
        override fun onReceive(
            context: Context?,
            intent: Intent?
        ) {
            when(intent?.action){
                ACTION_USER_MIRROR_UPDATED -> loadUser()
                ACTION_USER_MIRROR_CLEARED -> clearUserAfterLogout()
                ACTION_MONITORED_SITES_UPDATED -> reloadMonitoredSites()
            }
        }
    }



    //=======MONITOR LOOP=======//
    private val monitorRunnable = object : Runnable {
        override fun run() {
            detectForegroundApp()

            handler.postDelayed(
                this,
                1000
            )
        }
    }



    //=======TIMER LOOP=======//
    private val timerRunnable = object : Runnable {
        override fun run() {
            if(!timerRunning){
                return
            }

            if (QuizSession.isQuizRequired()) {
                timerRunning = false
                handler.removeCallbacks(this)
                Log.d(
                    "SynapauseMonitor",
                    "QUIZ LOCK ACTIVE - MONITOR TIMER BLOCKED"
                )
                return
            }

            val tick = NativeRuntimePolicy.advanceMonitorTimer(timerSeconds)
            timerSeconds = tick.seconds

            Log.d(
                "SynapauseMonitor",
                "Timer: $timerSeconds"
            )

            if(tick.thresholdReached){
                timerRunning = false
                handler.removeCallbacks(this)
                val obligationCreated = QuizSession.requireQuiz()

                if (obligationCreated) {
                    Log.d(
                        "SynapauseMonitor",
                        "QUIZ REQUIRED"
                    )

                    startNativeBlockingQuiz()
                }

                Log.d(
                    "SynapauseMonitor",
                    "=========="
                )

                Log.d(
                    "SynapauseMonitor",
                    "TIMER FINISHED"
                )

                Log.d(
                    "SynapauseMonitor",
                    "Quiz Required: ${QuizSession.isQuizRequired()}"
                )

                Log.d(
                    "SynapauseMonitor",
                    "=========="
                )

                return
                }

            handler.postDelayed(
                this,
                1000
            )
        }
    }



    //=======SERVICE=======//
    override fun onCreate() {
        super.onCreate()

        prefs = getSharedPreferences(
            USER_PREFERENCES_NAME,
            MODE_PRIVATE
        )

        ContextCompat.registerReceiver(
            this,
            userMirrorReceiver,
            IntentFilter().apply {
                addAction(ACTION_USER_MIRROR_UPDATED)
                addAction(ACTION_USER_MIRROR_CLEARED)
                addAction(ACTION_MONITORED_SITES_UPDATED)
            },
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        loadUser()
        loadMonitoredSites()
        QuizSession.configurePersistence(
            getSharedPreferences(
                "synapause_quiz_session",
                MODE_PRIVATE
            )
        )
        overlayManager = OverlayManager(
            context = this,
            onContinue = {
                QuizSession.continueToQuiz()
            },
            onAnswer = { selectedIndex ->
                QuizSession.selectAnswer(selectedIndex)
            },
            onRetry = {
                QuizSession.retryFailedOperation()
            }
        )
        QuizSession.setListener(
            object : QuizSession.Listener {
                override fun onQuizStateChanged(
                    snapshot: QuizSession.Snapshot
                ) {
                    renderNativeQuizSurface(snapshot)
                }

                override fun onQuizCompleted(
                    snapshot: QuizSession.Snapshot
                ) {
                    Log.d(
                        "SynapauseMonitor",
                        "NATIVE QUIZ COMPLETION SIGNAL"
                    )

                    completeNativeBlockingQuiz(snapshot)
                }
            }
        )
        createNotificationChannel()

        val notification = NotificationCompat.Builder(
            this,
            CHANNEL_ID
        )
        
        .setContentTitle("Synapause")
        .setContentText("Focus monitoring is active")
        .setSmallIcon(applicationInfo.icon)
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build()

        startForeground(
            NOTIFICATION_ID,
            notification
        )

        handler.post(
            monitorRunnable
        )

        Log.d(
            "SynapauseMonitor",
            "Foreground Monitor Service Started"
        )
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        try{
            unregisterReceiver(userMirrorReceiver)
        }
        catch(_: Exception){
        }

        handler.removeCallbacks(
            monitorRunnable
        )

        handler.removeCallbacks(
            timerRunnable
        )

        handler.removeCallbacks(
            surfaceRecoveryRunnable
        )

        handler.removeCallbacks(
            completionRecoveryRunnable
        )

        timerRunning =false
        surfaceRecoveryScheduled = false
        surfaceRecoveryLifecycleId = null
        completionRecoveryScheduled = false
        pendingCompletionLifecycleId = null
        QuizSession.setListener(null)
        val surfaceDetached = overlayManager.destroy()

        if (!surfaceDetached) {
            Log.e(
                "SynapauseMonitor",
                "SERVICE DESTROY SURFACE DETACH FAILED - QUIZ OBLIGATION PRESERVED"
            )
        }

        Log.d(
            "SynapauseMonitor",
            "Foreground Monitor Service Stopped"
        )

        super.onDestroy()
    }


    override fun onBind(
        intent: Intent?
    ): IBinder? {

        return null
    }



    //=======FOREGROUND DETECTOR=======//
    private fun detectForegroundApp() {
        if (!isScreenInteractive()) {
            invalidateForegroundTruth("SCREEN_NOT_INTERACTIVE")
            return
        }

        if (!hasUsageStatsAccess()) {
            invalidateForegroundTruth("USAGE_ACCESS_UNAVAILABLE")
            return
        }

        try {
            val usageStatsManager = getSystemService(
                Context.USAGE_STATS_SERVICE
            ) as UsageStatsManager

            val endTime = System.currentTimeMillis()
            val startTime = endTime - NativeRuntimePolicy.FOREGROUND_EVENT_LOOKBACK_MS
            val usageEvents = usageStatsManager.queryEvents(
                startTime,
                endTime
            )

            val event = UsageEvents.Event()
            var foregroundPackage:String? = null
            var foregroundEvidenceAt = 0L

            while(
                usageEvents.hasNextEvent()
            ){
                usageEvents.getNextEvent(
                    event
                )

                val packageName = event.packageName
                    ?.takeIf { value -> value.isNotBlank() }
                    ?: continue

                if(
                    NativeRuntimePolicy.isForegroundEvent(
                        event.eventType,
                        Build.VERSION.SDK_INT
                    ) ||
                    event.eventType == UsageEvents.Event.USER_INTERACTION
                ){
                    foregroundPackage = packageName
                    foregroundEvidenceAt = event.timeStamp
                }

                else if(
                    NativeRuntimePolicy.isBackgroundEvent(
                        event.eventType,
                        Build.VERSION.SDK_INT
                    ) &&
                    foregroundPackage == packageName
                ){
                    foregroundPackage = null
                    foregroundEvidenceAt = event.timeStamp
                }
            }

            if(foregroundPackage == null){
                invalidateForegroundTruth("NO_RECENT_FOREGROUND_EVENT")
                return
            }

            if(!NativeRuntimePolicy.isForegroundEvidenceFresh(
                nowMs = endTime,
                evidenceAtMs = foregroundEvidenceAt,
                screenInteractive = true,
                usageAccessAvailable = true
            )){
                invalidateForegroundTruth("STALE_FOREGROUND_EVENT")
                return
            }

            applyForegroundTruth(
                packageName = foregroundPackage,
                evidenceAt = foregroundEvidenceAt
            )
        }

        catch(error: Exception){
            if(lastForegroundUnavailableReason != "USAGE_QUERY_FAILED"){
                Log.e(
                    "SynapauseMonitor",
                    "FOREGROUND TRUTH UNAVAILABLE: USAGE_QUERY_FAILED",
                    error
                )
            }

            invalidateForegroundTruth("USAGE_QUERY_FAILED")
        }
    }

    @Suppress("DEPRECATION")
    private fun hasUsageStatsAccess(): Boolean {
        return try {
            val appOpsManager = getSystemService(
                Context.APP_OPS_SERVICE
            ) as AppOpsManager

            val mode =
                if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q){
                    appOpsManager.unsafeCheckOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        packageName
                    )
                }

                else{
                    @Suppress("DEPRECATION")
                    appOpsManager.checkOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        packageName
                    )
                }

            mode == AppOpsManager.MODE_ALLOWED
        }

        catch(_: Exception){
            false
        }
    }

    private fun isScreenInteractive(): Boolean {
        return try {
            val powerManager = getSystemService(
                Context.POWER_SERVICE
            ) as PowerManager

            powerManager.isInteractive
        }

        catch(_: Exception){
            false
        }
    }

    private fun applyForegroundTruth(
        packageName: String,
        evidenceAt: Long
    ) {
        val packageChanged =
            currentForegroundPackage != packageName

        currentForegroundPackage = packageName
        currentForegroundEvidenceAt = evidenceAt
        lastForegroundUnavailableReason = null

        if(packageChanged){
            val platform = MonitoredSiteConfig
                .resolvePlatform(packageName)
                ?.key
                ?: "unsupported"

            Log.d(
                "SynapauseMonitor",
                "FOREGROUND APP: $packageName ($platform)"
            )

            updateTimerForCurrentApp(packageName)
        }
    }

    private fun invalidateForegroundTruth(reason: String) {
        val packageChanged = currentForegroundPackage != null
        val reasonChanged = lastForegroundUnavailableReason != reason

        currentForegroundPackage = null
        currentForegroundEvidenceAt = 0L

        if(packageChanged || reasonChanged){
            Log.d(
                "SynapauseMonitor",
                "FOREGROUND APP: UNKNOWN ($reason)"
            )
        }

        lastForegroundUnavailableReason = reason

        if(packageChanged || timerRunning){
            updateTimerForCurrentApp(null)
        }
    }



    //=======TIMER=======//
    private fun updateTimerForCurrentApp(
        appId: String?
    ) {
        val monitored = isPackageMonitored(appId)

        monitorSession.active = monitored
        monitorSession.appId = if (monitored) appId else null

        if (QuizSession.isQuizRequired()) {
            pauseTimer()

            val lockAppId = appId ?: "UNKNOWN"

            if (lastQuizLockAppId != lockAppId) {
                lastQuizLockAppId = lockAppId
                Log.d(
                    "SynapauseMonitor",
                    "QUIZ LOCK ACTIVE - MONITOR TIMER BLOCKED ($lockAppId)"
                )
            }

            return
        }

        if(!hasLoggedIn()){
            pauseTimer()
            return
        }

        lastQuizLockAppId = null

        if(monitored) {
            startTimer()

            Log.d(
                "SynapauseMonitor",
                "SESSION START"
            )

            Log.d(
                "SynapauseMonitor",
                monitorSession.toString()
            )
        }
        else {
            pauseTimer()

            Log.d(
                "SynapauseMonitor",
                "SESSION STOP"
            )
        }
    }

    private fun startTimer(){
        val loggedIn = hasLoggedIn()
        val quizRequired = QuizSession.isQuizRequired()

        if(!NativeRuntimePolicy.canRunMonitorTimer(
                loggedIn = loggedIn,
                quizRequired = quizRequired,
                monitored = monitorSession.active
            )){
            if(!loggedIn){
                pauseTimer()
            }
            else if(quizRequired){
                Log.d(
                    "SynapauseMonitor",
                    "QUIZ LOCK ACTIVE - MONITOR TIMER BLOCKED"
                )
            }

            return
        }

        if(timerRunning){
            return
        }

        timerRunning = true

        handler.removeCallbacks(
            timerRunnable
        )

        handler.postDelayed(
            timerRunnable,
            1000
        )

        Log.d(
            "SynapauseMonitor",
            "Timer Started"
        )
    }

    private fun pauseTimer(){
        if(!timerRunning){
            return
        }

        handler.removeCallbacks(
            timerRunnable
        )

        timerRunning = false

        Log.d(
            "SynapauseMonitor",
            "Timer Paused"
        )
    }

    private fun resetTimer(){
        handler.removeCallbacks(
            timerRunnable
        )

        timerRunning = false
        timerSeconds = 0

        Log.d(
            "SynapauseMonitor",
            "MONITOR TIMER RESET"
        )
    }

    private fun restartTimerForCurrentApp() {
        if(!hasLoggedIn()){
            Log.d(
                "SynapauseMonitor",
                "MONITOR TIMER IDLE - USER LOGGED OUT"
            )
            return
        }

        val foregroundPackage = getFreshForegroundPackage()
        val monitored = isPackageMonitored(foregroundPackage)

        monitorSession.active = monitored
        monitorSession.appId = if(monitored){
            foregroundPackage
        }

        else{
            null
        }

        if(monitored){
            startTimer()

            Log.d(
                "SynapauseMonitor",
                "MONITOR TIMER RESTARTED"
            )
        } else {
            Log.d(
                "SynapauseMonitor",
                "MONITOR TIMER IDLE - FOREGROUND APP NOT MONITORED"
            )
        }
    }

    private fun isPackageMonitored(appId: String?): Boolean {
        val platform = MonitoredSiteConfig.resolvePlatform(appId)
            ?: return false

        return monitoredSiteConfig.isEnabled(platform)
    }

    private fun getFreshForegroundPackage(): String? {
        val foregroundPackage = currentForegroundPackage
            ?: return null
        if(!NativeRuntimePolicy.isForegroundEvidenceFresh(
            nowMs = System.currentTimeMillis(),
            evidenceAtMs = currentForegroundEvidenceAt,
            screenInteractive = isScreenInteractive(),
            usageAccessAvailable = hasUsageStatsAccess()
        )){
            return null
        }

        return foregroundPackage
    }

    private fun loadMonitoredSites() {
        val result = MonitoredSiteConfig.load(this)
        monitoredSiteConfig = result.snapshot

        if(result.repaired){
            Log.d(
                "SynapauseMonitor",
                "NATIVE MONITORED SITES DEFAULTED OR REPAIRED"
            )
        }

        Log.d(
            "SynapauseMonitor",
            monitoredSitesLog("NATIVE MONITORED SITES RESTORED")
        )
    }

    private fun reloadMonitoredSites() {
        val previousConfig = monitoredSiteConfig
        val result = MonitoredSiteConfig.load(this)
        val nextConfig = result.snapshot

        if(previousConfig == nextConfig){
            return
        }

        val trackedForegroundPackage = currentForegroundPackage
        val foregroundPlatform = MonitoredSiteConfig
            .resolvePlatform(trackedForegroundPackage)
        val wasMonitored = foregroundPlatform?.let { platform ->
            previousConfig.isEnabled(platform)
        } == true
        val isMonitored = foregroundPlatform?.let { platform ->
            nextConfig.isEnabled(platform)
        } == true

        monitoredSiteConfig = nextConfig

        Log.d(
            "SynapauseMonitor",
            monitoredSitesLog("NATIVE MONITORED SITES UPDATED")
        )

        if(QuizSession.isQuizRequired()){
            pauseTimer()
            Log.d(
                "SynapauseMonitor",
                "ACTIVE QUIZ PRESERVED DURING MONITORED-SITE UPDATE"
            )
            return
        }

        if(wasMonitored != isMonitored){
            resetTimer()
            updateTimerForCurrentApp(
                getFreshForegroundPackage()
            )
        }
    }

    private fun monitoredSitesLog(prefix: String): String {
        val values = monitoredSiteConfig.asMap()
            .entries
            .joinToString(",") { (key, enabled) ->
                "$key=$enabled"
            }

        return "$prefix: $values"
    }



    //=======OVERLAY=======//
    private fun renderNativeQuizSurface(
        snapshot: QuizSession.Snapshot,
        recoveryAttempt: Boolean = false
    ) {
        if (
            surfaceRecoveryScheduled &&
            surfaceRecoveryLifecycleId != snapshot.lifecycleId
        ) {
            cancelSurfaceRecovery()
        }

        if (surfaceRecoveryScheduled && !recoveryAttempt) {
            return
        }

        val result = overlayManager.render(snapshot)

        when (result) {
            OverlayManager.RenderResult.ATTACHED,
            OverlayManager.RenderResult.ALREADY_ATTACHED -> {
                if (lastSurfaceFailure != null) {
                    Log.d(
                        "SynapauseMonitor",
                        "NATIVE QUIZ SURFACE RECOVERED"
                    )
                }
                cancelSurfaceRecovery()
            }

            OverlayManager.RenderResult.NO_SURFACE_REQUIRED -> {
                cancelSurfaceRecovery()
            }

            OverlayManager.RenderResult.PERMISSION_MISSING,
            OverlayManager.RenderResult.ATTACH_FAILED,
            OverlayManager.RenderResult.DETACH_FAILED,
            OverlayManager.RenderResult.DESTROYED -> {
                if (lastSurfaceFailure != result) {
                    Log.e(
                        "SynapauseMonitor",
                        "NATIVE QUIZ SURFACE UNAVAILABLE: ${result.name}"
                    )
                }
                lastSurfaceFailure = result

                if (
                    snapshot.quizRequired &&
                    snapshot.active &&
                    snapshot.phase != QuizSession.Phase.IDLE &&
                    snapshot.phase != QuizSession.Phase.INITIALIZING
                ) {
                    scheduleSurfaceRecovery(snapshot.lifecycleId)
                }
            }
        }
    }

    private fun scheduleSurfaceRecovery(lifecycleId: Long) {
        if (
            surfaceRecoveryScheduled &&
            surfaceRecoveryLifecycleId != lifecycleId
        ) {
            handler.removeCallbacks(surfaceRecoveryRunnable)
            surfaceRecoveryScheduled = false
        }

        surfaceRecoveryLifecycleId = lifecycleId

        if (surfaceRecoveryScheduled) {
            return
        }

        surfaceRecoveryScheduled = true
        handler.postDelayed(
            surfaceRecoveryRunnable,
            SURFACE_RECOVERY_DELAY_MS
        )
    }

    private fun cancelSurfaceRecovery() {
        handler.removeCallbacks(surfaceRecoveryRunnable)
        surfaceRecoveryScheduled = false
        surfaceRecoveryLifecycleId = null
        lastSurfaceFailure = null
    }

    private fun scheduleCompletionRecovery(lifecycleId: Long) {
        pendingCompletionLifecycleId = lifecycleId

        if (completionRecoveryScheduled) {
            return
        }

        completionRecoveryScheduled = true
        handler.postDelayed(
            completionRecoveryRunnable,
            COMPLETION_RECOVERY_DELAY_MS
        )
    }

    private fun cancelCompletionRecovery() {
        handler.removeCallbacks(completionRecoveryRunnable)
        completionRecoveryScheduled = false
        pendingCompletionLifecycleId = null
    }

    private fun completeNativeBlockingQuiz(
        snapshot: QuizSession.Snapshot
    ) {
        if (!QuizSession.claimCompletedLifecycle(snapshot.lifecycleId)) {
            Log.d(
                "SynapauseMonitor",
                "NATIVE QUIZ COMPLETION ALREADY HANDLED"
            )
            return
        }

        if (!overlayManager.hide()) {
            QuizSession.releaseCompletedLifecycle(snapshot.lifecycleId)
            scheduleCompletionRecovery(snapshot.lifecycleId)
            Log.e(
                "SynapauseMonitor",
                "NATIVE QUIZ COMPLETION BLOCKED - OVERLAY STILL ATTACHED"
            )
            return
        }

        Log.d(
            "SynapauseMonitor",
            "OVERLAY HIDDEN"
        )

        if (!QuizSession.clearCompletedLifecycle(snapshot.lifecycleId)) {
            QuizSession.releaseCompletedLifecycle(snapshot.lifecycleId)
            scheduleCompletionRecovery(snapshot.lifecycleId)
            Log.e(
                "SynapauseMonitor",
                "NATIVE QUIZ COMPLETION BLOCKED - SESSION CLEAR REJECTED"
            )
            return
        }

        cancelCompletionRecovery()
        cancelSurfaceRecovery()

        lastQuizLockAppId = null
        Log.d(
            "SynapauseMonitor",
            "QUIZ OBLIGATION CLEARED"
        )

        resetTimer()

        if(!hasLoggedIn()){
            Log.d(
                "SynapauseMonitor",
                "MONITORING STOPPED - USER LOGGED OUT"
            )
            stopSelf()
            return
        }

        restartTimerForCurrentApp()
    }

    private fun startNativeBlockingQuiz(){
        QuizSession.startBlockingQuiz(
            currentUserId = getUserId().orEmpty(),
            currentUserName = getUsername().orEmpty()
        )

        Log.d(
            "SynapauseMonitor",
            "NATIVE BLOCKING QUIZ INITIALIZING"
        )
    }


    //=======USER=======//
    private fun loadUser(){
        clearRuntimeUser()

        val raw = try{
            prefs.getString(
                USER_PREFERENCES_KEY,
                null
            )
        }

        catch(_: Exception){
            clearInvalidPersistedUser()
            return
        }

        if(raw==null){
            return
        }

        try{
            if(raw.isBlank()){
                clearInvalidPersistedUser()
                return
            }

            val json = JSONObject(raw)
            val restoredId = getValidUserField(json, "id")
            val restoredUsername = getValidUserField(json, "username")
            val restoredEmail = getValidUserField(json, "email")

            if(
                restoredId == null ||
                restoredUsername == null ||
                restoredEmail == null
            ){
                clearInvalidPersistedUser()
                return
            }

            userId = restoredId
            username = restoredUsername
            email = restoredEmail
            isLoggedIn = true
        }

        catch(_: Exception){
            clearInvalidPersistedUser()
            return
        }

        Log.d(
            "SynapauseMonitor",
            "NATIVE USER RESTORED"
        )
    }

    private fun getValidUserField(
        json: JSONObject,
        key: String
    ): String? {
        if(
            !json.has(key) ||
            json.isNull(key)
        ){
            return null
        }

        val value = json.opt(key)

        return if(
            value is String &&
            value.isNotBlank()
        ){
            value
        }

        else{
            null
        }
    }

    private val surfaceRecoveryRunnable = object : Runnable {
        override fun run() {
            surfaceRecoveryScheduled = false
            val expectedLifecycleId = surfaceRecoveryLifecycleId
            surfaceRecoveryLifecycleId = null

            if (!QuizSession.isQuizRequired()) {
                lastSurfaceFailure = null
                return
            }

            val snapshot = QuizSession.getSnapshot()
            if (expectedLifecycleId != snapshot.lifecycleId) {
                lastSurfaceFailure = null
                return
            }

            renderNativeQuizSurface(
                snapshot,
                recoveryAttempt = true
            )
        }
    }

    private val completionRecoveryRunnable = object : Runnable {
        override fun run() {
            completionRecoveryScheduled = false
            val expectedLifecycleId = pendingCompletionLifecycleId ?: return
            val snapshot = QuizSession.getSnapshot()

            if (
                snapshot.lifecycleId != expectedLifecycleId ||
                snapshot.phase != QuizSession.Phase.COMPLETED ||
                !snapshot.quizRequired
            ) {
                pendingCompletionLifecycleId = null
                return
            }

            completeNativeBlockingQuiz(snapshot)
        }
    }

    private fun isValidUser(
        id: String,
        username: String,
        email: String
    ): Boolean {
        return id.isNotBlank() &&
            username.isNotBlank() &&
            email.isNotBlank()
    }

    private fun clearInvalidPersistedUser(){
        prefs.edit()
            .remove(USER_PREFERENCES_KEY)
            .apply()

        clearRuntimeUser()

        Log.e(
            "SynapauseMonitor",
            "INVALID NATIVE USER MIRROR CLEARED"
        )
    }

    private fun clearRuntimeUser(){
        userId = null
        username = null
        email = null
        isLoggedIn = false
    }

    private fun clearUser(){
        prefs.edit().remove(
            USER_PREFERENCES_KEY
        ).apply()

        clearRuntimeUser()

        Log.d(
            "SynapauseMonitor",
            "NATIVE USER CLEARED"
        )
    }

    private fun clearUserAfterLogout(){
        clearUser()
        resetTimer()

        if(QuizSession.isQuizRequired()){
            Log.d(
                "SynapauseMonitor",
                "ACTIVE QUIZ PRESERVED DURING LOGOUT"
            )
            return
        }

        monitorSession.active = false
        monitorSession.appId = null
        lastQuizLockAppId = null

        Log.d(
            "SynapauseMonitor",
            "MONITORING STOPPED - USER LOGGED OUT"
        )
        stopSelf()
    }

    private fun hasLoggedIn():Boolean{
        return isLoggedIn
    }

    private fun getUserId():String?{
        return userId
    }

    private fun getUsername():String?{
        return username
    }

    private fun getEmail():String?{
        return email
    }



    //=======QUIZ STATE=======//
    private fun hasActiveQuiz(): Boolean{
        return QuizSession.hasActiveQuiz()
    }

    private fun saveQuizState(
        state: MutableMap<String, Any?>
    ) {
        QuizSession.saveQuizState(state)

        Log.d(
            "SynapauseMonitor",
            "QUIZ STATE SAVED"
        )

        Log.d(
            "SynapauseMonitor",
            QuizSession.getQuizState().toString()
        )
    }

    private fun getQuizState():MutableMap<String, Any?>? {
        return QuizSession.getQuizState()
    }

    private fun clearQuizState() {
        Log.d(
            "SynapauseMonitor",
            "CLEAR QUIZ STATE"
        )

        QuizSession.clearQuizState()

        Log.d(
            "SynapauseMonitor",
            QuizSession.getQuizState().toString()
        )
    }



    //=======NOTIFICATION=======//
    private fun createNotificationChannel(){
        if(
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.O
        ){
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Synapause Monitoring",
                NotificationManager.IMPORTANCE_LOW
            )

            channel.description = "Synapause focus monitoring"

            val manager = getSystemService(
                NotificationManager::class.java
            )

            manager.createNotificationChannel(
                channel
            )
        }
    }
}
