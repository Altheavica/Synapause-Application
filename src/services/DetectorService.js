import {
    NativeModules,
    PermissionsAndroid,
    Platform,
} from "react-native";
import {hasUsagePermission, openUsagePermissionSettings,} from "@sahil_sensei/react-native-app-usage";

const {ForegroundAppModule,} = NativeModules;



//=======GLOBAL=======//
let monitoringRequested = false;
let monitoringStarted = false;
let startPromise = null;
let waitingForPermission = null;



//=======PERMISSION=======//
async function hasPermission(){
    try{
        return await hasUsagePermission();
    }

    catch(error){
        console.error(
            "Usage Permission Error:",
            error
        );

        return false;
    }
}

async function requestPermission(){
    try{
        const granted = await hasPermission();

        if(granted){
            return true;
        }

        await openUsagePermissionSettings();

        return false;
    }

    catch(error){
        console.error(
            "Usage Permission Request Error:",
            error
        );

        return false;
    }
}

async function hasOverlayPermission(){
    try{
        if(!ForegroundAppModule){
            console.error(
                "ForegroundAppModule not available."
            );

            return false;
        }

        return await ForegroundAppModule
            .hasOverlayPermission();
    }

    catch(error){
        console.error(
            "Overlay Permission Error:",
            error
        );

        return false;
    }
}


async function requestOverlayPermission(){
    try{
        if(!ForegroundAppModule){
            console.error(
                "ForegroundAppModule not available."
            );

            return false;
        }


        const granted =
            await hasOverlayPermission();


        if(granted){
            return true;
        }


        await ForegroundAppModule
            .requestOverlayPermission();


        return false;
    }

    catch(error){
        console.error(
            "Overlay Permission Request Error:",
            error
        );

        return false;
    }
}

async function hasNotificationPermission(){
    if(
        Platform.OS !== "android" ||
        Number(Platform.Version) < 33
    ){
        return true;
    }

    try{
        return await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
    }

    catch(error){
        console.error(
            "Notification Permission Error:",
            error
        );

        return false;
    }
}

async function requestNotificationPermission(){
    if(await hasNotificationPermission()){
        return true;
    }

    try{
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    catch(error){
        console.error(
            "Notification Permission Request Error:",
            error
        );

        return false;
    }
}



//=======MONITOR=======//
async function performStart(){
    if(!ForegroundAppModule){
        console.error(
            "ForegroundAppModule not available."
        );

        return false;
    }

    const granted = await hasPermission();

    if(!granted){
        console.log(
            "Foreground Detector blocked. Usage Access required."
        );

        if(waitingForPermission !== "usage"){
            waitingForPermission = "usage";
            await requestPermission();
        }

        return false;
    }

    if(waitingForPermission === "usage"){
        waitingForPermission = null;
    }

    const overlayGranted = await hasOverlayPermission();

    if(!overlayGranted){
        console.log(
            "Foreground Detector blocked. Overlay permission required."
        );

        if(waitingForPermission !== "overlay"){
            waitingForPermission = "overlay";
            await requestOverlayPermission();
        }

        return false;
    }

    if(waitingForPermission === "overlay"){
        waitingForPermission = null;
    }

    const notificationGranted =
        await requestNotificationPermission();

    if(!notificationGranted){
        console.warn(
            "Notification permission denied. Foreground monitoring will continue with restricted notification visibility."
        );
    }

    try{
        await ForegroundAppModule.startMonitoring();

        monitoringStarted = true;
        monitoringRequested = false;

        console.log(
            "Foreground Detector Started"
        );

        return true;
    }

    catch(error){
        console.error(
            "Foreground Detector Start Error:",
            error
        );

        return false;
    }
}

async function start(){
    monitoringRequested = true;

    if(monitoringStarted){
        monitoringRequested = false;
        return true;
    }

    if(startPromise){
        return startPromise;
    }

    startPromise = performStart()
        .catch(error=>{
            console.error(
                "Foreground Detector Readiness Error:",
                error
            );

            return false;
        })
        .finally(()=>{
            startPromise = null;
        });

    return startPromise;
}

async function resumePendingStart(){
    if(
        !monitoringRequested ||
        monitoringStarted
    ){
        return monitoringStarted;
    }

    return start();
}

function cancelPendingStart(){
    monitoringRequested = false;
    monitoringStarted = false;
    waitingForPermission = null;
}

//=======EXPORT=======//
export default{
    hasPermission,
    requestPermission,
    hasOverlayPermission,
    requestOverlayPermission,
    hasNotificationPermission,
    requestNotificationPermission,
    start,
    resumePendingStart,
    cancelPendingStart,
};
