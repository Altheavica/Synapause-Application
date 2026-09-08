import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    USER_READ_STATUS,
    USER_STORAGE_KEY,
    normalizeStoredUser,
    parseStoredUser,
    readStoredUser,
    saveStoredUser,
} from "../src/services/StoredUserService";

jest.mock(
    "@react-native-async-storage/async-storage",
    ()=>require(
        "@react-native-async-storage/async-storage/jest"
    )
);

const VALID_USER = {
    id: "user-1",
    username: "Ghazy",
    email: "ghazy@example.com",
};

describe("stored user validation", ()=>{
    beforeEach(async ()=>{
        await AsyncStorage.clear();
        jest.clearAllMocks();
    });

    test.each([
        ["empty value", ""],
        ["invalid JSON", "{"],
        ["partial object", JSON.stringify({id: "user-1"})],
        ["null field", JSON.stringify({...VALID_USER, email: null})],
        ["wrong field type", JSON.stringify({...VALID_USER, username: {}})],
        ["array", JSON.stringify([VALID_USER])],
    ])("rejects %s", (name, rawValue)=>{
        expect(parseStoredUser(rawValue)).toBeNull();
    });

    test("rejects missing fields and blank strings", ()=>{
        expect(normalizeStoredUser(null)).toBeNull();
        expect(
            normalizeStoredUser({
                ...VALID_USER,
                id: "   ",
            })
        ).toBeNull();
    });

    test("accepts a valid user and ignores harmless extra fields", ()=>{
        expect(
            normalizeStoredUser({
                ...VALID_USER,
                ignored: "value",
            })
        ).toEqual(VALID_USER);
    });

    test("returns missing for an absent account", async ()=>{
        await expect(readStoredUser()).resolves.toEqual({
            status: USER_READ_STATUS.MISSING,
            user: null,
        });
    });

    test("clears an invalid persisted account", async ()=>{
        await AsyncStorage.setItem(
            USER_STORAGE_KEY,
            "{"
        );

        const result = await readStoredUser();

        expect(result.status).toBe(USER_READ_STATUS.INVALID);
        expect(result.user).toBeNull();
        await expect(
            AsyncStorage.getItem(USER_STORAGE_KEY)
        ).resolves.toBeNull();
    });

    test("returns a safe error result when storage cannot be read", async ()=>{
        const storageError = new Error("storage unavailable");
        const consoleSpy = jest
            .spyOn(console, "error")
            .mockImplementation(()=>{});

        const getItemSpy = jest
            .spyOn(AsyncStorage, "getItem")
            .mockRejectedValueOnce(storageError);

        await expect(readStoredUser()).resolves.toEqual({
            status: USER_READ_STATUS.ERROR,
            user: null,
            error: storageError,
        });

        getItemSpy.mockRestore();
        consoleSpy.mockRestore();
    });

    test("saves and reads a normalized valid account", async ()=>{
        await saveStoredUser({
            ...VALID_USER,
            password: "must-not-be-persisted",
        });

        const result = await readStoredUser();

        expect(result).toEqual({
            status: USER_READ_STATUS.VALID,
            user: VALID_USER,
        });
        await expect(
            AsyncStorage.getItem(USER_STORAGE_KEY)
        ).resolves.toBe(JSON.stringify(VALID_USER));
    });

    test("rejects an invalid account write", async ()=>{
        await expect(
            saveStoredUser({
                id: "user-1",
                username: "Ghazy",
            })
        ).rejects.toThrow(TypeError);
    });
});
