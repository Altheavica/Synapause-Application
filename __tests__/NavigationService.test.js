import {NativeModules} from "react-native";
import DetectorService from "../src/services/DetectorService";
import SettingsService, {syncSitesToNative} from "../src/services/SettingsService";
import NavigationService from "../src/services/NavigationService";
import {
    USER_READ_STATUS,
    readStoredUser,
} from "../src/services/StoredUserService";

jest.mock(
    "react-native",
    ()=>(
        {
            NativeModules: {
                ForegroundAppModule: {
                    updateLoggedInUser: jest.fn(),
                    clearLoggedInUser: jest.fn(),
                },
            },
        }
    )
);

jest.mock(
    "../src/services/DetectorService",
    ()=>(
        {
            __esModule: true,
            default: {
                start: jest.fn(),
                cancelPendingStart: jest.fn(),
            },
        }
    )
);

jest.mock(
    "../src/services/SettingsService",
    ()=>(
        {
            __esModule: true,
            default: {loadSites: jest.fn()},
            syncSitesToNative: jest.fn(),
        }
    )
);

jest.mock(
    "../src/services/StoredUserService",
    ()=>(
        {
            USER_READ_STATUS: {
                VALID: "valid",
                MISSING: "missing",
                INVALID: "invalid",
                ERROR: "error",
            },
            readStoredUser: jest.fn(),
        }
    )
);

const USER = {
    id: "user-1",
    username: "Ghazy",
    email: "ghazy@example.com",
};

function createNavigation(){
    const setters = {
        setDropdownVisible: jest.fn(),
        setProfileVisible: jest.fn(),
        setLoginVisible: jest.fn(),
        setUsername: jest.fn(),
        setEmail: jest.fn(),
    };

    return {
        service: NavigationService({
            dropdownVisible: false,
            profileVisible: false,
            username: "Sign Up",
            ...setters,
        }),
        setters,
    };
}

describe("cold-start account and native readiness coordination", ()=>{
    beforeEach(()=>{
        jest.clearAllMocks();
        NativeModules.ForegroundAppModule.updateLoggedInUser
            .mockResolvedValue(true);
        NativeModules.ForegroundAppModule.clearLoggedInUser
            .mockResolvedValue(true);
        SettingsService.loadSites.mockResolvedValue({youtube: true});
        syncSitesToNative.mockResolvedValue(true);
        DetectorService.start.mockResolvedValue(true);
    });

    test("valid RN authority repairs mirrors then starts monitoring once", async ()=>{
        readStoredUser.mockResolvedValue({
            status: USER_READ_STATUS.VALID,
            user: USER,
        });
        const {service, setters} = createNavigation();

        await service.updateNavbar();

        expect(setters.setUsername).toHaveBeenCalledWith(USER.username);
        expect(setters.setEmail).toHaveBeenCalledWith(USER.email);
        expect(NativeModules.ForegroundAppModule.updateLoggedInUser)
            .toHaveBeenCalledWith(USER);
        expect(SettingsService.loadSites)
            .toHaveBeenCalledWith({syncNative: false});
        expect(syncSitesToNative).toHaveBeenCalledWith({youtube: true});
        expect(DetectorService.start).toHaveBeenCalledTimes(1);
    });

    test.each([
        USER_READ_STATUS.MISSING,
        USER_READ_STATUS.INVALID,
    ])("%s RN identity clears native authority and never starts", async status=>{
        readStoredUser.mockResolvedValue({status, user: null});
        const {service, setters} = createNavigation();

        await service.updateNavbar();

        expect(DetectorService.cancelPendingStart).toHaveBeenCalledTimes(1);
        expect(NativeModules.ForegroundAppModule.clearLoggedInUser)
            .toHaveBeenCalledTimes(1);
        expect(NativeModules.ForegroundAppModule.updateLoggedInUser)
            .not.toHaveBeenCalled();
        expect(DetectorService.start).not.toHaveBeenCalled();
        expect(setters.setUsername).toHaveBeenCalledWith("Sign Up");
        expect(setters.setEmail).toHaveBeenCalledWith("");
    });

    test("native user sync failure cannot start with a stale mirror", async ()=>{
        readStoredUser.mockResolvedValue({
            status: USER_READ_STATUS.VALID,
            user: USER,
        });
        NativeModules.ForegroundAppModule.updateLoggedInUser
            .mockRejectedValueOnce(new Error("bridge unavailable"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(()=>{});
        const {service} = createNavigation();

        await expect(service.updateNavbar()).resolves.toBeUndefined();

        expect(syncSitesToNative).not.toHaveBeenCalled();
        expect(DetectorService.start).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test("site mirror failure blocks service start without losing RN user", async ()=>{
        readStoredUser.mockResolvedValue({
            status: USER_READ_STATUS.VALID,
            user: USER,
        });
        syncSitesToNative.mockResolvedValueOnce(false);
        const {service, setters} = createNavigation();

        await service.updateNavbar();

        expect(setters.setUsername).toHaveBeenCalledWith(USER.username);
        expect(DetectorService.start).not.toHaveBeenCalled();
    });
});
