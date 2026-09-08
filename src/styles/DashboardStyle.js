import {Dimensions, StyleSheet} from "react-native";

const {width} = Dimensions.get("window");

const DEFAULT_COLORS = {
    background: "#f5f7fb",
    surface: "#ffffff",
    surfaceSecondary: "#f8fafc",
    text: "#111827",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    header: "rgba(15,23,42,.96)",
    blue: "#3b82f6",
    green: "#22c55e",
    orange: "#f59e0b",
    purple: "#8b5cf6",
};

export {DEFAULT_COLORS as COLORS};

export function createDashboardStyles(themeColors = DEFAULT_COLORS){
    const COLORS = {
        ...DEFAULT_COLORS,
        ...themeColors,
        surfaceSecondary:
            themeColors.surface2 ||
            DEFAULT_COLORS.surfaceSecondary,
    };

    return StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    topbar: {
        minHeight: 72,
        paddingHorizontal: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.header,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,.08)",
        zIndex: 20,
    },
    logo: {
        color: "#ffffff",
        fontSize: 24,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    accountButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
    },
    accountButtonText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "600",
    },
    content: {
        paddingHorizontal: width <= 480 ? 14 : 20,
        paddingTop: 28,
        paddingBottom: 40,
    },
    title: {
        color: COLORS.text,
        fontSize: width <= 480 ? 29 : 34,
        fontWeight: "700",
        letterSpacing: -0.8,
    },
    welcome: {
        marginTop: 6,
        marginBottom: 24,
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    cards: {
        gap: 20,
    },
    card: {
        width: "100%",
        padding: width <= 480 ? 18 : 22,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        elevation: 3,
        shadowColor: "#0f172a",
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.08,
        shadowRadius: 14,
    },
    cardTitle: {
        marginBottom: 12,
        color: COLORS.text,
        fontSize: 22,
        fontWeight: "600",
    },
    statRow: {
        minHeight: 55,
        paddingVertical: 13,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statRowLast: {
        borderBottomWidth: 0,
    },
    statLabel: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    statLabelText: {
        flexShrink: 1,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    statValue: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: "700",
    },
    progressTrack: {
        width: "100%",
        height: 6,
        marginTop: 8,
        marginBottom: 4,
        overflow: "hidden",
        backgroundColor: COLORS.border,
        borderRadius: 20,
    },
    progressFill: {
        height: "100%",
        backgroundColor: COLORS.blue,
        borderRadius: 20,
    },
    categoryGrid: {
        gap: 16,
    },
    categoryCard: {
        width: "100%",
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
        backgroundColor: COLORS.surfaceSecondary,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
    },
    circle: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 9,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.surface,
    },
    circleValue: {
        fontSize: 20,
        fontWeight: "700",
    },
    categoryDetails: {
        flex: 1,
    },
    categoryTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: "600",
    },
    categoryResponse: {
        marginTop: 8,
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    loadingCard: {
        minHeight: 220,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 14,
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    messageTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
    },
    messageText: {
        marginTop: 10,
        color: COLORS.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },
    profileBackdrop: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(15,23,42,.22)",
        zIndex: 90,
    },
    profilePanel: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: Math.min(340, width * 0.92),
        padding: 30,
        gap: 14,
        backgroundColor: COLORS.surface,
        borderLeftWidth: 1,
        borderLeftColor: COLORS.border,
        elevation: 18,
        shadowColor: "#0f172a",
        shadowOffset: {width: -2, height: 0},
        shadowOpacity: 0.12,
        shadowRadius: 15,
        zIndex: 100,
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 12,
        width: 42,
        height: 42,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2,
    },
    closeButtonText: {
        color: COLORS.text,
        fontSize: 28,
        fontWeight: "400",
    },
    profileTitle: {
        marginTop: 10,
        color: COLORS.text,
        fontSize: 26,
        fontWeight: "700",
    },
    profileUsername: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: "600",
    },
    profileEmail: {
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    divider: {
        height: 1,
        marginVertical: 4,
        backgroundColor: COLORS.border,
    },
    profileAction: {
        width: "100%",
        paddingVertical: 13,
        paddingHorizontal: 13,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.surfaceSecondary,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
    },
    profileActionText: {
        color: COLORS.text,
        fontSize: 15,
    },
    valueBlue: {color: COLORS.blue},
    valueGreen: {color: COLORS.green},
    valueOrange: {color: COLORS.orange},
    valuePurple: {color: COLORS.purple},
    });
}

export default createDashboardStyles();
