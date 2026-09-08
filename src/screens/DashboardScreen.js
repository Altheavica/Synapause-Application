import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Animated,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {useFocusEffect} from "@react-navigation/native";
import Feather from "react-native-vector-icons/Feather";

import DashboardService from "../services/DashboardService";
import ProfileService from "../services/ProfileService";
import {
    COLORS,
    createDashboardStyles,
} from "../styles/DashboardStyle";
import {useTheme} from "../theme/ThemeContext";

function useDashboardStyles(){
    const {colors} = useTheme();

    return useMemo(
        ()=>createDashboardStyles(colors),
        [colors]
    );
}

function numberValue(value){
    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function clampPercent(value){
    return Math.min(
        100,
        Math.max(0, numberValue(value))
    );
}

function AnimatedMetric({
    value,
    suffix = "",
    decimals = 0,
    style,
}){
    const animatedValue = useRef(
        new Animated.Value(0)
    ).current;
    const [displayValue, setDisplayValue] =
        useState(0);

    useEffect(()=>{
        animatedValue.stopAnimation();
        animatedValue.setValue(0);

        const listener = animatedValue.addListener(
            ({value: nextValue})=>{
                setDisplayValue(nextValue);
            }
        );

        Animated.timing(
            animatedValue,
            {
                toValue: numberValue(value),
                duration: 900,
                useNativeDriver: false,
            }
        ).start();

        return ()=>{
            animatedValue.stopAnimation();
            animatedValue.removeListener(listener);
        };
    }, [animatedValue, value]);

    const formatted = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue);

    return(
        <Text style={style}>
            {formatted}{suffix}
        </Text>
    );
}

function StatRow({
    icon,
    label,
    value,
    suffix = "",
    decimals = 0,
    colorStyle,
    last = false,
}){
    const styles = useDashboardStyles();

    return(
        <View
            style={[
                styles.statRow,
                last && styles.statRowLast,
            ]}
        >
            <View style={styles.statLabel}>
                <Feather
                    name={icon}
                    size={18}
                    style={colorStyle}
                />
                <Text style={styles.statLabelText}>
                    {label}
                </Text>
            </View>

            <AnimatedMetric
                value={value}
                suffix={suffix}
                decimals={decimals}
                style={[
                    styles.statValue,
                    colorStyle,
                ]}
            />
        </View>
    );
}

function CategoryCard({
    title,
    accuracy,
    averageResponse,
    color,
}){
    const styles = useDashboardStyles();

    return(
        <View style={styles.categoryCard}>
            <View
                style={[
                    styles.circle,
                    {borderColor: color},
                ]}
            >
                <AnimatedMetric
                    value={accuracy}
                    suffix="%"
                    style={[
                        styles.circleValue,
                        {color},
                    ]}
                />
            </View>

            <View style={styles.categoryDetails}>
                <Text style={styles.categoryTitle}>
                    {title}
                </Text>
                <AnimatedMetric
                    value={averageResponse}
                    suffix=" ms"
                    style={styles.categoryResponse}
                />
            </View>
        </View>
    );
}

export default function DashboardScreen({navigation}){
    const styles = useDashboardStyles();

    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileVisible, setProfileVisible] =
        useState(false);

    const loadDashboard = useCallback(()=>{
        let active = true;

        setLoading(true);
        setError(null);

        DashboardService.loadDashboard()
        .then(result=>{
            if(!active){
                return;
            }

            if(!result.user){
                navigation.navigate("Home");
                return;
            }

            setUser(result.user);
            setAnalytics(result.analytics);
        })
        .catch(loadError=>{
            console.error(
                "Dashboard Load Error:",
                loadError
            );

            if(active){
                setError(
                    "Brain analytics gagal dimuat."
                );
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
    }, [navigation]);

    useFocusEffect(loadDashboard);

    const updateUser = nextUsername=>{
        setUser(current=>({
            ...(current || {}),
            username: nextUsername,
        }));
    };

    const updateEmail = nextEmail=>{
        setUser(current=>({
            ...(current || {}),
            email: nextEmail,
        }));
    };

    const {logout} = ProfileService({
        setProfileVisible,
        setSettingsVisible: ()=>{},
        setChangeVisible: ()=>{},
        setChangeSection: ()=>{},
        setUsername: updateUser,
        setEmail: updateEmail,
        updateNavbar: async ()=>{
            navigation.navigate("Home");
        },
    });

    function openHome(){
        setProfileVisible(false);
        navigation.navigate("Home");
    }

    function openHomePanel(panel){
        setProfileVisible(false);

        navigation.navigate(
            "Home",
            {
                dashboardAction: panel,
                dashboardActionId: Date.now(),
            }
        );
    }

    const overallAccuracy = clampPercent(
        analytics?.overallAccuracy
    );
    const categories = analytics?.category || {};

    return(
        <SafeAreaView style={styles.root}>
            <View style={styles.topbar}>
                <Text style={styles.logo}>
                    Synapause
                </Text>

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
                <Text style={styles.title}>
                    Brain Dashboard
                </Text>

                <Text style={styles.welcome}>
                    {user
                        ? "Welcome back, " + user.username
                        : "Loading..."}
                </Text>

                {loading && (
                    <View style={[styles.card, styles.loadingCard]}>
                        <ActivityIndicator
                            size="large"
                            color={COLORS.blue}
                        />
                        <Text style={styles.loadingText}>
                            Loading analytics...
                        </Text>
                    </View>
                )}

                {!loading && error && (
                    <View style={[styles.card, styles.loadingCard]}>
                        <Text style={styles.messageTitle}>
                            Dashboard Error
                        </Text>
                        <Text style={styles.messageText}>
                            {error}
                        </Text>
                    </View>
                )}

                {!loading && !error && analytics && (
                    <View style={styles.cards}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>
                                Brain Analytics
                            </Text>

                            <StatRow
                                icon="target"
                                label="Overall Accuracy"
                                value={analytics.overallAccuracy}
                                suffix="%"
                                decimals={1}
                                colorStyle={styles.valueBlue}
                            />

                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {width: overallAccuracy + "%"},
                                    ]}
                                />
                            </View>

                            <StatRow
                                icon="clock"
                                label="Average Response"
                                value={analytics.averageResponse}
                                suffix=" ms"
                                colorStyle={styles.valuePurple}
                            />
                            <StatRow
                                icon="activity"
                                label="Current Streak"
                                value={analytics.currentStreak}
                                colorStyle={styles.valueOrange}
                            />
                            <StatRow
                                icon="award"
                                label="Best Streak"
                                value={analytics.bestStreak}
                                colorStyle={styles.valueOrange}
                                last
                            />
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>
                                Category Analytics
                            </Text>

                            <View style={styles.categoryGrid}>
                                <CategoryCard
                                    title="Numeric"
                                    accuracy={categories.Numeric?.accuracy}
                                    averageResponse={categories.Numeric?.averageResponse}
                                    color={COLORS.blue}
                                />
                                <CategoryCard
                                    title="Visual"
                                    accuracy={categories.Visual?.accuracy}
                                    averageResponse={categories.Visual?.averageResponse}
                                    color={COLORS.purple}
                                />
                                <CategoryCard
                                    title="Stroop"
                                    accuracy={categories.Stroop?.accuracy}
                                    averageResponse={categories.Stroop?.averageResponse}
                                    color={COLORS.orange}
                                />
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>
                                Activity
                            </Text>

                            <StatRow
                                icon="clipboard"
                                label="Total Quiz"
                                value={analytics.totalQuiz}
                                colorStyle={styles.valuePurple}
                            />
                            <StatRow
                                icon="help-circle"
                                label="Total Question"
                                value={analytics.totalQuestion}
                                colorStyle={styles.valueBlue}
                            />
                            <StatRow
                                icon="check-circle"
                                label="Total Solved"
                                value={analytics.solved}
                                colorStyle={styles.valueGreen}
                            />
                            <StatRow
                                icon="refresh-cw"
                                label="Replacement"
                                value={analytics.replacement}
                                colorStyle={styles.valueOrange}
                                last
                            />
                        </View>
                    </View>
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
                            style={styles.closeButton}
                            onPress={()=>setProfileVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>
                                ×
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.profileTitle}>Account</Text>
                        <Text style={styles.profileUsername}>
                            {user?.username || ""}
                        </Text>
                        <Text style={styles.profileEmail}>
                            {user?.email || ""}
                        </Text>

                        <View style={styles.divider}/>

                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={openHome}
                        >
                            <Text style={styles.profileActionText}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.profileAction}
                            onPress={()=>{
                                setProfileVisible(false);
                                navigation.navigate("Settings");
                            }}
                        >
                            <Text style={styles.profileActionText}>Settings</Text>
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

                        <View style={styles.divider}/>

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
