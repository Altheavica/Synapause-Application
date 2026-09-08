import AsyncStorage from "@react-native-async-storage/async-storage";
import {NativeModules,} from "react-native";
import {getStoredUser} from "./StoredUserService";

const {ForegroundAppModule,} = NativeModules;

const THEME_KEY = "synapauseTheme";
const WEBSITE_KEY = "synapauseSites";

const THEMES = [
    "system",
    "light",
    "dark",
];

const DEFAULT_SITES = {
    youtube: true,
    instagram: true,
    tiktok: true,
    facebook: true,
    x: true,
    threads: true,
};

function normalizeTheme(theme){
    return THEMES.includes(theme)
        ? theme
        : "system";
}

function normalizeSites(sites){
    const source =
        sites &&
        typeof sites === "object" &&
        !Array.isArray(sites)
            ? sites
            : {};

    return Object.keys(DEFAULT_SITES).reduce(
        (result, site)=>({
            ...result,
            [site]: typeof source[site] === "boolean"
                ? source[site]
                : DEFAULT_SITES[site],
        }),
        {}
    );
}

function hasEnabledSite(sites){
    return Object.values(sites)
        .some(value=>value);
}

async function syncSitesToNative(sites){
    const normalizedSites = normalizeSites(sites);

    if(!hasEnabledSite(normalizedSites)){
        console.error(
            "Native Monitored Sites Sync Error:",
            "At least one monitored platform must remain enabled."
        );

        return false;
    }

    if(
        !ForegroundAppModule ||
        typeof ForegroundAppModule.updateMonitoredSites !== "function"
    ){
        console.error(
            "Native Monitored Sites Sync Error:",
            "ForegroundAppModule.updateMonitoredSites is unavailable."
        );

        return false;
    }

    try{
        await ForegroundAppModule
            .updateMonitoredSites(normalizedSites);

        console.log(
            "NATIVE MONITORED SITES SYNCED"
        );

        return true;
    }
    catch(error){
        console.error(
            "Native Monitored Sites Sync Error:",
            error
        );

        return false;
    }
}

async function getCurrentUser(){
    return getStoredUser();
}

async function loadTheme(){
    const storedTheme = await AsyncStorage.getItem(
        THEME_KEY
    );

    return normalizeTheme(storedTheme);
}

async function saveTheme(theme){
    const normalizedTheme = normalizeTheme(theme);

    await AsyncStorage.setItem(
        THEME_KEY,
        normalizedTheme
    );

    return normalizedTheme;
}

async function loadSites({syncNative = true} = {}){
    const storedSites = await AsyncStorage.getItem(
        WEBSITE_KEY
    );

    let parsedSites = null;

    if(storedSites){
        try{
            parsedSites = JSON.parse(storedSites);
        }
        catch(error){
            console.error(
                "Stored Site Settings Parse Error:",
                error
            );
        }
    }

    let normalizedSites = normalizeSites(parsedSites);

    if(!hasEnabledSite(normalizedSites)){
        normalizedSites = {...DEFAULT_SITES};
    }

    const normalizedJson = JSON.stringify(normalizedSites);

    if(storedSites !== normalizedJson){
        await AsyncStorage.setItem(
            WEBSITE_KEY,
            normalizedJson
        );
    }

    if(syncNative){
        await syncSitesToNative(normalizedSites);
    }

    return normalizedSites;
}

async function saveSites(sites){
    const normalizedSites = normalizeSites(sites);

    if(
        !hasEnabledSite(normalizedSites)
    ){
        throw new Error(
            "Minimal satu website harus aktif."
        );
    }

    await AsyncStorage.setItem(
        WEBSITE_KEY,
        JSON.stringify(normalizedSites)
    );

    await syncSitesToNative(normalizedSites);

    return normalizedSites;
}

export {
    DEFAULT_SITES,
    THEMES,
    THEME_KEY,
    WEBSITE_KEY,
    normalizeSites,
    syncSitesToNative,
};

export default {
    getCurrentUser,
    loadTheme,
    saveTheme,
    loadSites,
    saveSites,
};
