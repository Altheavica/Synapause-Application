import { StyleSheet, Dimensions, StatusBar } from "react-native";

const { width, height } = Dimensions.get("window");
const DEFAULT_COLORS = {
    bg: "#f5f7fb",
    surface: "#ffffff",
    surface2: "#f8fafc",
    text: "#111827",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    accent: "#2563eb",
    white: "#ffffff",
    dark: "#0f172a",
    header: "rgba(15,23,42,.55)",
    background: "#f8fafc",
    primary: "#2563eb",
};

export function createGlobalStyles(themeColors = DEFAULT_COLORS){
    const COLORS = {
        ...DEFAULT_COLORS,
        ...themeColors,
        bg: themeColors.background || DEFAULT_COLORS.bg,
        primary: themeColors.accent || DEFAULT_COLORS.primary,
    };

    return StyleSheet.create({
    /* ======================================================
                            GLOBAL
    ====================================================== */
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    keyboardContainer: {
        flex: 1,
    },

    scrollContainer: {
        flexGrow: 1,
        backgroundColor:COLORS.background,
    },

    page: {
        flex: 1,
    },



    /* ======================================================
                            HEADER
    ====================================================== */
    header: {
        position: "absolute",
        top: StatusBar.currentHeight || 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 72,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.header,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,.08)",
    },

    navigation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
        flexShrink: 0,
    },

    logo: {
        color: COLORS.white,
        fontSize: 26,
        fontWeight: "700",
        letterSpacing: -.5,
    },

    desktopMenu: {
        display: "none",
    },

    navLink: {
        color: COLORS.white,
        fontSize: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },

    activeLink: {
        color: COLORS.white,
        fontSize: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,.08)",
    },

    signUp: {
        color: COLORS.white,
        fontSize: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },

    menu: {
        padding: 15,
    },

    menuIcon: {
        color: COLORS.white,
        fontSize: 36,
        fontWeight: "400",
        paddingVertical: 6,
    },

    dropdown: {
        position: "absolute",
        top: 72,
        right: 16,
        width: 280,
        backgroundColor: "#121212",
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,.08)",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 15,
        },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 18,
        zIndex: 9999,
    },

    mobileMenu: {
        width: "100%",
    },

    mobileMenuButton: {
        paddingVertical: 16,
        paddingHorizontal: 18,
        margin: 4,
        borderRadius: 12,
        justifyContent: "center",
    },

    mobileActiveButton: {
        backgroundColor: "rgba(255,255,255,.08)",
    },

    mobileMenuText: {
        color: "#ffffff",
        fontSize: 16,
    },

    mobileActiveText: {
        color: "#ffffff",
        fontSize: 16,
    },

    mobileDivider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,.08)",
        marginHorizontal: 15,
        marginVertical: 8,
    },



    /* ======================================================
                            HERO
    ====================================================== */
    parallax: {
        flex:1,
        minHeight:760,
        paddingHorizontal:24,
        paddingTop:140,
        paddingBottom:90,
        justifyContent:"center",
        alignItems:"center",
        overflow:"hidden",
    },

    parallaxGlow: {
        position: "absolute",
        width: 320,
        height: 320,
        borderRadius: 160,
        top: -120,
        right: -80,
        backgroundColor: "rgba(59,130,246,.12)",
        opacity: .9,
    },

    parallaxPattern: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: .03,
    },

    parallaxTitle: {
        color: "#ffffff",
        fontSize: 48,
        fontWeight: "800",
        letterSpacing: -2,
        textAlign: "center",
        lineHeight: 52,
        zIndex: 5,
    },

    parallaxDescription: {
        marginTop: 24,
        width: "92%",
        maxWidth: 700,
        color: "rgba(255,255,255,.72)",
        textAlign: "center",
        fontSize: 17,
        lineHeight: 31,
        zIndex: 5,
    },

    exploreButton: {
        marginTop: 34,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 14,
        backgroundColor: "#ffffff",
        shadowColor: "#ffffff",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: .08,
        shadowRadius: 24,
        elevation: 5,
        zIndex: 5,
    },

    exploreButtonText: {
        color: "#111111",
        fontSize: 15,
        fontWeight: "600",
    },



    /* ======================================================
                            PROFILE PANEL
    ====================================================== */
    profilePanel: {
        position: "absolute",
        top: -(StatusBar.currentHeight || 0),
        right: 0,
        width: Math.min(340, width * 0.92),
        height: height + (StatusBar.currentHeight || 0),
        backgroundColor: COLORS.surface,
        borderLeftWidth: 1,
        borderLeftColor: COLORS.border,
        padding: 30,
        flexDirection: "column",
        gap: 14,
        zIndex: 99999,
        shadowColor: "#0f172a",
        shadowOffset: {
            width: -2,
            height: 0,
        },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 18,
    },

    closeButton: {
        position: "absolute",
        right: 18,
        top: 12,
        fontSize: 28,
        color: COLORS.text,
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
        backgroundColor: COLORS.border,
        marginVertical: 4,
    },

    profileButton: {
        width: "100%",
        paddingVertical: 13,
        paddingHorizontal: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: COLORS.surface2,
        justifyContent: "center",
        alignItems: "center",
    },

    profileButtonText: {
        color: COLORS.text,
        fontSize: 15,
    },

    logoutButton: {
        width: "100%",
        paddingVertical: 13,
        paddingHorizontal: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: COLORS.surface2,
        justifyContent: "center",
        alignItems: "center",
    },



    /* ======================================================
                        LOADING BUTTON
    ====================================================== */
    buttonDisabled: {
        opacity: 0.75,
    },

    loadingButton: {
        opacity: 0.75,
    },

    loadingContent: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },

    loadingSpinner: {
        marginLeft: 10,
    },



    /* ======================================================
                            TOAST
    ====================================================== */
    toast: {
        position: "absolute",
        top: (StatusBar.currentHeight || 0) + 24,
        right: 24,
        minWidth: 280,
        maxWidth: 360,
        paddingVertical: 15,
        paddingHorizontal: 18,
        borderRadius: 14,
        justifyContent: "center",
        zIndex: 999999,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 15,
    },

    toastText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "500",
    },


        
    /* ======================================================
                        POPUP DESIGN SYSTEM
    ====================================================== */
    /* =======Overlay======= */
    loginOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,.55)",
        zIndex: 9999,
    },

    changeOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,.55)",
        zIndex: 99999,
    },

    /* =======POPUP CONTAINER======= */
    loginPopup: {
        width: Math.min(420, width * 0.92),
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 32,
        flexDirection: "column",
        gap: 18,
        position: "relative",
        shadowColor: "#0f172a",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 12,
    },

    registerPopup: {
        width: Math.min(420, width * 0.92),
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 32,
        flexDirection: "column",
        gap: 18,
        position: "relative",
        shadowColor: "#0f172a",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 12,
    },

    forgotPopup: {
        width: Math.min(420, width * 0.92),
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 32,
        flexDirection: "column",
        gap: 18,
        position: "relative",
        shadowColor: "#0f172a",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 12,
    },

    changePopup: {
        width: Math.min(420, width * 0.92),
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 32,
        flexDirection: "column",
        gap: 18,
        position: "relative",
        shadowColor: "#0f172a",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 12,
    },

    /* =======TYPOGRAPHY======= */
    popupTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: COLORS.text,
        textAlign: "center",
    },

    popupDescription: {
        fontSize: 15,
        lineHeight: 24,
        color: COLORS.textSecondary,
        textAlign: "center",
    },

    popupLink: {
        color: COLORS.primary,
        fontWeight: "600",
        textAlign: "center",
    },

    /* =======INPUT SYSTEM======= */
    input: {
        width: "100%",
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: COLORS.text,
    },

    inputFocused: {
        borderColor: COLORS.primary,
    },

    passwordBox: {
        position: "relative",
        width: "100%",
        justifyContent: "center",
    },

    eyeButton: {
        position: "absolute",
        right: 16,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },

    togglePasswordText: {
        fontSize: 18,
    },

    /* =======STEP SYSTEM======= */
    registerStep: {
        width: "100%",
        gap: 16,
    },

    forgotStep: {
        width: "100%",
        gap: 16,
    },

    changeStep: {
        width: "100%",
        gap: 16,
    },

    changeSection: {
        width: "100%",
        gap: 18,
    },

    /* =======CLOSE BUTTON======= */
    popupCloseButton: {
        position: "absolute",
        top: 18,
        right: 18,
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 18,
    },

    popupCloseText: {
        fontSize: 24,
        fontWeight: "400",
        color: COLORS.textSecondary,
        lineHeight: 28,
    },

    /* =======PRIMARY BUTTON======= */
    primaryButton: {
        width: "100%",
        height: 52,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },

    primaryButtonPressed: {
        opacity: 0.9,
    },

    primaryButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    }
    });
}

export default createGlobalStyles();
