//=======ELEMENT=======//
import {NativeModules,} from "react-native";
import {
    USER_READ_STATUS,
    readStoredUser,
} from "./StoredUserService";
import DetectorService from "./DetectorService";
import SettingsService, {
    syncSitesToNative,
} from "./SettingsService";



const {ForegroundAppModule,} = NativeModules;



//=======HELPER=======//
export default function NavigationService({
    dropdownVisible,
    setDropdownVisible,
    profileVisible,
    setProfileVisible,
    setLoginVisible,
    username,
    setUsername,
    email,
    setEmail,
}) {

    async function clearNativeUserMirror(){
        DetectorService.cancelPendingStart();

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
    }

    async function getCurrentUser(){
        const result = await readStoredUser();

        if(
            result.status === USER_READ_STATUS.MISSING ||
            result.status === USER_READ_STATUS.INVALID
        ){
            await clearNativeUserMirror();
        }

        return result.user;
    }

    async function updateNavbar() {
        const user = await getCurrentUser();

        if (user) {
            setUsername(user.username);

            if(setEmail){
                setEmail(user.email);
            }

            let nativeUserSynced = false;

            try{
                if(ForegroundAppModule){
                    await ForegroundAppModule
                        .updateLoggedInUser({
                            id: user.id,
                            username: user.username,
                            email: user.email,
                        });

                    console.log(
                        "NATIVE USER SYNCED"
                    );

                    nativeUserSynced = true;
                }
            }

            catch(error){
                console.error(
                    "Native User Sync Error:",
                    error
                );
            }

            if(nativeUserSynced){
                let nativeSitesSynced = false;

                try{
                    const storedSites =
                        await SettingsService.loadSites({
                            syncNative: false,
                        });

                    nativeSitesSynced =
                        await syncSitesToNative(storedSites);
                }

                catch(error){
                    console.error(
                        "Native Monitored Sites Bootstrap Error:",
                        error
                    );
                }

                if(nativeSitesSynced){
                    await DetectorService.start();
                }
            }
        }

        else {
            setUsername("Sign Up");

            if(setEmail){
                setEmail("");
            }
        }
    }

    function toggleDropdown() {
        setDropdownVisible(!dropdownVisible);
    }

    function closeDropdown() {
        setDropdownVisible(false);
    }

    async function openAccount() {
        const user = await getCurrentUser();

        setDropdownVisible(false);

        if (user) {
            setUsername(user.username);
            setEmail(user.email);

            setProfileVisible(true);
        }

        else {
            setLoginVisible(true);
        }
    }

    function mobileSignUp() {
        openAccount();
    }

    function closeProfile() {
        if (profileVisible) {
            setProfileVisible(false);
        }
    }

    return {
        updateNavbar,
        toggleDropdown,
        closeDropdown,
        openAccount,
        mobileSignUp,
        closeProfile,
    };
}
