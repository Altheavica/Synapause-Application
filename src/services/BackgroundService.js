import AsyncStorage from "@react-native-async-storage/async-storage";
import {getStoredUser} from "./StoredUserService";



//=======GLOBAL=======//
const monitoredApps = [
    "com.google.android.youtube",
    "com.instagram.android",
    "com.zhiliaoapp.musically",
];

let session = {
    active: false,
    appId: null,
};

let timer = {
    seconds: 0,
    running: false,
    interval: null,
};

let quizRequired = false;
let quizState = null;
let onQuizRequired = null;
let monitorCallback = null;



//=======HELPER=======//
function hasActiveQuiz(){
    return quizState !== null;
}

async function isLoggedIn(){
    try{
        const user = await getStoredUser();

        return user !== null;
    }

    catch(error){
        console.error(error);

        return false;
    }
}



//=======TIMER=======//
function startTimer(){
    if(quizRequired){
        console.log(
            "Waiting Quiz..."
        );

        return;
    }

    timer.running = true;
}

function pauseTimer(){
    if(!timer.running){
        return;
    }

    timer.running = false;

    console.log(
        "Timer Paused"
    );
}

function resetTimer(){
    timer.interval = null;
    timer.running = false;
    timer.seconds = 0;
    quizRequired = false;

    console.log(
        "Timer Reset"
    );
}

function restartTimer(){
    resetTimer();

    console.log(
        "Timer Restarted"
    );
}

function syncTimer(seconds){
    timer.seconds = seconds;

    if(
        seconds > 0 &&
        !quizRequired
    ){
        timer.running = true;
    }
}

function requireQuiz(){
    timer.running = false;
    quizRequired = true;

    console.log(
        "=========="
    );

    console.log(
        "TIMER FINISHED"
    );

    console.log(
        "Quiz Required:",
        quizRequired
    );

    console.log(
        "=========="
    );


    if(
        typeof onQuizRequired === "function"
    ){
        onQuizRequired();
    }
}



//=======QUIZ=======//
function saveQuizState(state){
    quizState = {
        ...state,
    };

    console.log("SAVE QUIZ STATE");
    console.log(quizState);
}

function getQuizState(){
    return quizState;
}

function clearQuizState(){
    console.log("CLEAR QUIZ STATE");
    quizState = null;
    quizRequired = false;
}

function finishQuiz(){
    clearQuizState();
    restartTimer();
}

function setQuizRequiredCallback(callback){
    onQuizRequired = callback;
}



//=======SESSION=======//
function updateSession(currentApp){
    const monitored =
    monitoredApps.includes(currentApp);

    if(monitored){
        session.active = true;
        session.appId = currentApp;

        console.log("SESSION START");
        console.log(session);

        if(hasActiveQuiz()){
            pauseTimer();
        }

        else{
            startTimer();
        }
    }

    else{
        pauseTimer();
        session.active = false;
        session.appId = null;
        
        console.log("SESSION STOP");
    }
}



//=======MONITOR=======//
function setMonitorCallback(callback){
    monitorCallback = callback;
}

async function startMonitoring(){
    const loggedIn = await isLoggedIn();

    if(!loggedIn){
        console.log(
            "Monitoring blocked. User not logged in."
        );

        return;
    }

    console.log(
        "Background Monitoring Started"
    );

    if(typeof monitorCallback === "function"){
        monitorCallback();
    }
}

function stopMonitoring(){
    pauseTimer();
    session.active = false;
    session.appId = null;
    clearQuizState();
    resetTimer();

    console.log(
        "Background Monitoring Stopped"
    );
}

function onForegroundAppChanged(appId){
    updateSession(appId);
}



//=======APP=======//
async function logout(){
    try{
        await AsyncStorage.removeItem(
            "synapauseUser"
        );
    }

    catch(error){
        console.error(error);
    }

    stopMonitoring();
}

async function initialize(){
    const loggedIn = await isLoggedIn();

    if(loggedIn){
        startMonitoring();
    }
}



//=======EXPORT=======//
export default{
    monitoredApps,
    session,
    timer,
    startMonitoring,
    stopMonitoring,
    updateSession,
    startTimer,
    pauseTimer,
    resetTimer,
    hasActiveQuiz,
    saveQuizState,
    getQuizState,
    clearQuizState,
    restartTimer,
    finishQuiz,
    setQuizRequiredCallback,
    initialize,
    logout,
    isLoggedIn,
    onForegroundAppChanged,
    setMonitorCallback,
    syncTimer,
    requireQuiz,
};
