//=======ELEMENT=======//
import GlobalService from "./GlobalService";
import {saveStoredUser} from "./StoredUserService";

const AUTH_REQUESTS_IN_FLIGHT = new Set();


//=======HELPER=======//
export default function LoginService({
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
}){
    const{
        showSuccess,
        showError,
        switchStep,
        setLoading,
        clearLoading,
        onlyNumber,
        API_URL,
    } = GlobalService({
        toastMessage,
        setToastMessage,
        toastVisible,
        setToastVisible,
        toastColor,
        setToastColor,
    });

    async function runAuthRequest({
        key,
        setDisabled,
        setText,
        loadingText,
        idleText,
        operation,
    }){
        if(AUTH_REQUESTS_IN_FLIGHT.has(key)){
            return false;
        }

        AUTH_REQUESTS_IN_FLIGHT.add(key);
        setLoading(setDisabled, setText, loadingText);

        try{
            return await operation();
        }

        finally{
            AUTH_REQUESTS_IN_FLIGHT.delete(key);
            clearLoading(setDisabled, setText, idleText);
        }
    }

    async function completeAuthenticatedUser(result){
        let user;

        try{
            user = await saveStoredUser({
                username: result.username,
                email: result.email,
                id: result.id,
            });
        }

        catch(error){
            console.error(
                "Account Persistence Error:",
                error
            );

            showError(
                "Data akun gagal disimpan."
            );

            return null;
        }

        if(updateNavbar){
            try{
                await updateNavbar();
            }

            catch(error){
                console.error(
                    "Native Monitoring Integration Error:",
                    error
                );
            }
        }

        return user;
    }



    //====HELPER====//
    function checkPassword(){
        const password = registerPassword;
        const confirm = registerConfirmPassword;

        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if(password===""){
            setPasswordWarning("");
            return;
        }

        let messages=[];

        if(!hasLength) messages.push("Minimal 8 karakter");
        if(!hasUpper) messages.push("Huruf besar");
        if(!hasLower) messages.push("Huruf kecil");
        if(!hasNumber) messages.push("Angka");

        if(messages.length){
            setPasswordWarning(
                "Kurang: "+messages.join(", ")
            );
        }

        else{
            setPasswordWarning(
                "Password memenuhi syarat."
            );
        }

        if(confirm===""){
            return;
        }

        if(password!==confirm){
            setPasswordWarning(
                "Password tidak cocok."
            );
        }

        else if(messages.length===0){
            setPasswordWarning(
                "Password siap digunakan."
            );
        }
    }

    async function loginUser(){
        if(
            loginIdentifier.trim()===""
            ||
            loginPassword.trim()===""
        ){
            showError(
                "Lengkapi Username atau Email dan password."
            );
            return;
        }

        return runAuthRequest({
            key: "login",
            setDisabled: setLoginDisabled,
            setText: setLoginText,
            loadingText: "Logging in",
            idleText: "Login",
            operation: async ()=>{
                let result;

                try{
                    const response = await fetch(
                        API_URL+
                        "?action=login"+
                        "&identifier="+
                        encodeURIComponent(
                            loginIdentifier.trim()
                        )+
                        "&password="+
                        encodeURIComponent(
                            loginPassword
                        )
                    );

                    result = await response.json();
                }

                catch(error){
                    console.error(
                        "Login Backend Error:",
                        error
                    );

                    showError(
                        "Tidak dapat terhubung ke server."
                    );

                    return false;
                }

                if(!result.success){
                    showError(result.message);
                    return false;
                }

                const user = await completeAuthenticatedUser(result);

                if(!user){
                    return false;
                }

                showSuccess(
                    "Login berhasil."
                );

                setLoginVisible(false);
                setLoginPopupVisible(true);
                setRegisterPopupVisible(false);
                setForgotPopupVisible(false);

                return true;
            },
        });
    }

    //====LISTENER====//
    function closeLoginOverlay() {
        setLoginVisible(false);
        setRegisterPopupVisible(false);
        setLoginPopupVisible(true);
    }

    //Login//
    function closeLogin() {
        setLoginVisible(false);
    }

    function openForgot() {
        setLoginPopupVisible(false);

        setTimeout(() => {
            setForgotPopupVisible(true);
        },180);
    }

    function openRegister() {
        setLoginPopupVisible(false);

        setTimeout(() => {
            setRegisterPopupVisible(true);
        },180);
    }

    //Register//
    function closeRegister(){
        setRegisterPopupVisible(false);
        setLoginPopupVisible(true);
        setLoginVisible(false);
        setRegisterStep(1);
        setRegisterEmail("");
        setRegisterOTP("");
        setRegisterUsername("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setPasswordWarning("");
    }

    async function continueEmail(){
        const email = registerEmail.trim();
        if(email===""){
            showError(
                "Email harus diisi."
            );

            return;
        }

        return runAuthRequest({
            key: "register-email",
            setDisabled: setRegisterEmailDisabled,
            setText: setRegisterEmailText,
            loadingText: "Sending",
            idleText: "Continue",
            operation: async ()=>{
                try{
                    const response = await fetch(
                        API_URL+
                        "?action=sendVerificationOTP"+
                        "&email="+
                        encodeURIComponent(email)
                    );

                    const result = await response.json();

                    if(result.success){
                        switchStep(setRegisterStep, 2);
                        return true;
                    }

                    showError(result.message);
                    return false;
                }

                catch(error){
                    console.error(
                        "Register OTP Send Error:",
                        error
                    );
                    showError("Tidak dapat terhubung ke server.");
                    return false;
                }
            },
        });
    }

    function registerOtpInput(text){
        return onlyNumber(text);
    }

    function registerOtpSubmit(){
        return true;
    }

    async function verifyOTP(){
        const email = registerEmail.trim();
        const otp = registerOTP.trim();

        if(otp===""){
            showError(
                "OTP harus diisi."
            );

            return;
        }

        return runAuthRequest({
            key: "register-otp",
            setDisabled: setRegisterOTPDisabled,
            setText: setRegisterOTPText,
            loadingText: "Verifying",
            idleText: "Verify OTP",
            operation: async ()=>{
                try{
                    const response = await fetch(
                        API_URL+
                        "?action=verifyOTP"+
                        "&email="+
                        encodeURIComponent(email)+
                        "&otp="+
                        encodeURIComponent(otp)
                    );

                    const result = await response.json();

                    if(result.success){
                        switchStep(setRegisterStep, 3);
                        return true;
                    }

                    showError(result.message);
                    return false;
                }

                catch(error){
                    console.error(
                        "Register OTP Verify Error:",
                        error
                    );
                    showError("Tidak dapat terhubung ke server.");
                    return false;
                }
            },
        });
    }

    function continueUsername(){
        if(registerUsername.trim()===""){
            showError(
                "Username harus diisi."
            );

            return;
        }

        switchStep(
            setRegisterStep,
            4
        );
    }

    async function registerUser(){
        if(
            registerPassword.trim()===""
            ||
            registerConfirmPassword.trim()===""
        ){
            showError(
                "Password harus diisi."
            );

            return;
        }

        if(
            registerPassword!==registerConfirmPassword
        ){
            showError(
                "Password tidak cocok."
            );

            return;
        }

        const password=registerPassword;
        if(
            password.length<8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password)
        ){
            showError(
                "Password belum memenuhi syarat."
            );

            return;
        }

        return runAuthRequest({
            key: "register",
            setDisabled: setRegisterDisabled,
            setText: setRegisterText,
            loadingText: "Registering",
            idleText: "Register",
            operation: async ()=>{
                let result;

                try{
                    const response=await fetch(
                        API_URL+
                        "?action=register"+
                        "&username="+
                        encodeURIComponent(registerUsername.trim())+
                        "&email="+
                        encodeURIComponent(registerEmail.trim())+
                        "&password="+
                        encodeURIComponent(registerPassword)
                    );

                    result=await response.json();
                }

                catch(error){
                    console.error(
                        "Register Backend Error:",
                        error
                    );
                    showError("Tidak dapat terhubung ke server.");
                    return false;
                }

                if(!result.success){
                    showError(result.message);
                    return false;
                }

                const user = await completeAuthenticatedUser(result);

                if(!user){
                    return false;
                }

                setRegisterStep(1);
                setRegisterEmail("");
                setRegisterOTP("");
                setRegisterUsername("");
                setRegisterPassword("");
                setRegisterConfirmPassword("");
                setPasswordWarning("");
                setRegisterPopupVisible(false);
                setLoginPopupVisible(true);
                setLoginVisible(false);

                if(setProfileVisible){
                    setProfileVisible(true);
                }

                showSuccess(
                    "Register berhasil."
                );

                return true;
            },
        });
    }

    //Forgot//
    function closeForgot(){
        setForgotPopupVisible(false);
        setLoginPopupVisible(true);
        setForgotStep(1);
        setForgotEmail("");
        setForgotOTP("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
    }

    async function forgotContinue(){
        const email = forgotEmail.trim();

        if(email===""){
            showError(
                "Email harus diisi."
            );

            return;
        }

        return runAuthRequest({
            key: "forgot-email",
            setDisabled: setForgotEmailDisabled,
            setText: setForgotEmailText,
            loadingText: "Sending",
            idleText: "Continue",
            operation: async ()=>{
                try{
                    const response = await fetch(
                        API_URL+
                        "?action=sendResetOTP"+
                        "&email="+
                        encodeURIComponent(email)
                    );

                    const result = await response.json();

                    if(result.success){
                        switchStep(setForgotStep, 2);
                        return true;
                    }

                    showError(result.message);
                    return false;
                }

                catch(error){
                    console.error(
                        "Reset OTP Send Error:",
                        error
                    );
                    showError("Tidak dapat terhubung ke server.");
                    return false;
                }
            },
        });
    }

    function backToLogin(){
        setForgotPopupVisible(false);
        setRegisterPopupVisible(false);
        setLoginPopupVisible(true);
        setForgotStep(1);
    }

    function forgotOtpInput(text){
        return onlyNumber(text);
    }

    function forgotOtpSubmit(){
        return verifyResetOTP();
    }

    async function verifyResetOTP(){
        const otp = forgotOTP.trim();

        if(otp===""){
            showError(
                "OTP harus diisi."
            );

            return;
        }

        return runAuthRequest({
            key: "forgot-otp",
            setDisabled: setForgotOTPDisabled,
            setText: setForgotOTPText,
            loadingText: "Verifying",
            idleText: "Verify OTP",
            operation: async ()=>{
                try{
                    const response = await fetch(
                        API_URL+
                        "?action=verifyResetOTP"+
                        "&email="+
                        encodeURIComponent(
                            forgotEmail.trim()
                        )+
                        "&otp="+
                        encodeURIComponent(otp)
                    );

                    const result = await response.json();

                    if(result.success){
                        switchStep(setForgotStep, 3);
                        return true;
                    }

                    showError(result.message);
                    return false;
                }

                catch(error){
                    console.error(
                        "Reset OTP Verify Error:",
                        error
                    );
                    showError("Tidak dapat terhubung ke server.");
                    return false;
                }
            },
        });
    }

    async function resetPassword(){
        if(
            forgotNewPassword.trim()===""
            ||
            forgotConfirmPassword.trim()===""
        ){
            showError(
                "Password harus diisi."
            );

            return;
        }

        if(
            forgotNewPassword!==forgotConfirmPassword
        ){
            showError(
                "Password tidak cocok."
            );

            return;
        }

        return runAuthRequest({
            key: "reset-password",
            setDisabled: setResetPasswordDisabled,
            setText: setResetPasswordText,
            loadingText: "Resetting",
            idleText: "Reset Password",
            operation: async ()=>{
                try{
                    const response = await fetch(
                        API_URL+
                        "?action=resetPassword"+
                        "&email="+
                        encodeURIComponent(
                            forgotEmail.trim()
                        )+
                        "&newPassword="+
                        encodeURIComponent(
                            forgotNewPassword
                        )
                    );

                    const result = await response.json();

                    if(!result.success){
                        showError(result.message);
                        return false;
                    }

                    showSuccess(result.message);
                    setForgotStep(1);
                    setForgotEmail("");
                    setForgotOTP("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                    setLoginIdentifier("");
                    setLoginPassword("");
                    setForgotPopupVisible(false);
                    setLoginPopupVisible(true);
                    setLoginVisible(true);

                    return true;
                }

                catch(error){
                    console.error(
                        "Reset Password Backend Error:",
                        error
                    );
                    showError("Tidak dapat terhubung ke server.");
                    return false;
                }
            },
        });
    }

    return{
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
    };
}
