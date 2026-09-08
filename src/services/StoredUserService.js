import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_STORAGE_KEY = "synapauseUser";

const USER_READ_STATUS = Object.freeze({
    VALID: "valid",
    MISSING: "missing",
    INVALID: "invalid",
    ERROR: "error",
});

function normalizeStoredUser(value){
    if(
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ){
        return null;
    }

    const fields = [
        value.id,
        value.username,
        value.email,
    ];

    if(
        fields.some(field=>(
            typeof field !== "string" ||
            field.trim() === ""
        ))
    ){
        return null;
    }

    return {
        id: value.id,
        username: value.username,
        email: value.email,
    };
}

function parseStoredUser(rawValue){
    if(
        typeof rawValue !== "string" ||
        rawValue.trim() === ""
    ){
        return null;
    }

    try{
        return normalizeStoredUser(
            JSON.parse(rawValue)
        );
    }

    catch(error){
        return null;
    }
}

async function readStoredUser(){
    let rawValue;

    try{
        rawValue = await AsyncStorage.getItem(
            USER_STORAGE_KEY
        );
    }

    catch(error){
        console.error(
            "Stored User Read Error:",
            error
        );

        return {
            status: USER_READ_STATUS.ERROR,
            user: null,
            error,
        };
    }

    if(rawValue === null){
        return {
            status: USER_READ_STATUS.MISSING,
            user: null,
        };
    }

    const user = parseStoredUser(rawValue);

    if(user){
        return {
            status: USER_READ_STATUS.VALID,
            user,
        };
    }

    let cleanupError = null;

    try{
        await AsyncStorage.removeItem(
            USER_STORAGE_KEY
        );
    }

    catch(error){
        cleanupError = error;

        console.error(
            "Invalid Stored User Cleanup Error:",
            error
        );
    }

    return {
        status: USER_READ_STATUS.INVALID,
        user: null,
        cleanupError,
    };
}

async function getStoredUser(){
    const result = await readStoredUser();

    return result.user;
}

async function saveStoredUser(user){
    const normalizedUser = normalizeStoredUser(user);

    if(!normalizedUser){
        throw new TypeError(
            "Stored user must contain valid id, username, and email strings."
        );
    }

    await AsyncStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(normalizedUser)
    );

    return normalizedUser;
}

async function clearStoredUser(){
    await AsyncStorage.removeItem(
        USER_STORAGE_KEY
    );
}

export {
    USER_READ_STATUS,
    USER_STORAGE_KEY,
    clearStoredUser,
    getStoredUser,
    normalizeStoredUser,
    parseStoredUser,
    readStoredUser,
    saveStoredUser,
};

export default {
    clearStoredUser,
    getStoredUser,
    readStoredUser,
    saveStoredUser,
};
