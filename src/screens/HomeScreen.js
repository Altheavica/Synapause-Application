import React, {useEffect, useMemo, useState} from "react";
import LinearGradient from "react-native-linear-gradient";

import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';

import {createGlobalStyles} from "../styles/GlobalStyle";
import GlobalService from "../services/GlobalService";
import LoginService from "../services/LoginService";
import NavigationService from "../services/NavigationService";
import ProfileService from "../services/ProfileService";
import ChangeService from "../services/ChangeService";
import {useTheme} from "../theme/ThemeContext";

export default function HomeScreen({navigation, route}) {
    const {colors} = useTheme();
    const styles = useMemo(
        ()=>createGlobalStyles(colors),
        [colors]
    );

    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [profileVisible, setProfileVisible] = useState(false);
    const [loginVisible, setLoginVisible] = useState(false);
    const [loginPopupVisible, setLoginPopupVisible] = useState(true);
    const [registerPopupVisible, setRegisterPopupVisible] = useState(false);
    const [forgotPopupVisible, setForgotPopupVisible] = useState(false);
    const [changeVisible, setChangeVisible] = useState(false);
    const [changeSection, setChangeSection] = useState("username");
    const [toastVisible, setToastVisible] = useState(false);

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginPasswordSecure, setLoginPasswordSecure] = useState(true);
    const [loginPasswordIcon, setLoginPasswordIcon] = useState("👁");
    const [loginEmailFocused, setLoginEmailFocused] = useState(false);
    const [loginPasswordFocused, setLoginPasswordFocused] = useState(false);
    const [loginDisabled, setLoginDisabled] = useState(false);
    const [loginText, setLoginText] = useState("Login");

    const [registerStep, setRegisterStep] = useState(1);
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerOTP, setRegisterOTP] = useState('');
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
    const [passwordWarning, setPasswordWarning] = useState('');
    const [registerPasswordSecure, setRegisterPasswordSecure] = useState(true);
    const [registerPasswordIcon, setRegisterPasswordIcon] = useState("👁");
    const [registerConfirmSecure, setRegisterConfirmSecure] = useState(true);
    const [registerConfirmIcon, setRegisterConfirmIcon] = useState("👁");
    const [registerUsernameFocused, setRegisterUsernameFocused] = useState(false);
    const [registerEmailFocused, setRegisterEmailFocused] = useState(false);
    const [registerOTPFocused, setRegisterOTPFocused] = useState(false);
    const [registerPasswordFocused, setRegisterPasswordFocused] = useState(false);
    const [registerConfirmFocused, setRegisterConfirmFocused] = useState(false);
    const [registerEmailDisabled, setRegisterEmailDisabled] = useState(false);
    const [registerEmailText, setRegisterEmailText] = useState("Continue");
    const [registerOTPDisabled, setRegisterOTPDisabled] = useState(false);
    const [registerOTPText, setRegisterOTPText] = useState("Verify OTP");
    const [registerDisabled, setRegisterDisabled] = useState(false);
    const [registerText, setRegisterText] = useState("Register");

    const [forgotStep, setForgotStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOTP, setForgotOTP] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [forgotPasswordSecure, setForgotPasswordSecure] = useState(true);
    const [forgotPasswordIcon, setForgotPasswordIcon] = useState("👁");
    const [forgotConfirmSecure, setForgotConfirmSecure] = useState(true);
    const [forgotConfirmIcon, setForgotConfirmIcon] = useState("👁");
    const [forgotEmailFocused, setForgotEmailFocused] = useState(false);
    const [forgotOTPFocused, setForgotOTPFocused] = useState(false);
    const [forgotNewPasswordFocused, setNewforgotPasswordFocused] = useState(false);
    const [forgotConfirmFocused, setforgotConfirmFocused] = useState(false);
    const [forgotEmailDisabled, setForgotEmailDisabled] = useState(false);
    const [forgotEmailText, setForgotEmailText] = useState("Continue");
    const [forgotOTPDisabled, setForgotOTPDisabled] = useState(false);
    const [forgotOTPText, setForgotOTPText] = useState("Verify OTP");
    const [resetPasswordDisabled, setResetPasswordDisabled] = useState(false);
    const [resetPasswordText, setResetPasswordText] = useState("Reset Password");

    const [changeUsernameStep, setChangeUsernameStep] = useState(1);
    const [changeUsernamePassword, setChangeUsernamePassword] = useState('');
    const [changeUsernameInput, setChangeUsernameInput] = useState('');
    const [changeUsernameSecure, setChangeUsernameSecure] = useState(true);
    const [changeUsernameIcon, setChangeUsernameIcon] = useState("👁");
    const [changeUsernameContinueDisabled, setChangeUsernameContinueDisabled] = useState(false);
    const [changeUsernameContinueText, setChangeUsernameContinueText] = useState("Continue");
    const [changeUsernameSaveDisabled, setChangeUsernameSaveDisabled] = useState(false);
    const [changeUsernameSaveText, setChangeUsernameSaveText] = useState("Save Username");
    const [changeUsernameFocused, setChangeUsernameFocused] = useState(false);
    
    const [changeEmailStep, setChangeEmailStep] = useState(1);
    const [changeEmailPassword, setChangeEmailPassword] = useState('');
    const [changeEmailInput, setChangeEmailInput] = useState('');
    const [changeEmailOTP, setChangeEmailOTP] = useState('');
    const [changeEmailSecure, setChangeEmailSecure] = useState(true);
    const [changeEmailIcon, setChangeEmailIcon] = useState("👁");
    const [changeEmailContinueDisabled, setChangeEmailContinueDisabled] = useState(false);
    const [changeEmailContinueText, setChangeEmailContinueText] = useState("Continue");
    const [changeEmailSendDisabled, setChangeEmailSendDisabled] = useState(false);
    const [changeEmailSendText, setChangeEmailSendText] = useState("Send OTP");
    const [changeEmailVerifyDisabled, setChangeEmailVerifyDisabled] = useState(false);
    const [changeEmailVerifyText, setChangeEmailVerifyText] = useState("Verify OTP");
    const [changeEmailFocused, setChangeEmailFocused] = useState(false);

    const [changePasswordStep, setChangePasswordStep] = useState(1);
    const [changeOldPassword, setChangeOldPassword] = useState('');
    const [changeNewPassword, setChangeNewPassword] = useState('');
    const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
    const [changePasswordWarning, setChangePasswordWarning] = useState('');
    const [changeOldPasswordSecure, setChangeOldPasswordSecure] = useState(true);
    const [changeOldPasswordIcon, setChangeOldPasswordIcon] = useState("👁");
    const [changeNewPasswordSecure, setChangeNewPasswordSecure] = useState(true);
    const [changeNewPasswordIcon, setChangeNewPasswordIcon] = useState("👁");
    const [changeConfirmPasswordSecure, setChangeConfirmPasswordSecure] = useState(true);
    const [changeConfirmPasswordIcon, setChangeConfirmPasswordIcon] = useState("👁");
    const [changePasswordContinueDisabled, setChangePasswordContinueDisabled] = useState(false);
    const [changePasswordContinueText, setChangePasswordContinueText] = useState("Continue");
    const [changePasswordSaveDisabled, setChangePasswordSaveDisabled] = useState(false);
    const [changePasswordSaveText, setChangePasswordSaveText] = useState("Save Password");
    const [changePasswordFocused, setChangePasswordFocused] = useState(false);
    const [changeConfirmFocused, setChangeConfirmFocused] = useState(false);

    const [toastMessage, setToastMessage] = useState('');
    const [toastColor, setToastColor] = useState("#22c55e");

    const [username, setUsername] = useState("Sign Up");
    const [email, setEmail] = useState("");

    const {
        API_URL,
        switchStep,
        setLoading,
        clearLoading,
        showSuccess,
        showError,
        onlyNumber,
        togglePassword,
    } = GlobalService({
        toastMessage,
        setToastMessage,
        toastVisible,
        setToastVisible,
        toastColor,
        setToastColor,
    });

    const {
        updateNavbar,
        toggleDropdown,
        closeDropdown,
        openAccount,
        mobileSignUp,
    } = NavigationService({
        dropdownVisible,
        setDropdownVisible,
        profileVisible,
        setProfileVisible,
        setLoginVisible,
        username,
        setUsername,
        email,
        setEmail,
    });

    const {
        checkPassword,
        loginUser,
        closeLoginOverlay,
        closeLogin,
        openForgot,
        openRegister,
        closeRegister,
        continueEmail,
        registerOtpInput,
        registerOtpSubmit,
        verifyOTP,
        continueUsername,
        registerUser,
        closeForgot,
        forgotContinue,
        backToLogin,
        forgotOtpInput,
        forgotOtpSubmit,
        verifyResetOTP,
        resetPassword,
    } = LoginService({
        // Login
        loginIdentifier,
        loginPassword,
        setLoginIdentifier,
        setLoginPassword,
        setLoginVisible,
        setLoginPopupVisible,
        setProfileVisible,
        updateNavbar,
        setLoginDisabled,
        setLoginText,

        // Register
        registerEmail,
        registerOTP,
        registerUsername,
        registerPassword,
        registerConfirmPassword,
        setRegisterPopupVisible,
        setRegisterStep,
        setPasswordWarning,
        setRegisterEmail,
        setRegisterOTP,
        setRegisterUsername,
        setRegisterPassword,
        setRegisterConfirmPassword,
        setRegisterEmailDisabled,
        setRegisterEmailText,
        setRegisterOTPDisabled,
        setRegisterOTPText,
        setRegisterDisabled,
        setRegisterText,

        // Forgot
        forgotStep,
        forgotEmail,
        forgotOTP,
        forgotNewPassword,
        forgotConfirmPassword,
        setForgotStep,
        setForgotPopupVisible,
        setForgotEmail,
        setForgotOTP,
        setForgotNewPassword,
        setForgotConfirmPassword,
        setForgotEmailDisabled,
        setForgotEmailText,
        setForgotOTPDisabled,
        setForgotOTPText,
        setResetPasswordDisabled,
        setResetPasswordText,

        // Toast
        toastMessage,
        setToastMessage,
        toastVisible,
        setToastVisible,
        toastColor,
        setToastColor,
    });

    const {
        closeProfile,
        openSettings,
        openChangeUsername,
        openChangeEmail,
        openChangePassword,
        logout,
    } = ProfileService({
        setProfileVisible,
        setSettingsVisible: ()=>navigation.navigate("Settings"),
        setChangeVisible,
        setChangeSection,
        setUsername,
        setEmail,
        updateNavbar,
    });

    const{
        openChangeSection,
        checkChangePassword,
        closeChange,
        changeUsernameSubmit,
        continueChangeUsername,
        saveUsername,
        changeEmailSubmit,
        continueChangeEmail,
        changeEmailSendSubmit,
        sendChangeEmailOTP,
        changeEmailOtpInput,
        changeEmailVerifySubmit,
        verifyChangeEmailOTP,
        changePasswordSubmit,
        continueChangePassword,
        changePasswordSaveSubmit,
        savePassword,
    } = ChangeService({
        // Change Overlay
        setChangeVisible,
        setUsername,
        updateNavbar,

        // Change Username
        changeUsernamePassword,
        changeUsernameInput,
        setChangeUsernameContinueDisabled,
        setChangeUsernameContinueText,
        setChangeUsernameSaveDisabled,
        setChangeUsernameSaveText,
        setChangeUsernameStep,
        setChangeUsernamePassword,
        setChangeUsernameInput,

        // Change Email
        changeEmailPassword,
        changeEmailInput,
        changeEmailOTP,
        setEmail,
        setChangeEmailContinueDisabled,
        setChangeEmailContinueText,
        setChangeEmailSendDisabled,
        setChangeEmailSendText,
        setChangeEmailVerifyDisabled,
        setChangeEmailVerifyText,
        setChangeEmailStep,
        setChangeEmailPassword,
        setChangeEmailInput,
        setChangeEmailOTP,

        // Change Password
        changeOldPassword,
        changeNewPassword,
        changeConfirmPassword,
        setChangePasswordContinueDisabled,
        setChangePasswordContinueText,
        setChangePasswordSaveDisabled,
        setChangePasswordSaveText,
        setChangePasswordStep,
        setChangeOldPassword,
        setChangeNewPassword,
        setChangeConfirmPassword,
        setChangePasswordWarning,

        // Toast
        toastMessage,
        setToastMessage,
        toastVisible,
        setToastVisible,
        toastColor,
        setToastColor,
    });

    useEffect(() => {
        updateNavbar();
        // Account restore is intentionally performed once at bootstrap.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(()=>{
        const action =
            route?.params?.dashboardAction;

        if(!action){
            return;
        }

        setDropdownVisible(false);
        setProfileVisible(false);

        if(action === "settings"){
            navigation.navigate("Settings");
        }

        else if(
            action === "username" ||
            action === "email" ||
            action === "password"
        ){
            setChangeSection(action);
            setChangeVisible(true);
        }

        navigation.setParams({
            dashboardAction: undefined,
            dashboardActionId: undefined,
        });
    }, [
        navigation,
        route?.params?.dashboardAction,
        route?.params?.dashboardActionId,
    ]);

    console.log("HomeScreen rendered");

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS==="ios"?"padding":"height"}>
                <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    {/*==========HEADER==========*/}
                    <View style={styles.header}>
                        <Text style={styles.logo}>Synapause</Text>
                        <View style={styles.navigation}>
                            <View style={styles.desktopMenu}>
                                <TouchableOpacity>
                                    <Text style={styles.activeLink}>Home</Text>
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    <Text style={styles.navLink}>Contact Us</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => openAccount()}>
                                    <Text style={styles.signUp}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => toggleDropdown()}>
                                <Text style={styles.menuIcon}>☰</Text>
                            </TouchableOpacity>
                        </View>
                        {profileVisible && (
                            <View style={styles.profilePanel}>
                                <TouchableOpacity onPress={() => closeProfile()}>
                                    <Text style={styles.closeButton}>×</Text>
                                </TouchableOpacity>
                                <Text style={styles.profileTitle}>Account</Text>
                                <Text style={styles.profileUsername}>{username}</Text>
                                <Text style={styles.profileEmail}>{email}</Text>
                                <View style={styles.divider}/>
                                <TouchableOpacity
                                    style={styles.profileButton}
                                    onPress={() => {
                                        setProfileVisible(false);
                                        navigation.navigate("Dashboard");
                                    }}
                                >
                                    <Text style={styles.profileButtonText}>Dashboard</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.profileButton} onPress={() => openSettings()}>
                                    <Text style={styles.profileButtonText}>Settings</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.profileButton} onPress={() => openChangeUsername()}>
                                    <Text style={styles.profileButtonText}>Change Username</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.profileButton} onPress={() => openChangeEmail()}>
                                    <Text style={styles.profileButtonText}>Change Email</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.profileButton} onPress={() => openChangePassword()}>
                                    <Text style={styles.profileButtonText}>Change Password</Text>
                                </TouchableOpacity>
                                <View style={styles.divider}/>
                                <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
                                    <Text style={styles.profileButtonText}>Logout</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    {/*==========DROPDOWN==========*/}
                    {dropdownVisible && (
                        <View style={styles.dropdown}>
                            <View style={styles.mobileMenu}>
                                <TouchableOpacity style={[
                                        styles.mobileMenuButton,
                                        styles.mobileActiveButton
                                ]}>
                                    <Text style={styles.mobileActiveText}>Home</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.mobileMenuButton}>
                                    <Text style={styles.mobileMenuText}>Contact Us</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.mobileMenuButton}
                                    onPress={() => mobileSignUp()}
                                >
                                    <Text style={styles.mobileMenuText}>{username}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {/*==========PARALLAX==========*/}
                    <LinearGradient
                        colors={["#0f172a","#111827"]}
                        start={{x:0,y:0}}
                        end={{x:0,y:1}}
                        style={styles.parallax}
                    >
                        <View style={styles.parallaxGlow}/>
                        <View style={styles.parallaxPattern}/>
                        <Text style={styles.parallaxTitle}>
                            SYNAPAUSE
                        </Text>
                        <Text style={styles.parallaxDescription}>
                            Train your focus. Strengthen your cognition.
                            Build healthier digital habits through adaptive
                            brain challenges.
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreButton}
                            onPress={()=>{}}
                        >
                            <Text style={styles.exploreButtonText}>Explore More</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                    {/*==========CHANGE==========*/}
                    {changeVisible && (
                        <View style={styles.changeOverlay}>
                            <View style={styles.changePopup}>
                                <TouchableOpacity style={styles.popupCloseButton} onPress={() => closeChange()}>
                                    <Text style={styles.popupCloseText}>×</Text>
                                </TouchableOpacity>
                                {/*Change Username*/}
                                {changeSection === "username" && (
                                    <View style={styles.changeSection}>
                                        <Text style={styles.popupTitle}>Change Username</Text>
                                        {changeUsernameStep === 1 && (
                                            <View style={styles.changeStep}>
                                                <View style={styles.passwordBox}>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            changeUsernameFocused && styles.inputFocused,
                                                        ]}
                                                        onFocus={() => setChangeUsernameFocused(true)}
                                                        onBlur={() => setChangeUsernameFocused(false)}
                                                        placeholder="Current Password"
                                                        value={changeUsernamePassword}
                                                        onSubmitEditing={changeUsernameSubmit}
                                                        onChangeText={setChangeUsernamePassword}
                                                        secureTextEntry={changeUsernameSecure}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.eyeButton}
                                                        onPress={() =>
                                                            togglePassword(
                                                                changeUsernameSecure,
                                                                setChangeUsernameSecure,
                                                                setChangeUsernameIcon
                                                            )
                                                        }>
                                                        <Text style={styles.togglePasswordText}>{changeUsernameIcon}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changeUsernameContinueDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changeUsernameContinueDisabled}
                                                    onPress={() => continueChangeUsername()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changeUsernameContinueText}</Text>
                                                        {changeUsernameContinueDisabled && (
                                                            <ActivityIndicator
                                                                size="small"
                                                                color="#ffffff"
                                                                style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        {changeUsernameStep === 2 && (
                                            <View style={styles.changeStep}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        changeUsernameFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setChangeUsernameFocused(true)}
                                                    onBlur={() => setChangeUsernameFocused(false)}
                                                    placeholder="New Username"
                                                    value={changeUsernameInput}
                                                    onSubmitEditing={saveUsername}
                                                    onChangeText={setChangeUsernameInput}
                                                />
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changeUsernameSaveDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changeUsernameSaveDisabled}
                                                    onPress={() => saveUsername()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changeUsernameSaveText}</Text>
                                                        {changeUsernameSaveDisabled && (
                                                            <ActivityIndicator
                                                            size="small"
                                                            color="#ffffff"
                                                            style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                                {/*Change Email*/}
                                {changeSection === "email" && (
                                    <View style={styles.changeSection}>
                                        <Text style={styles.popupTitle}>Change Email</Text>
                                        {changeEmailStep === 1 && (
                                            <View style={styles.changeStep}>
                                                <View style={styles.passwordBox}>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            changeEmailFocused && styles.inputFocused,
                                                        ]}
                                                        onFocus={() => setChangeEmailFocused(true)}
                                                        onBlur={() => setChangeEmailFocused(false)}
                                                        placeholder="Current Password"
                                                        value={changeEmailPassword}
                                                        onSubmitEditing={changeEmailSubmit}
                                                        onChangeText={setChangeEmailPassword}
                                                        secureTextEntry={changeEmailSecure}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.eyeButton}
                                                        onPress={() =>
                                                            togglePassword(
                                                                changeEmailSecure,
                                                                setChangeEmailSecure,
                                                                setChangeEmailIcon
                                                            )
                                                        }>
                                                        <Text style={styles.togglePasswordText}>{changeEmailIcon}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changeEmailContinueDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changeEmailContinueDisabled}
                                                    onPress={() => continueChangeEmail()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changeEmailContinueText}</Text>
                                                        {changeEmailContinueDisabled && (
                                                            <ActivityIndicator
                                                            size="small"
                                                            color="#ffffff"
                                                            style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                        </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        {changeEmailStep === 2 && (
                                            <View style={styles.changeStep}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        changeEmailFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setChangeEmailFocused(true)}
                                                    onBlur={() => setChangeEmailFocused(false)}
                                                    placeholder="New Email"
                                                    value={changeEmailInput}
                                                    onSubmitEditing={changeEmailSendSubmit}
                                                    onChangeText={setChangeEmailInput}
                                                />
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changeEmailSendDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changeEmailSendDisabled}
                                                    onPress={() => sendChangeEmailOTP()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changeEmailSendText}</Text>
                                                        {changeEmailSendDisabled && (
                                                            <ActivityIndicator
                                                            size="small"
                                                            color="#ffffff"
                                                            style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        {changeEmailStep === 3 && (
                                            <View style={styles.changeStep}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        changeEmailFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setChangeEmailFocused(true)}
                                                    onBlur={() => setChangeEmailFocused(false)}
                                                    placeholder="Verification Code"
                                                    value={changeEmailOTP}
                                                    onSubmitEditing={changeEmailVerifySubmit}
                                                    onChangeText={(text)=>{setChangeEmailOTP(changeEmailOtpInput(text));}}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                />
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changeEmailVerifyDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changeEmailVerifyDisabled}
                                                    onPress={() => verifyChangeEmailOTP()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changeEmailVerifyText}</Text>
                                                        {changeEmailVerifyDisabled && (
                                                            <ActivityIndicator
                                                            size="small"
                                                            color="#ffffff"
                                                            style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                                {/*Change Password*/}
                                {changeSection === "password" && (
                                    <View style={styles.changeSection}>
                                        <Text style={styles.popupTitle}>Change Password</Text>
                                        {changePasswordStep === 1 && (
                                            <View style={styles.changeStep}>
                                                <View style={styles.passwordBox}>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            changePasswordFocused && styles.inputFocused,
                                                        ]}
                                                        onFocus={() => setChangePasswordFocused(true)}
                                                        onBlur={() => setChangePasswordFocused(false)}
                                                        placeholder="Current Password"
                                                        value={changeOldPassword}
                                                        onSubmitEditing={changePasswordSubmit}
                                                        onChangeText={setChangeOldPassword}
                                                        secureTextEntry={changeOldPasswordSecure}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.eyeButton}
                                                        onPress={() =>
                                                            togglePassword(
                                                                changeOldPasswordSecure,
                                                                setChangeOldPasswordSecure,
                                                                setChangeOldPasswordIcon,
                                                                setChangePasswordWarning
                                                            )
                                                        }>
                                                        <Text style={styles.togglePasswordText}>{changeOldPasswordIcon}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changePasswordContinueDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changePasswordContinueDisabled}
                                                    onPress={() => continueChangePassword()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changePasswordContinueText}</Text>
                                                        {changePasswordContinueDisabled && (
                                                            <ActivityIndicator
                                                            size="small"
                                                            color="#ffffff"
                                                            style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        {changePasswordStep === 2 && (
                                            <View style={styles.changeStep}>
                                                <View style={styles.passwordBox}>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            changeConfirmFocused && styles.inputFocused,
                                                        ]}
                                                        onFocus={() => setChangeConfirmFocused(true)}
                                                        onBlur={() => setChangeConfirmFocused(false)}
                                                        placeholder="New Password"
                                                        value={changeNewPassword}
                                                        onChangeText={(text)=>{
                                                            setChangeNewPassword(text);
                                                            checkChangePassword();
                                                        }}
                                                        secureTextEntry={changeNewPasswordSecure}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.eyeButton}
                                                        onPress={() =>
                                                            togglePassword(
                                                                changeNewPasswordSecure,
                                                                setChangeNewPasswordSecure,
                                                                setChangeNewPasswordIcon
                                                            )
                                                        }>
                                                        <Text style={styles.togglePasswordText}>{changeNewPasswordIcon}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.passwordBox}>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            changeConfirmFocused && styles.inputFocused,
                                                        ]}
                                                        onFocus={() => setChangeConfirmFocused(true)}
                                                        onBlur={() => setChangeConfirmFocused(false)}
                                                        placeholder="Confirm Password"
                                                        value={changeConfirmPassword}
                                                        onSubmitEditing={changePasswordSaveSubmit}
                                                        onChangeText={(text)=>{
                                                            setChangeConfirmPassword(text);
                                                            checkChangePassword();
                                                        }}
                                                        secureTextEntry={changeConfirmPasswordSecure}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.eyeButton}
                                                        onPress={() =>
                                                            togglePassword(
                                                                changeConfirmPasswordSecure,
                                                                setChangeConfirmPasswordSecure,
                                                                setChangeConfirmPasswordIcon
                                                            )
                                                        }>
                                                        <Text style={styles.togglePasswordText}>{changeConfirmPasswordIcon}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={styles.warningText}>{changePasswordWarning}</Text>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.primaryButton,
                                                        changePasswordSaveDisabled &&
                                                        styles.loadingButton,
                                                    ]}
                                                    disabled={changePasswordSaveDisabled}
                                                    onPress={() => savePassword()}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={styles.loadingContent}>
                                                        <Text style={styles.primaryButtonText}>{changePasswordSaveText}</Text>
                                                        {changePasswordSaveDisabled && (
                                                            <ActivityIndicator
                                                            size="small"
                                                            color="#ffffff"
                                                            style={styles.loadingSpinner}
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                    {/*==========LOGIN OVERLAY==========*/}
                    {loginVisible && (
                        <View style={styles.loginOverlay}>
                            {/*Login Popup*/}
                            {loginPopupVisible && (
                                <View style={styles.loginPopup}>
                                    <TouchableOpacity style={styles.popupCloseButton} onPress={() => closeLogin()}>
                                        <Text style={styles.popupCloseText}>×</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.popupTitle}>Login</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            loginEmailFocused && styles.inputFocused,
                                        ]}
                                        onFocus={() => setLoginEmailFocused(true)}
                                        onBlur={() => setLoginEmailFocused(false)}
                                        placeholder="Username or Email"
                                        value={loginIdentifier}
                                        onChangeText={setLoginIdentifier}
                                    />
                                    <View style={styles.passwordBox}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                loginPasswordFocused && styles.inputFocused,
                                            ]}
                                            onFocus={() => setLoginPasswordFocused(true)}
                                            onBlur={() => setLoginPasswordFocused(false)}
                                            placeholder="Password"
                                            value={loginPassword}
                                            onChangeText={setLoginPassword}
                                            secureTextEntry={loginPasswordSecure}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeButton}
                                            onPress={() =>
                                                togglePassword(
                                                    loginPasswordSecure,
                                                    setLoginPasswordSecure,
                                                    setLoginPasswordIcon
                                                )
                                            }>
                                            <Text style={styles.togglePasswordText}>{loginPasswordIcon}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.primaryButton,
                                            loginDisabled && styles.loadingButton,
                                        ]}
                                        disabled={loginDisabled}
                                        onPress={() => loginUser()}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.loadingContent}>
                                            <Text style={styles.primaryButtonText}>{loginText}</Text>
                                            {loginDisabled && (
                                                <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openForgot()}>
                                        <Text style={styles.popupLink}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                    <View style={styles.inlineText}>
                                        <Text style={styles.popupDescription}>Don't have an account?</Text>
                                        <TouchableOpacity onPress={() => openRegister()}>
                                            <Text style={styles.popupLink}>Register</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            {/*Register Popup*/}
                            {registerPopupVisible && (
                                <View style={styles.registerPopup}>
                                    <TouchableOpacity style={styles.popupCloseButton} onPress={() => {closeRegister()}}>
                                        <Text style={styles.popupCloseText}>×</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.popupTitle}>Register</Text>
                                    {registerStep === 1 && (
                                        <View style={styles.registerStep}>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    registerEmailFocused && styles.inputFocused,
                                                ]}
                                                onFocus={() => setRegisterEmailFocused(true)}
                                                onBlur={() => setRegisterEmailFocused(false)}
                                                placeholder="Email"
                                                value={registerEmail}
                                                onChangeText={setRegisterEmail}
                                            />
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    registerEmailDisabled && styles.loadingButton,
                                                ]}
                                                disabled={registerEmailDisabled}
                                                onPress={() => continueEmail()}
                                                activeOpacity={0.9}
                                            >
                                                <View style={styles.loadingContent}>
                                                    <Text style={styles.primaryButtonText}>{registerEmailText}</Text>
                                                    {registerEmailDisabled && (
                                                        <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {registerStep === 2 && (
                                        <View style={styles.registerStep}>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    registerOTPFocused && styles.inputFocused,
                                                ]}
                                                onFocus={() => setRegisterOTPFocused(true)}
                                                onBlur={() => setRegisterOTPFocused(false)}
                                                placeholder="Verification Code"
                                                value={registerOTP}
                                                onChangeText={(text)=>{setRegisterOTP(registerOtpInput(text));}}
                                                onSubmitEditing={registerOtpSubmit}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                            />
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    registerOTPDisabled && styles.loadingButton,
                                                ]}
                                                disabled={registerOTPDisabled}
                                                onPress={() => verifyOTP()}
                                                activeOpacity={0.9}
                                            >
                                                <View style={styles.loadingContent}>
                                                    <Text style={styles.primaryButtonText}>{registerOTPText}</Text>
                                                    {registerOTPDisabled && (
                                                        <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {registerStep === 3 && (
                                        <View style={styles.registerStep}>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    registerUsernameFocused && styles.inputFocused,
                                                ]}
                                                onFocus={() => setRegisterUsernameFocused(true)}
                                                onBlur={() => setRegisterUsernameFocused(false)}
                                                placeholder="Username"
                                                value={registerUsername}
                                                onChangeText={setRegisterUsername}
                                            />
                                            <TouchableOpacity
                                                style={styles.primaryButton}
                                                onPress={() => continueUsername()}
                                                activeOpacity={0.9}
                                            >
                                                <Text style={styles.primaryButtonText}>Continue</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {registerStep === 4 && (
                                        <View style={styles.registerStep}>
                                            <View style={styles.passwordBox}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        registerPasswordFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setRegisterPasswordFocused(true)}
                                                    onBlur={() => setRegisterPasswordFocused(false)}
                                                    placeholder="Password"
                                                    value={registerPassword}
                                                    onChangeText={(text)=>{
                                                        setRegisterPassword(text);
                                                        checkPassword();
                                                    }}
                                                    secureTextEntry={registerPasswordSecure}
                                                />
                                                <TouchableOpacity
                                                    style={styles.eyeButton}
                                                    onPress={() =>
                                                        togglePassword(
                                                            registerPasswordSecure,
                                                            setRegisterPasswordSecure,
                                                            setRegisterPasswordIcon
                                                        )
                                                    }>
                                                    <Text style={styles.togglePasswordText}>{registerPasswordIcon}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.passwordBox}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        registerConfirmFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setRegisterConfirmFocused(true)}
                                                    onBlur={() => setRegisterConfirmFocused(false)}
                                                    placeholder="Confirm Password"
                                                    value={registerConfirmPassword}
                                                    onChangeText={(text)=>{
                                                        setRegisterConfirmPassword(text);
                                                        checkPassword();
                                                    }}
                                                    secureTextEntry={registerConfirmSecure}
                                                />
                                                <TouchableOpacity
                                                    style={styles.eyeButton}
                                                    onPress={() =>
                                                        togglePassword(
                                                            registerConfirmSecure,
                                                            setRegisterConfirmSecure,
                                                            setRegisterConfirmIcon
                                                        )
                                                    }>
                                                    <Text style={styles.togglePasswordText}>{registerConfirmIcon}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.warningText}>{passwordWarning}</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    registerDisabled && styles.loadingButton,
                                                ]}
                                                disabled={registerDisabled}
                                                onPress={() => registerUser()}
                                                activeOpacity={0.9}
                                            >
                                                <View style={styles.loadingContent}>
                                                    <Text style={styles.primaryButtonText}>{registerText}</Text>
                                                    {registerDisabled && (
                                                        <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                            {/*Forgot Password*/}
                            {forgotPopupVisible && (
                                <View style={styles.forgotPopup}>
                                    <TouchableOpacity style={styles.popupCloseButton} onPress={() => closeForgot()}>
                                        <Text style={styles.popupCloseText}>×</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.popupTitle}>Forgot Password</Text>
                                    {forgotStep === 1 && (
                                        <View style={styles.forgotStep}>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    forgotEmailFocused && styles.inputFocused,
                                                ]}
                                                onFocus={() => setForgotEmailFocused(true)}
                                                onBlur={() => setForgotEmailFocused(false)}
                                                placeholder="Email"
                                                value={forgotEmail}
                                                onChangeText={setForgotEmail}
                                            />
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    forgotEmailDisabled && styles.loadingButton,
                                                ]}
                                                disabled={forgotEmailDisabled}
                                                onPress={() => forgotContinue()}
                                                activeOpacity={0.9}
                                            >
                                                <View style={styles.loadingContent}>
                                                    <Text style={styles.primaryButtonText}>{forgotEmailText}</Text>
                                                    {forgotEmailDisabled && (
                                                        <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => backToLogin()}>
                                                <Text style={styles.popupLink}>Back to Login</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {forgotStep === 2 && (
                                        <View style={styles.forgotStep}>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    forgotOTPFocused && styles.inputFocused,
                                                ]}
                                                onFocus={() => setForgotOTPFocused(true)}
                                                onBlur={() => setForgotOTPFocused(false)}
                                                placeholder="Verification Code"
                                                value={forgotOTP}
                                                onChangeText={(text)=>{setForgotOTP(forgotOtpInput(text));}}
                                                onSubmitEditing={forgotOtpSubmit}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                            />
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    forgotOTPDisabled && styles.loadingButton,
                                                ]}
                                                disabled={forgotOTPDisabled}
                                                onPress={() => verifyResetOTP()}
                                                activeOpacity={0.9}    
                                            >
                                                <View style={styles.loadingContent}>
                                                    <Text style={styles.primaryButtonText}>{forgotOTPText}</Text>
                                                    {forgotOTPDisabled && (
                                                        <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {forgotStep === 3 && (
                                        <View style={styles.forgotStep}>
                                            <View style={styles.passwordBox}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        forgotNewPasswordFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setNewforgotPasswordFocused(true)}
                                                    onBlur={() => setNewforgotPasswordFocused(false)}
                                                    placeholder="New Password"
                                                    value={forgotNewPassword}
                                                    onChangeText={setForgotNewPassword}
                                                    secureTextEntry={forgotPasswordSecure}
                                                />
                                                <TouchableOpacity
                                                    style={styles.eyeButton}
                                                    onPress={() =>
                                                        togglePassword(
                                                            forgotPasswordSecure,
                                                            setForgotPasswordSecure,
                                                            setForgotPasswordIcon
                                                        )
                                                    }>
                                                    <Text style={styles.togglePasswordText}>{forgotPasswordIcon}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.passwordBox}>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        forgotConfirmFocused && styles.inputFocused,
                                                    ]}
                                                    onFocus={() => setforgotConfirmFocused(true)}
                                                    onBlur={() => setforgotConfirmFocused(false)}
                                                    placeholder="Confirm Password"
                                                    value={forgotConfirmPassword}
                                                    onChangeText={setForgotConfirmPassword}
                                                    secureTextEntry={forgotConfirmSecure}
                                                />
                                                <TouchableOpacity
                                                    style={styles.eyeButton}
                                                    onPress={() =>
                                                        togglePassword(
                                                            forgotConfirmSecure,
                                                            setForgotConfirmSecure,
                                                            setForgotConfirmIcon
                                                        )
                                                    }>
                                                    <Text style={styles.togglePasswordText}>{forgotConfirmIcon}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    resetPasswordDisabled && styles.loadingButton,
                                                ]}
                                                disabled={resetPasswordDisabled}
                                                onPress={() => resetPassword()}
                                                activeOpacity={0.9}
                                            >
                                                <View style={styles.loadingContent}>
                                                    <Text style={styles.primaryButtonText}>{resetPasswordText}</Text>
                                                    {resetPasswordDisabled && (
                                                        <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner}/>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                    {/*==========TOAST==========*/}
                    {toastVisible && (
                        <View style={[styles.toast,{backgroundColor: toastColor,},]}>
                            <Text style={styles.toastText}>{toastMessage}</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
