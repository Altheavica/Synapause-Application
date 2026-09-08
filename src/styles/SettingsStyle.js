import {Dimensions, StyleSheet} from "react-native";

const {width} = Dimensions.get("window");

const DEFAULT_COLORS = {
    surface: "#ffffff",
    surface2: "#f8fafc",
    text: "#111827",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    accent: "#2563eb",
    header: "rgba(15,23,42,.55)",
    background: "#f8fafc",
};

export function createSettingsStyles(themeColors = DEFAULT_COLORS){
    const colors = {
        ...DEFAULT_COLORS,
        ...themeColors,
    };

    return StyleSheet.create({
    root:{
        flex:1,
        backgroundColor:colors.background,
    },

    topbar:{
        minHeight:72,
        paddingHorizontal:20,
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
        backgroundColor:colors.header,
        borderBottomWidth:1,
        borderBottomColor:"rgba(255,255,255,.08)",
        zIndex:20,
    },

    logo:{
        color:"#ffffff",
        fontSize:24,
        fontWeight:"700",
        letterSpacing:-0.5,
    },

    accountButton:{
        paddingVertical:10,
        paddingHorizontal:15,
        borderRadius:12,
        backgroundColor:colors.surface,
    },

    accountButtonText:{
        color:colors.text,
        fontSize:14,
        fontWeight:"600",
    },

    content:{
        width:"100%",
        maxWidth:520,
        alignSelf:"center",
        paddingHorizontal:width<=480?14:20,
        paddingTop:22,
        paddingBottom:40,
    },

    closeButton:{
        alignSelf:"flex-end",
        width:42,
        height:42,
        justifyContent:"center",
        alignItems:"center",
    },

    closeButtonText:{
        color:colors.text,
        fontSize:28,
        fontWeight:"400",
    },
    /* ==========================
            OVERLAY
    ========================== */
    settingsOverlay:{
        position:"absolute",
        top:0,
        right:0,
        bottom:0,
        left:0,
        justifyContent:"center",
        alignItems:"center",
        backgroundColor:"rgba(0,0,0,.45)",
        padding:20,
        zIndex:99999,
    },



    /* ==========================
            POPUP
    ========================== */
    settingsPopup:{
        width:"92%",
        maxWidth:520,
        backgroundColor:colors.surface,
        borderWidth:1,
        borderColor:colors.border,
        borderRadius:24,
        padding:30,
        maxHeight:"90%",
        elevation:12,
        shadowColor:"#000",
        shadowOffset:{
            width:0,
            height:8,
        },
        shadowOpacity:0.18,
        shadowRadius:18,
    },

    settingsScroll:{
        flexGrow:0,
    },

    popupCloseButton:{
        alignSelf:"flex-end",
        paddingHorizontal:4,
        paddingVertical:2,
    },

    popupCloseText:{
        fontSize:28,
        color:colors.text,
        fontWeight:"400",
    },

    settingsTitle:{
        fontSize:22,
        fontWeight:"800",
        color:colors.text,
        marginTop:-8,
    },



    /* ==========================
            SECTION
    ========================== */
    settingsSection:{
        marginTop:22,
    },

    sectionTitle:{
        fontSize:18,
        fontWeight:"800",
        color:colors.text,
        marginBottom:10,
    },

    settingButton:{
        width:"100%",
        marginTop:10,
        paddingVertical:13,
        borderRadius:12,
        backgroundColor:colors.surface2,
        justifyContent:"center",
        alignItems:"center",
    },

    settingButtonText:{
        fontSize:16,
        color:colors.text,
    },

    divider:{
        height:1,
        backgroundColor:colors.border,
        marginVertical:22,
    },



    /* ==========================
            MONITOR
    ========================== */
    monitorList:{
        marginTop:15,
    },

    monitorItem:{
        flexDirection:"row",
        alignItems:"center",
        padding:14,
        marginBottom:12,
        borderRadius:14,
        backgroundColor:colors.surface2,
        borderWidth:1,
        borderColor:colors.border,
    },

    monitorIcon:{
        width:24,
        marginRight:15,
        textAlign:"center",
    },

    monitorText:{
        flex:1,
        fontSize:16,
        color:colors.text,
    },

    comingSoon:{
        fontSize:16,
        color:colors.textSecondary,
    }
    ,

    loadingContainer:{
        minHeight:220,
        justifyContent:"center",
        alignItems:"center",
    },

    errorText:{
        marginTop:30,
        color:colors.textSecondary,
        fontSize:15,
        lineHeight:22,
        textAlign:"center",
    },

    profileBackdrop:{
        position:"absolute",
        top:0,
        right:0,
        bottom:0,
        left:0,
        backgroundColor:"rgba(15,23,42,.22)",
        zIndex:90,
    },

    profilePanel:{
        position:"absolute",
        top:0,
        right:0,
        bottom:0,
        width:Math.min(340,width*0.92),
        padding:30,
        gap:14,
        backgroundColor:colors.surface,
        borderLeftWidth:1,
        borderLeftColor:colors.border,
        elevation:18,
        shadowColor:"#0f172a",
        shadowOffset:{width:-2,height:0},
        shadowOpacity:0.12,
        shadowRadius:15,
        zIndex:100,
    },

    profileCloseButton:{
        position:"absolute",
        top:10,
        right:12,
        width:42,
        height:42,
        justifyContent:"center",
        alignItems:"center",
        zIndex:2,
    },

    profileCloseText:{
        color:colors.text,
        fontSize:28,
        fontWeight:"400",
    },

    profileTitle:{
        marginTop:10,
        color:colors.text,
        fontSize:26,
        fontWeight:"700",
    },

    profileUsername:{
        color:colors.text,
        fontSize:18,
        fontWeight:"600",
    },

    profileEmail:{
        color:colors.textSecondary,
        fontSize:15,
    },

    profileDivider:{
        height:1,
        marginVertical:4,
        backgroundColor:colors.border,
    },

    profileAction:{
        width:"100%",
        paddingVertical:13,
        paddingHorizontal:13,
        justifyContent:"center",
        alignItems:"center",
        backgroundColor:colors.surface2,
        borderWidth:1,
        borderColor:colors.border,
        borderRadius:12,
    },

    profileActionText:{
        color:colors.text,
        fontSize:15,
    },
    });
}

export default createSettingsStyles();
