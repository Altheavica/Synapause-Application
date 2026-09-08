import LoginService from "../src/services/LoginService";
import {saveStoredUser} from "../src/services/StoredUserService";

const mockGlobal = {
    API_URL: "https://example.test/exec",
    showSuccess: jest.fn(),
    showError: jest.fn(),
    switchStep: jest.fn((setter, step)=>setter(step)),
    setLoading: jest.fn((setDisabled, setText, text)=>{
        setDisabled?.(true);
        setText?.(text);
    }),
    clearLoading: jest.fn((setDisabled, setText, text)=>{
        setDisabled?.(false);
        setText?.(text);
    }),
    onlyNumber: jest.fn(value=>value.replace(/\D/g, "")),
};

jest.mock(
    "../src/services/GlobalService",
    ()=>jest.fn(()=>mockGlobal)
);

jest.mock(
    "../src/services/StoredUserService",
    ()=>(
        {
            saveStoredUser: jest.fn(),
        }
    )
);

const VALID_USER = {
    id: "user-1",
    username: "Ghazy",
    email: "ghazy@example.com",
};

function setterMap(){
    return new Proxy({}, {
        get(target, property){
            if(!(property in target)){
                target[property] = jest.fn();
            }

            return target[property];
        },
    });
}

function createService(overrides = {}){
    const setters = setterMap();
    const values = {
        loginIdentifier: "Ghazy",
        loginPassword: "Password1",
        registerEmail: "ghazy@example.com",
        registerOTP: "123456",
        registerUsername: "Ghazy",
        registerPassword: "Password1",
        registerConfirmPassword: "Password1",
        forgotEmail: "ghazy@example.com",
        forgotOTP: "654321",
        forgotNewPassword: "NewPassword1",
        forgotConfirmPassword: "NewPassword1",
        updateNavbar: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };

    const service = LoginService(new Proxy(values, {
        get(target, property){
            if(property in target){
                return target[property];
            }

            return setters[property];
        },
    }));

    return {service, setters, values};
}

function response(result){
    return Promise.resolve({
        json: jest.fn().mockResolvedValue(result),
    });
}

describe("authentication service boundaries", ()=>{
    beforeEach(()=>{
        jest.clearAllMocks();
        global.fetch = jest.fn();
        saveStoredUser.mockImplementation(async user=>user);
    });

    test("login persists only the account schema and restores idle loading state", async ()=>{
        fetch.mockReturnValueOnce(response({success: true, ...VALID_USER}));
        const {service, setters, values} = createService();

        await expect(service.loginUser()).resolves.toBe(true);

        expect(saveStoredUser).toHaveBeenCalledWith(VALID_USER);
        expect(values.updateNavbar).toHaveBeenCalledTimes(1);
        expect(mockGlobal.showSuccess).toHaveBeenCalledWith("Login berhasil.");
        expect(mockGlobal.clearLoading).toHaveBeenCalledWith(
            setters.setLoginDisabled,
            setters.setLoginText,
            "Login"
        );
        expect(JSON.stringify(saveStoredUser.mock.calls[0][0]))
            .not.toContain("Password1");
    });

    test("backend credential failure is not confused with persistence", async ()=>{
        fetch.mockReturnValueOnce(response({
            success: false,
            message: "Kredensial tidak valid.",
        }));
        const {service, values} = createService();

        await expect(service.loginUser()).resolves.toBe(false);

        expect(mockGlobal.showError)
            .toHaveBeenCalledWith("Kredensial tidak valid.");
        expect(saveStoredUser).not.toHaveBeenCalled();
        expect(values.updateNavbar).not.toHaveBeenCalled();
    });

    test("network failure has a distinct server error boundary", async ()=>{
        fetch.mockRejectedValueOnce(new Error("offline"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(()=>{});
        const {service} = createService();

        await expect(service.loginUser()).resolves.toBe(false);

        expect(mockGlobal.showError)
            .toHaveBeenCalledWith("Tidak dapat terhubung ke server.");
        expect(saveStoredUser).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test("storage failure is reported after a successful backend login", async ()=>{
        fetch.mockReturnValueOnce(response({success: true, ...VALID_USER}));
        saveStoredUser.mockRejectedValueOnce(new Error("storage unavailable"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(()=>{});
        const {service, values} = createService();

        await expect(service.loginUser()).resolves.toBe(false);

        expect(mockGlobal.showError)
            .toHaveBeenCalledWith("Data akun gagal disimpan.");
        expect(values.updateNavbar).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test("native bootstrap failure does not turn successful login into credential failure", async ()=>{
        fetch.mockReturnValueOnce(response({success: true, ...VALID_USER}));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(()=>{});
        const updateNavbar = jest.fn().mockRejectedValue(new Error("native bridge"));
        const {service} = createService({updateNavbar});

        await expect(service.loginUser()).resolves.toBe(true);

        expect(saveStoredUser).toHaveBeenCalledWith(VALID_USER);
        expect(mockGlobal.showSuccess).toHaveBeenCalledWith("Login berhasil.");
        expect(mockGlobal.showError).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test("registration OTP and registration use their distinct contracts", async ()=>{
        fetch
            .mockReturnValueOnce(response({success: true}))
            .mockReturnValueOnce(response({success: true}))
            .mockReturnValueOnce(response({success: true, ...VALID_USER}));
        const {service, values} = createService();

        await expect(service.continueEmail()).resolves.toBe(true);
        await expect(service.verifyOTP()).resolves.toBe(true);
        await expect(service.registerUser()).resolves.toBe(true);

        expect(fetch.mock.calls[0][0]).toContain("action=sendVerificationOTP");
        expect(fetch.mock.calls[1][0]).toContain("action=verifyOTP");
        expect(fetch.mock.calls[2][0]).toContain("action=register");
        expect(saveStoredUser).toHaveBeenCalledWith(VALID_USER);
        expect(values.updateNavbar).toHaveBeenCalledTimes(1);
    });

    test("reset-password stages never persist a password", async ()=>{
        fetch
            .mockReturnValueOnce(response({success: true}))
            .mockReturnValueOnce(response({success: true}))
            .mockReturnValueOnce(response({success: true, message: "Reset berhasil."}));
        const {service} = createService();

        await expect(service.forgotContinue()).resolves.toBe(true);
        await expect(service.verifyResetOTP()).resolves.toBe(true);
        await expect(service.resetPassword()).resolves.toBe(true);

        expect(fetch.mock.calls[0][0]).toContain("action=sendResetOTP");
        expect(fetch.mock.calls[1][0]).toContain("action=verifyResetOTP");
        expect(fetch.mock.calls[2][0]).toContain("action=resetPassword");
        expect(saveStoredUser).not.toHaveBeenCalled();
    });
});
