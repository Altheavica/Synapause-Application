import {NativeModules} from "react-native";
import ChangeService from "../src/services/ChangeService";
import DetectorService from "../src/services/DetectorService";
import ProfileService from "../src/services/ProfileService";
import {
    clearStoredUser,
    getStoredUser,
    saveStoredUser,
} from "../src/services/StoredUserService";

const mockGlobal = {
    API_URL: "https://example.test/exec",
    showSuccess: jest.fn(),
    showError: jest.fn(),
    switchStep: jest.fn((setter, step)=>setter(step)),
    setLoading: jest.fn(),
    clearLoading: jest.fn(),
    onlyNumber: jest.fn(value=>value.replace(/\D/g, "")),
};

jest.mock(
    "react-native",
    ()=>(
        {
            NativeModules: {
                ForegroundAppModule: {
                    clearLoggedInUser: jest.fn(),
                },
            },
        }
    )
);

jest.mock(
    "../src/services/GlobalService",
    ()=>jest.fn(()=>mockGlobal)
);

jest.mock(
    "../src/services/DetectorService",
    ()=>(
        {
            __esModule: true,
            default: {cancelPendingStart: jest.fn()},
        }
    )
);

jest.mock(
    "../src/services/StoredUserService",
    ()=>(
        {
            clearStoredUser: jest.fn(),
            getStoredUser: jest.fn(),
            saveStoredUser: jest.fn(),
        }
    )
);

const USER = {
    id: "user-1",
    username: "Ghazy",
    email: "ghazy@example.com",
};

function setters(){
    const names = [
        "setProfileVisible",
        "setSettingsVisible",
        "setChangeVisible",
        "setChangeSection",
        "setUsername",
        "setEmail",
        "setChangeUsernameContinueDisabled",
        "setChangeUsernameContinueText",
        "setChangeUsernameSaveDisabled",
        "setChangeUsernameSaveText",
        "setChangeUsernameStep",
        "setChangeUsernamePassword",
        "setChangeUsernameInput",
        "setChangeEmailContinueDisabled",
        "setChangeEmailContinueText",
        "setChangeEmailSendDisabled",
        "setChangeEmailSendText",
        "setChangeEmailVerifyDisabled",
        "setChangeEmailVerifyText",
        "setChangeEmailStep",
        "setChangeEmailPassword",
        "setChangeEmailInput",
        "setChangeEmailOTP",
        "setChangePasswordContinueDisabled",
        "setChangePasswordContinueText",
        "setChangePasswordSaveDisabled",
        "setChangePasswordSaveText",
        "setChangePasswordStep",
        "setChangeOldPassword",
        "setChangeNewPassword",
        "setChangeConfirmPassword",
        "setChangePasswordWarning",
    ];

    return Object.fromEntries(
        names.map(name=>[name, jest.fn()])
    );
}

function response(result){
    return Promise.resolve({json: jest.fn().mockResolvedValue(result)});
}

describe("account changes and logout boundaries", ()=>{
    beforeEach(()=>{
        jest.clearAllMocks();
        global.fetch = jest.fn();
        clearStoredUser.mockResolvedValue(undefined);
        getStoredUser.mockResolvedValue({...USER});
        saveStoredUser.mockImplementation(async user=>({...user}));
        NativeModules.ForegroundAppModule.clearLoggedInUser
            .mockResolvedValue(true);
    });

    test("logout clears RN authority and native mirror", async ()=>{
        const state = setters();
        const updateNavbar = jest.fn().mockResolvedValue(undefined);
        const service = ProfileService({...state, updateNavbar});

        await expect(service.logout()).resolves.toBe(true);

        expect(clearStoredUser).toHaveBeenCalledTimes(1);
        expect(DetectorService.cancelPendingStart).toHaveBeenCalledTimes(1);
        expect(NativeModules.ForegroundAppModule.clearLoggedInUser)
            .toHaveBeenCalledTimes(1);
        expect(state.setUsername).toHaveBeenCalledWith("Sign Up");
        expect(state.setEmail).toHaveBeenCalledWith("");
        expect(updateNavbar).toHaveBeenCalledTimes(1);
    });

    test("RN clear failure still attempts native cleanup and keeps UI authenticated", async ()=>{
        clearStoredUser.mockRejectedValueOnce(new Error("storage unavailable"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(()=>{});
        const state = setters();
        const updateNavbar = jest.fn();
        const service = ProfileService({...state, updateNavbar});

        await expect(service.logout()).resolves.toBe(false);

        expect(NativeModules.ForegroundAppModule.clearLoggedInUser)
            .toHaveBeenCalledTimes(1);
        expect(DetectorService.cancelPendingStart).not.toHaveBeenCalled();
        expect(state.setUsername).not.toHaveBeenCalled();
        expect(updateNavbar).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test("native clear failure cannot recreate the cleared RN account", async ()=>{
        NativeModules.ForegroundAppModule.clearLoggedInUser
            .mockRejectedValueOnce(new Error("bridge unavailable"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(()=>{});
        const state = setters();
        const service = ProfileService({...state});

        await expect(service.logout()).resolves.toBe(true);

        expect(clearStoredUser).toHaveBeenCalledTimes(1);
        expect(state.setUsername).toHaveBeenCalledWith("Sign Up");
        consoleSpy.mockRestore();
    });

    test("username update persists exact identity then delegates native resync", async ()=>{
        fetch.mockReturnValueOnce(response({
            success: true,
            username: "Ghazy Baru",
            message: "Berhasil.",
        }));
        const state = setters();
        const updateNavbar = jest.fn().mockResolvedValue(undefined);
        const service = ChangeService({
            ...state,
            updateNavbar,
            changeUsernameInput: "Ghazy Baru",
        });

        await service.saveUsername();

        expect(saveStoredUser).toHaveBeenCalledWith({
            ...USER,
            username: "Ghazy Baru",
        });
        expect(updateNavbar).toHaveBeenCalledTimes(1);
        expect(state.setUsername).toHaveBeenCalledWith("Ghazy Baru");
    });

    test("email update persists identity and invokes the same resync boundary", async ()=>{
        fetch
            .mockReturnValueOnce(response({success: true}))
            .mockReturnValueOnce(response({
                success: true,
                email: "baru@example.com",
                message: "Berhasil.",
            }));
        const state = setters();
        const updateNavbar = jest.fn().mockResolvedValue(undefined);
        const service = ChangeService({
            ...state,
            updateNavbar,
            changeEmailInput: "baru@example.com",
            changeEmailOTP: "123456",
        });

        await service.verifyChangeEmailOTP();

        expect(saveStoredUser).toHaveBeenCalledWith({
            ...USER,
            email: "baru@example.com",
        });
        expect(updateNavbar).toHaveBeenCalledTimes(1);
        expect(state.setEmail).toHaveBeenCalledWith("baru@example.com");
    });

    test("password update never writes account storage or invokes native resync", async ()=>{
        fetch.mockReturnValueOnce(response({
            success: true,
            message: "Password berubah.",
        }));
        const state = setters();
        const updateNavbar = jest.fn();
        const service = ChangeService({
            ...state,
            updateNavbar,
            changeOldPassword: "Password1",
            changeNewPassword: "NewPassword1",
            changeConfirmPassword: "NewPassword1",
        });

        await service.savePassword();

        expect(fetch.mock.calls[0][0]).toContain("action=changePassword");
        expect(saveStoredUser).not.toHaveBeenCalled();
        expect(updateNavbar).not.toHaveBeenCalled();
    });
});
