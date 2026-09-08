import React, {
    useCallback,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {useFocusEffect} from "@react-navigation/native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";

import ProfileService from "../services/ProfileService";
import SettingsService, {
    DEFAULT_SITES,
    THEMES,
} from "../services/SettingsService";
import {useTheme} from "../theme/ThemeContext";
import {createSettingsStyles} from "../styles/SettingsStyle";

const SITE_OPTIONS = [
    {
        key: "youtube",
        label: "YouTube",
        icon: "youtube",
        color: "#ff0000",
    },
    {
        key: "instagram",
        label: "Instagram",
        icon: "instagram",
        color: "#e4405f",
    },
    {
        key: "tiktok",
        label: "TikTok",
        icon: "tiktok",
    },
    {
        key: "facebook",
        label: "Facebook",
        icon: "facebook",
        color: "#0866ff",
    },
    {
        key: "x",
        label: "X",
        icon: "x-twitter",
    },
    {
        key: "threads",
        label: "Threads",
        icon: "threads",
    },
];

const THEME_LABELS = {
    system: "System",
    light: "Light",
    dark: "Dark",
};

export default function SettingsScreen({navigation}){
    const {
        activeTheme,
        colors,
        preference,
        setThemePreference,
    } = useTheme();
    const styles = useMemo(
        ()=>createSettingsStyles(colors),
        [colors]
    );

    const [user, setUser] = useState(null);
    const [sites, setSites] = useState(DEFAULT_SITES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileVisible, setProfileVisible] = useState(false);

    useFocusEffect(
        useCallback(()=>{
            let active = true;

            setLoading(true);
            setError(null);

            Promise.all([
                SettingsService.getCurrentUser(),
                SettingsService.loadSites(),
            ])
            .then(([storedUser, storedSites])=>{
                if(!active){
                    return;
                }

                setUser(storedUser);
                setSites(storedSites);
            })
            .catch(loadError=>{
                console.error(
                    "Settings Load Error:",
                    loadError
                );

                if(active){
                    setError("Settings gagal dimuat.");
                }
            })
            .finally(()=>{
                if(active){
                    setLoading(false);
                }
            });

            return ()=>{
                active = false;
            };
        }, [])
    );

    const updateUsername = nextUsername=>{
        setUser(current=>(
            current
                ? {...current, username: nextUsername}
                : current
        ));
    };

    const updateEmail = nextEmail=>{
        setUser(current=>(
            current
                ? {...current, email: nextEmail}
                : current
        ));
    };

    const {logout} = ProfileService({
        setProfileVisible,
        setSettingsVisible: ()=>{},
        setChangeVisible: ()=>{},
        setChangeSection: ()=>{},
        setUsername: updateUsername,
        setEmail: updateEmail,
        updateNavbar: async ()=>{
            navigation.navigate("Home");
        },
    });

    function openHomePanel(action){
        setProfileVisible(false);

        navigation.navigate(
            "Home",
            {
                dashboardAction: action,
                dashboardActionId: Date.now(),
            }
        );
    }

    async function changeTheme(theme){
        try{
            await setThemePreference(theme);
        }
        catch(themeError){
            console.error(
                "Theme Save Error:",
                themeError
            );

            Alert.alert("Settings gagal disimpan.");
        }
    }

    async function changeSite(site, enabled){
        const nextSites = {
            ...sites,
            [site]: enabled,
        };

        try{
            const savedSites =
                await SettingsService.saveSites(nextSites);

            setSites(savedSites);
        }
        catch(siteError){
            if(
                siteError.message ===
                "Minimal satu website harus aktif."
            ){
                Alert.alert(siteError.message);
                return;
            }

            console.error(
                "Site Settings Save Error:",
                siteError
            );

            Alert.alert("Settings gagal disimpan.");
        }
    }

    return(
        <SafeAreaView style={styles.root}>
            <StatusBar
                barStyle={
                    activeTheme === "dark"
                        ? "light-content"
                        : "dark-content"
                }
                backgroundColor={colors.background}
            />

            <View style={styles.topbar}>
                <Text style={styles.logo}>Synapause</Text>

                <TouchableOpacity
                    style={styles.accountButton}
                    onPress={()=>setProfileVisible(true)}
                >
                    <Text style={styles.accountButtonText}>
                        Account
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={()=>navigation.goBack()}
                    accessibilityLabel="Close Settings"
                >
                    <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>

                <Text style={styles.settingsTitle}>Settings</Text>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={colors.accent}
                        />
                    </View>
                )}

                {!loading && error && (
                    <Text style={styles.errorText}>{error}</Text>
                )}

                {!loading && !error && (
                    <>
                        <View style={styles.settingsSection}>
                            <Text style={styles.sectionTitle}>
                                Appearance
                            </Text>

                            {THEMES.map(theme=>(
                                <TouchableOpacity
                                    key={theme}
                                    style={styles.settingButton}
                                    onPress={()=>changeTheme(theme)}
                                    accessibilityState={{
                                        selected: preference === theme,
                                    }}
                                >
                                    <Text style={styles.settingButtonText}>
                                        {THEME_LABELS[theme]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider}/>

                        <View style={styles.settingsSection}>
                            <Text style={styles.sectionTitle}>
                                Website Monitoring
                            </Text>

                            <View style={styles.monitorList}>
                                {SITE_OPTIONS.map(site=>(
                                    <View
                                        key={site.key}
                                        style={styles.monitorItem}
                                    >
                                        <FontAwesome6
                                            name={site.icon}
                                            brand
                                            size={24}
                                            color={site.color || colors.text}
                                            style={styles.monitorIcon}
                                        />
                                        <Text style={styles.monitorText}>
                                            {site.label}
                                        </Text>
                                        <Switch
                                            value={Boolean(sites[site.key])}
                                            onValueChange={enabled=>
                                                changeSite(site.key, enabled)
                                            }
                                            trackColor={{
                                                false: colors.border,
                                                true: colors.accent,
                                            }}
                                            thumbColor="#ffffff"
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.divider}/>

                        <View style={styles.settingsSection}>
                            <Text style={styles.sectionTitle}>
                                Personalize
                            </Text>
                            <Text style={styles.comingSoon}>
                                Coming Soon
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>

            {profileVisible && (
                <>
                    <TouchableOpacity
                        style={styles.profileBackdrop}
                        activeOpacity={1}
                        onPress={()=>setProfileVisible(false)}
                    />

                    <View style={styles.profilePanel}>
                        <TouchableOpacity
                            style={styles.profileCloseButton}
                            onPress={()=>setProfileVisible(false)}
                        >
                            <Text style={styles.profileCloseText}>×</Text>
                        </TouchableOpacity>

                        <Text style={styles.profileTitle}>Account</Text>
                        <Text style={styles.profileUsername}>
                            {user?.username || ""}
                        </Text>
                        <Text style={styles.profileEmail}>
                            {user?.email || ""}
                        </Text>

                        <View style={styles.profileDivider}/>

                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={()=>navigation.navigate("Home")}
                        >
                            <Text style={styles.profileActionText}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={()=>navigation.navigate("Dashboard")}
                        >
                            <Text style={styles.profileActionText}>
                                Dashboard
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={()=>openHomePanel("username")}
                        >
                            <Text style={styles.profileActionText}>
                                Change Username
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={()=>openHomePanel("email")}
                        >
                            <Text style={styles.profileActionText}>
                                Change Email
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={()=>openHomePanel("password")}
                        >
                            <Text style={styles.profileActionText}>
                                Change Password
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.profileDivider}/>

                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={logout}
                        >
                            <Text style={styles.profileActionText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}
