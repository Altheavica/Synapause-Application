//=======ELEMENT=======//
import {NativeModules,} from "react-native";
import {clearStoredUser} from "./StoredUserService";
import DetectorService from "./DetectorService";



const {ForegroundAppModule,} = NativeModules;



//=======HELPER=======//
export default function ProfileService({
    setProfileVisible,
    setSettingsVisible,
    setChangeVisible,
    setChangeSection,
    setUsername,
    setEmail,
    updateNavbar,
}) {

    function closeProfile() {
        setProfileVisible(false);
    }

    function openSettings() {
        setProfileVisible(false);
        setSettingsVisible(true);
    }

    function openChangeUsername() {
        setProfileVisible(false);
        setChangeSection("username");
        setChangeVisible(true);
    }

    function openChangeEmail() {
        setProfileVisible(false);
        setChangeSection("email");
        setChangeVisible(true);
    }

    function openChangePassword() {
        setProfileVisible(false);
        setChangeSection("password");
        setChangeVisible(true);
    }

    async function logout() {
        let accountCleared = false;

        try{
            await clearStoredUser();
            accountCleared = true;
        }

        catch(error){
            console.error(
                "Stored User Clear Error:",
                error
            );
        }

        if(accountCleared){
            DetectorService.cancelPendingStart();
        }

        try{
            if(ForegroundAppModule){
                await ForegroundAppModule
                    .clearLoggedInUser();

                console.log(
                    "NATIVE USER CLEARED"
                );
            }
        }

        catch(error){
            console.error(
                "Native User Clear Error:",
                error
            );
        }

        if(!accountCleared){
            return false;
        }

        setProfileVisible(false);

        setUsername("Sign Up");
        setEmail("");

        if(updateNavbar){
            await updateNavbar();
        }

        return true;
    }

    return{
        closeProfile,
        openSettings,
        openChangeUsername,
        openChangeEmail,
        openChangePassword,
        logout,
    };
}
