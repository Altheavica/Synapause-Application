//====ELEMENT====//
import GlobalService from "./GlobalService";
import {
    getStoredUser,
    saveStoredUser,
} from "./StoredUserService";



//====HELPER====//
export default function ChangeService({

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

    async function requireCurrentUser(){
        const user = await getStoredUser();

        if(!user){
            showError(
                "Silakan login kembali."
            );
        }

        return user;
    }

    //HELPER//
    function openChangeSection(){
        setChangeUsernameStep(1);
        setChangeUsernamePassword("");
        setChangeUsernameInput("");
        setChangeEmailStep(1);
        setChangeEmailPassword("");
        setChangeEmailInput("");
        setChangeEmailOTP("");
        setChangePasswordStep(1);
        setChangeOldPassword("");
        setChangeNewPassword("");
        setChangeConfirmPassword("");
        setChangePasswordWarning("");
        setChangeVisible(true);
    }

    function checkChangePassword(){
        const password = changeNewPassword;
        const confirm = changeConfirmPassword;

        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if(password===""){
            setChangePasswordWarning("");
            return;
        }

        let messages=[];

        if(!hasLength) messages.push("Minimal 8 karakter");
        if(!hasUpper) messages.push("Huruf besar");
        if(!hasLower) messages.push("Huruf kecil");
        if(!hasNumber) messages.push("Angka");

        if(messages.length){
            setChangePasswordWarning(
                "Kurang: "+messages.join(", ")
            );
        }

        else{
            setChangePasswordWarning(
                "Password memenuhi syarat."
            );
        }

        if(confirm===""){
            return;
        }

        if(password!==confirm){
            setChangePasswordWarning(
                "Password tidak cocok."
            );
        }

        else if(messages.length===0){
            setChangePasswordWarning(
                "Password siap digunakan."
            );
        }
    }

    //====LISTENER====//
    function closeChange(){
        setChangeVisible(false);
    }

    //Change Username//
    function changeUsernameSubmit(){
        return true;
    }

    async function continueChangeUsername(){
        const password =
            changeUsernamePassword.trim();

        if(password===""){
            showError(
                "Password harus diisi."
            );

            return;
        }

        const user = await requireCurrentUser();

        if(!user){
            return;
        }

        setLoading(
            setChangeUsernameContinueDisabled,
            setChangeUsernameContinueText,
            "Loading..."
        );

        try{
            const response =
            await fetch(
                API_URL+
                "?action=verifyPassword"+
                "&username="+
                encodeURIComponent(
                    user.username
                )+
                "&password="+
                encodeURIComponent(
                    password
                )
            );

            const result =
            await response.json();

            if(result.success){
                switchStep(
                    setChangeUsernameStep,
                    2
                );
            }

            else{
                showError(
                    result.message
                );
            }
        }

        catch(error){
            console.error(error);
            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangeUsernameContinueDisabled,
            setChangeUsernameContinueText,
            "Continue"
        );
    }

    async function saveUsername(){
        const user = await requireCurrentUser();

        if(!user){
            return;
        }

        const newUsername =
            changeUsernameInput.trim();

        if(newUsername===""){
            showError(
                "Username tidak boleh kosong."
            );

            return;
        }

        setLoading(
            setChangeUsernameSaveDisabled,
            setChangeUsernameSaveText,
            "Saving..."
        );

        try{
            const response =
            await fetch(
                API_URL+
                "?action=changeUsername"+
                "&username="+
                encodeURIComponent(
                    user.username
                )+
                "&newUsername="+
                encodeURIComponent(
                    newUsername
                )
            );

            const result =
            await response.json();

            if(result.success){
                user.username =
                    result.username;

                await saveStoredUser(user);

                if(updateNavbar){
                    await updateNavbar();
                }

                if(setUsername){
                    setUsername(
                        user.username
                    );
                }

                showSuccess(
                    result.message
                );

                setChangeVisible(
                    false
                );
            }

            else{
                showError(
                    result.message
                );
            }
        }

        catch(error){
            console.error(error);

            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangeUsernameSaveDisabled,
            setChangeUsernameSaveText,
            "Save Username"
        );
    }

    //Change Email//
    function changeEmailSubmit(){
        return true;
    }

    async function continueChangeEmail(){
        const password =
            changeEmailPassword.trim();

        if(password===""){
            showError(
                "Password harus diisi."
            );

            return;
        }

        const user = await requireCurrentUser();

        if(!user){
            return;
        }

        setLoading(
            setChangeEmailContinueDisabled,
            setChangeEmailContinueText,
            "Loading..."
        );

        try{
            const response =
            await fetch(
                API_URL+
                "?action=verifyPassword"+
                "&username="+
                encodeURIComponent(user.username)+
                "&password="+
                encodeURIComponent(password)
            );

            const result =
            await response.json();

            if(result.success){
                switchStep(
                    setChangeEmailStep,
                    2
                );

                showSuccess(
                    result.message
                );
            }

            else{
                showError(
                    result.message
                );
            }
        }

        catch(error){
            console.error(error);

            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangeEmailContinueDisabled,
            setChangeEmailContinueText,
            "Continue"
        );
    }

    function changeEmailSendSubmit(){
        return true;
    }

    async function sendChangeEmailOTP(){
        const email =
            changeEmailInput.trim();

        if(email===""){
            showError(
                "Email harus diisi."
            );

            return;
        }

        setLoading(
            setChangeEmailSendDisabled,
            setChangeEmailSendText,
            "Sending..."
        );

        try{
            const response =
            await fetch(
                API_URL+
                "?action=sendVerificationOTP"+
                "&email="+
                encodeURIComponent(
                    email
                )
            );

            const result =
            await response.json();

            if(result.success){
                switchStep(
                    setChangeEmailStep,
                    3
                );

                showSuccess(
                    result.message
                );
            }

            else{
                showError(
                    result.message
                );
            }
        }

        catch(error){
            console.error(error);

            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangeEmailSendDisabled,
            setChangeEmailSendText,
            "Send OTP"
        );
    }

    function changeEmailOtpInput(text){
        return onlyNumber(text);
    }

    function changeEmailVerifySubmit(){
        return true;
    }

    async function verifyChangeEmailOTP(){
        const otp =
            changeEmailOTP.trim();

        if(otp===""){
            showError(
                "OTP harus diisi."
            );

            return;
        }

        const user = await requireCurrentUser();

        if(!user){
            return;
        }

        setLoading(
            setChangeEmailVerifyDisabled,
            setChangeEmailVerifyText,
            "Verifying..."
        );

        try{
            const verifyResponse =
            await fetch(
                API_URL+
                "?action=verifyOTP"+
                "&email="+
                encodeURIComponent(
                    changeEmailInput.trim()
                )+
                "&otp="+
                encodeURIComponent(
                    otp
                )
            );

            const verifyResult =
            await verifyResponse.json();

            if(!verifyResult.success){

                showError(
                    verifyResult.message
                );

                clearLoading(
                    setChangeEmailVerifyDisabled,
                    setChangeEmailVerifyText,
                    "Verify OTP"
                );

                return;
            }

            const changeResponse =
            await fetch(
                API_URL+
                "?action=changeEmail"+
                "&username="+
                encodeURIComponent(
                    user.username
                )+
                "&newEmail="+
                encodeURIComponent(
                    changeEmailInput.trim()
                )
            );

            const changeResult =
            await changeResponse.json();

            if(changeResult.success){

                user.email =
                    changeResult.email;

                await saveStoredUser(user);

                if(updateNavbar){
                    await updateNavbar();
                }

                if(setEmail){
                    setEmail(
                        user.email
                    );
                }

                showSuccess(
                    changeResult.message
                );

                setChangeVisible(
                    false
                );
            }

            else{
                showError(
                    changeResult.message
                );
            }
        }

        catch(error){
            console.error(error);

            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangeEmailVerifyDisabled,
            setChangeEmailVerifyText,
            "Verify OTP"
        );
    }

    //Change Password//
    function changePasswordSubmit(){
        return true;
    }

    async function continueChangePassword(){
        const password =
            changeOldPassword.trim();

        if(password===""){
            showError(
                "Password harus diisi."
            );

            return;
        }

        const user = await requireCurrentUser();

        if(!user){
            return;
        }

        setLoading(
            setChangePasswordContinueDisabled,
            setChangePasswordContinueText,
            "Loading..."
        );

        try{
            const response =
            await fetch(
                API_URL+
                "?action=verifyPassword"+
                "&username="+
                encodeURIComponent(
                    user.username
                )+
                "&password="+
                encodeURIComponent(
                    password
                )
            );

            const result =
            await response.json();

            if(result.success){
                switchStep(
                    setChangePasswordStep,
                    2
                );

                showSuccess(
                    result.message
                );
            }

            else{
                showError(
                    result.message
                );
            }
        }

        catch(error){
            console.error(error);

            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangePasswordContinueDisabled,
            setChangePasswordContinueText,
            "Continue"
        );
    }

    function changePasswordSaveSubmit(){
        return true;
    }

    async function savePassword(){
        if(
            changeNewPassword.trim()===""
            ||
            changeConfirmPassword.trim()===""
        ){
            showError(
                "Password harus diisi."
            );

            return;
        }

        if(
            changeNewPassword
            !==
            changeConfirmPassword
        ){
            showError(
                "Password tidak cocok."
            );

            return;
        }

        const password =changeNewPassword;

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

        const user = await requireCurrentUser();

        if(!user){
            return;
        }

        setLoading(
            setChangePasswordSaveDisabled,
            setChangePasswordSaveText,
            "Saving..."
        );

        try{
            const response =
            await fetch(
                API_URL+
                "?action=changePassword"+
                "&username="+
                encodeURIComponent(
                    user.username
                )+
                "&oldPassword="+
                encodeURIComponent(
                    changeOldPassword
                )+
                "&newPassword="+
                encodeURIComponent(
                    changeNewPassword
                )
            );

            const result =
            await response.json();

            if(result.success){
                showSuccess(
                    result.message
                );

                setChangeVisible(
                    false
                );
            }

            else{
                showError(
                    result.message
                );
            }
        }

        catch(error){
            console.error(error);

            showError(
                "Server error."
            );
        }

        clearLoading(
            setChangePasswordSaveDisabled,
            setChangePasswordSaveText,
            "Save Password"
        );
    }

    return{
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
    };
}
