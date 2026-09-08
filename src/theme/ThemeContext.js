import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {Appearance} from "react-native";

import SettingsService from "../services/SettingsService";

const LIGHT_COLORS = {
    background: "#f5f7fb",
    surface: "#ffffff",
    surface2: "#f8fafc",
    text: "#111827",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    accent: "#2563eb",
    header: "rgba(15,23,42,.55)",
};

const DARK_COLORS = {
    background: "#09090b",
    surface: "#18181b",
    surface2: "#27272a",
    text: "#fafafa",
    textSecondary: "#a1a1aa",
    border: "#3f3f46",
    accent: "#3b82f6",
    header: "rgba(15,23,42,.82)",
};

const ThemeContext = createContext({
    preference: "system",
    activeTheme: "light",
    colors: LIGHT_COLORS,
    setThemePreference: async ()=>{},
});

function getSystemTheme(){
    return Appearance.getColorScheme() === "dark"
        ? "dark"
        : "light";
}

export function ThemeProvider({children}){
    const [preference, setPreference] = useState("system");
    const [deviceTheme, setDeviceTheme] = useState(getSystemTheme);

    useEffect(()=>{
        let active = true;

        SettingsService.loadTheme()
        .then(savedTheme=>{
            if(active){
                setPreference(savedTheme);
            }
        })
        .catch(error=>{
            console.error(
                "Theme Restore Error:",
                error
            );
        });

        const subscription = Appearance.addChangeListener(
            ({colorScheme})=>{
                setDeviceTheme(
                    colorScheme === "dark"
                        ? "dark"
                        : "light"
                );
            }
        );

        return ()=>{
            active = false;
            subscription.remove();
        };
    }, []);

    const setThemePreference = useCallback(
        async theme=>{
            const savedTheme =
                await SettingsService.saveTheme(theme);

            setPreference(savedTheme);
        },
        []
    );

    const activeTheme = preference === "system"
        ? deviceTheme
        : preference;

    const value = useMemo(
        ()=>({
            preference,
            activeTheme,
            colors: activeTheme === "dark"
                ? DARK_COLORS
                : LIGHT_COLORS,
            setThemePreference,
        }),
        [
            activeTheme,
            preference,
            setThemePreference,
        ]
    );

    return(
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(){
    return useContext(ThemeContext);
}

export {
    DARK_COLORS,
    LIGHT_COLORS,
};
