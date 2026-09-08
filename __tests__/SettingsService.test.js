import AsyncStorage from "@react-native-async-storage/async-storage";
import {NativeModules,} from "react-native";
import SettingsService, {
    DEFAULT_SITES,
    WEBSITE_KEY,
    normalizeSites,
    syncSitesToNative,
} from "../src/services/SettingsService";

jest.mock(
    "@react-native-async-storage/async-storage",
    ()=>require(
        "@react-native-async-storage/async-storage/jest"
    )
);

jest.mock(
    "react-native",
    ()=>({
        NativeModules: {
            ForegroundAppModule: {
                updateMonitoredSites: jest.fn(
                    ()=>Promise.resolve(true)
                ),
            },
        },
    })
);

describe("monitored-site settings", ()=>{
    beforeEach(async ()=>{
        await AsyncStorage.clear();
        jest.clearAllMocks();
    });

    test("uses six enabled defaults for missing or malformed shapes", ()=>{
        expect(normalizeSites(null)).toEqual(DEFAULT_SITES);
        expect(normalizeSites([])).toEqual(DEFAULT_SITES);
        expect(normalizeSites({youtube: "false"})).toEqual(DEFAULT_SITES);
    });

    test("migrates partial settings without disabling new platforms", ()=>{
        expect(
            normalizeSites({
                youtube: false,
                instagram: true,
                tiktok: false,
            })
        ).toEqual({
            youtube: false,
            instagram: true,
            tiktok: false,
            facebook: true,
            x: true,
            threads: true,
        });
    });

    test("repairs invalid JSON and persists canonical defaults", async ()=>{
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(()=>{});

        await AsyncStorage.setItem(WEBSITE_KEY, "{");

        await expect(
            SettingsService.loadSites({syncNative: false})
        ).resolves.toEqual(DEFAULT_SITES);
        await expect(
            AsyncStorage.getItem(WEBSITE_KEY)
        ).resolves.toBe(JSON.stringify(DEFAULT_SITES));

        consoleSpy.mockRestore();
    });

    test("prevents disabling every platform", async ()=>{
        const allDisabled = Object.keys(DEFAULT_SITES).reduce(
            (result, key)=>({
                ...result,
                [key]: false,
            }),
            {}
        );

        await expect(
            SettingsService.saveSites(allDisabled)
        ).rejects.toThrow("Minimal satu website harus aktif.");
    });

    test("persists and synchronizes an exact six-platform snapshot", async ()=>{
        const sites = {
            ...DEFAULT_SITES,
            youtube: false,
            x: false,
        };

        await expect(SettingsService.saveSites(sites))
            .resolves.toEqual(sites);
        await expect(AsyncStorage.getItem(WEBSITE_KEY))
            .resolves.toBe(JSON.stringify(sites));
        expect(
            NativeModules.ForegroundAppModule.updateMonitoredSites
        ).toHaveBeenCalledWith(sites);
    });

    test("cold-start load restores the persisted policy into the native mirror", async ()=>{
        const sites = {
            ...DEFAULT_SITES,
            instagram: false,
            threads: false,
        };
        await AsyncStorage.setItem(
            WEBSITE_KEY,
            JSON.stringify(sites)
        );

        await expect(SettingsService.loadSites()).resolves.toEqual(sites);

        expect(
            NativeModules.ForegroundAppModule.updateMonitoredSites
        ).toHaveBeenCalledTimes(1);
        expect(
            NativeModules.ForegroundAppModule.updateMonitoredSites
        ).toHaveBeenCalledWith(sites);
    });

    test("all-disabled persisted data is repaired to product defaults", async ()=>{
        const allDisabled = Object.keys(DEFAULT_SITES).reduce(
            (result, key)=>({...result, [key]: false}),
            {}
        );
        await AsyncStorage.setItem(
            WEBSITE_KEY,
            JSON.stringify(allDisabled)
        );

        await expect(
            SettingsService.loadSites({syncNative: false})
        ).resolves.toEqual(DEFAULT_SITES);
        await expect(AsyncStorage.getItem(WEBSITE_KEY))
            .resolves.toBe(JSON.stringify(DEFAULT_SITES));
    });

    test.each(Object.keys(DEFAULT_SITES))(
        "synchronizes the disabled state for %s",
        async site=>{
            const sites = {
                ...DEFAULT_SITES,
                [site]: false,
            };

            await expect(SettingsService.saveSites(sites))
                .resolves.toEqual(sites);
            expect(
                NativeModules.ForegroundAppModule.updateMonitoredSites
            ).toHaveBeenLastCalledWith(sites);
        }
    );

    test("native synchronization is idempotent for the same snapshot", async ()=>{
        await expect(syncSitesToNative(DEFAULT_SITES))
            .resolves.toBe(true);
        await expect(syncSitesToNative(DEFAULT_SITES))
            .resolves.toBe(true);
        expect(
            NativeModules.ForegroundAppModule.updateMonitoredSites
        ).toHaveBeenCalledTimes(2);
    });
});
