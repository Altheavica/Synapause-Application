import {getStoredUser} from "./StoredUserService";

const DASHBOARD_API =
    "https://script.google.com/macros/s/AKfycbzDvygssssnKnU79C_MYw9ozTz5xdvq5AE4HgmyMkwIGi9YBYRIfVsTNjyfzLYczR6y/exec";

async function getCurrentUser(){
    return getStoredUser();
}

async function getAnalytics(userId){
    const response = await fetch(
        DASHBOARD_API +
        "?action=getAnalytics" +
        "&userId=" +
        encodeURIComponent(userId)
    );

    if(!response.ok){
        throw new Error(
            "Dashboard analytics request failed."
        );
    }

    const result = await response.json();

    if(!result || !result.analytics){
        throw new Error(
            "Dashboard analytics response is invalid."
        );
    }

    return result.analytics;
}

async function loadDashboard(){
    const user = await getCurrentUser();

    if(!user){
        return {
            user: null,
            analytics: null,
        };
    }

    const analytics = await getAnalytics(
        user.id
    );

    return {
        user,
        analytics,
    };
}

export default {
    getCurrentUser,
    getAnalytics,
    loadDashboard,
};
