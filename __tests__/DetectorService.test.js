function loadDetector({
    usageGranted = true,
    overlayGranted = true,
    notificationGranted = true,
} = {}){
    jest.resetModules();

    const foreground = {
        hasOverlayPermission: jest.fn().mockResolvedValue(overlayGranted),
        requestOverlayPermission: jest.fn().mockResolvedValue(undefined),
        startMonitoring: jest.fn().mockResolvedValue(true),
    };
    const permissions = {
        PERMISSIONS: {POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS"},
        RESULTS: {GRANTED: "granted"},
        check: jest.fn().mockResolvedValue(notificationGranted),
        request: jest.fn().mockResolvedValue(
            notificationGranted ? "granted" : "denied"
        ),
    };
    const usage = {
        hasUsagePermission: jest.fn().mockResolvedValue(usageGranted),
        openUsagePermissionSettings: jest.fn().mockResolvedValue(undefined),
    };

    jest.doMock("react-native", ()=>(
        {
            NativeModules: {ForegroundAppModule: foreground},
            PermissionsAndroid: permissions,
            Platform: {OS: "android", Version: 36},
        }
    ));
    jest.doMock(
        "@sahil_sensei/react-native-app-usage",
        ()=>usage
    );

    return {
        detector: require("../src/services/DetectorService").default,
        foreground,
        permissions,
        usage,
    };
}

describe("native monitoring start coordinator", ()=>{
    test("starts exactly once after all readiness checks pass", async ()=>{
        const {detector, foreground} = loadDetector();

        await expect(detector.start()).resolves.toBe(true);
        await expect(detector.start()).resolves.toBe(true);

        expect(foreground.startMonitoring).toHaveBeenCalledTimes(1);
    });

    test("concurrent callers share one native start operation", async ()=>{
        const {detector, foreground} = loadDetector();

        const first = detector.start();
        const second = detector.start();

        await expect(Promise.all([first, second]))
            .resolves.toEqual([true, true]);
        expect(foreground.startMonitoring).toHaveBeenCalledTimes(1);
    });

    test("missing usage access requests settings once and cannot start", async ()=>{
        const {detector, foreground, usage} = loadDetector({usageGranted: false});

        await expect(detector.start()).resolves.toBe(false);
        await expect(detector.start()).resolves.toBe(false);

        expect(usage.openUsagePermissionSettings).toHaveBeenCalledTimes(1);
        expect(foreground.startMonitoring).not.toHaveBeenCalled();
    });

    test("missing overlay permission requests it once and cannot start", async ()=>{
        const {detector, foreground} = loadDetector({overlayGranted: false});

        await expect(detector.start()).resolves.toBe(false);
        await expect(detector.start()).resolves.toBe(false);

        expect(foreground.requestOverlayPermission).toHaveBeenCalledTimes(1);
        expect(foreground.startMonitoring).not.toHaveBeenCalled();
    });

    test("notification denial remains non-blocking for foreground monitoring", async ()=>{
        const {detector, foreground} = loadDetector({notificationGranted: false});
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation(()=>{});

        await expect(detector.start()).resolves.toBe(true);

        expect(foreground.startMonitoring).toHaveBeenCalledTimes(1);
        consoleSpy.mockRestore();
    });

    test("cancelled pending readiness is not resumed by AppState", async ()=>{
        const {detector, foreground} = loadDetector({usageGranted: false});

        await detector.start();
        detector.cancelPendingStart();
        await expect(detector.resumePendingStart()).resolves.toBe(false);

        expect(foreground.startMonitoring).not.toHaveBeenCalled();
    });
});
