jest.mock("@/src/repository/userRepository", () => ({
    createUser: jest.fn(),
    getUserAuthByUsername: jest.fn(),
}));

jest.mock("@/src/repository/sessionRepository", () => ({
    clearSession: jest.fn(),
    getSession: jest.fn(),
    setSession: jest.fn(),
}));

jest.mock("@/src/domain/validators", () => ({
    hashPassword: jest.fn(),
    validateRegistrationInput: jest.fn(),
}));

import {
    hydrateSession,
    loginWithPassword,
    logoutCurrentSession,
    registerWithPassword,
} from "@/src/usecases/auth";
import * as sessionRepository from "@/src/repository/sessionRepository";
import * as userRepository from "@/src/repository/userRepository";
import * as validators from "@/src/domain/validators";

const mockedCreateUser = jest.mocked(userRepository.createUser);
const mockedGetUserAuthByUsername = jest.mocked(
    userRepository.getUserAuthByUsername,
);
const mockedClearSession = jest.mocked(sessionRepository.clearSession);
const mockedGetSession = jest.mocked(sessionRepository.getSession);
const mockedSetSession = jest.mocked(sessionRepository.setSession);
const mockedHashPassword = jest.mocked(validators.hashPassword);
const mockedValidateRegistrationInput = jest.mocked(
    validators.validateRegistrationInput,
);

describe("auth usecases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("hydrateSession returns current session", async () => {
        const session = { userId: "1" };
        mockedGetSession.mockResolvedValue(session);

        await expect(hydrateSession()).resolves.toEqual(session);
        expect(mockedGetSession).toHaveBeenCalledTimes(1);
    });

    it("loginWithPassword throws when user does not exist", async () => {
        mockedGetUserAuthByUsername.mockResolvedValue(null);

        await expect(
            loginWithPassword({ username: "alice", password: "pass123" }),
        ).rejects.toThrow("USER_NOT_FOUND");
        expect(mockedSetSession).not.toHaveBeenCalled();
    });

    it("loginWithPassword throws when password hash does not match", async () => {
        mockedGetUserAuthByUsername.mockResolvedValue({
            id: "1",
            passwordHash: "stored_hash",
        });
        mockedHashPassword.mockResolvedValue("other_hash");

        await expect(
            loginWithPassword({ username: "alice", password: "pass123" }),
        ).rejects.toThrow("INVALID_PASSWORD");
        expect(mockedSetSession).not.toHaveBeenCalled();
    });

    it("loginWithPassword stores session on success", async () => {
        mockedGetUserAuthByUsername.mockResolvedValue({
            id: "1",
            passwordHash: "stored_hash",
        });
        mockedHashPassword.mockResolvedValue("stored_hash");

        await expect(
            loginWithPassword({ username: "alice", password: "pass123" }),
        ).resolves.toEqual({ userId: "1" });
        expect(mockedSetSession).toHaveBeenCalledWith("1");
    });

    it("registerWithPassword throws when validation fails", async () => {
        mockedValidateRegistrationInput.mockReturnValue(
            "Пароль должен содержать не менее 6 символов.",
        );

        await expect(
            registerWithPassword({
                username: "a",
                displayName: "b",
                password: "123",
            }),
        ).rejects.toThrow("Пароль должен содержать не менее 6 символов.");
        expect(mockedCreateUser).not.toHaveBeenCalled();
    });

    it("registerWithPassword throws when username is taken", async () => {
        mockedValidateRegistrationInput.mockReturnValue(null);
        mockedGetUserAuthByUsername.mockResolvedValue({
            id: "1",
            passwordHash: "stored_hash",
        });

        await expect(
            registerWithPassword({
                username: "alice",
                displayName: "Alice",
                password: "pass123",
            }),
        ).rejects.toThrow("USERNAME_TAKEN");
        expect(mockedCreateUser).not.toHaveBeenCalled();
    });

    it("registerWithPassword throws when createUser returns null", async () => {
        mockedValidateRegistrationInput.mockReturnValue(null);
        mockedGetUserAuthByUsername.mockResolvedValue(null);
        mockedHashPassword.mockResolvedValue("hash");
        mockedCreateUser.mockResolvedValue(null);

        await expect(
            registerWithPassword({
                username: "alice",
                displayName: "Alice",
                password: "pass123",
            }),
        ).rejects.toThrow("REGISTER_FAILED");
        expect(mockedSetSession).not.toHaveBeenCalled();
    });

    it("registerWithPassword stores session on success", async () => {
        mockedValidateRegistrationInput.mockReturnValue(null);
        mockedGetUserAuthByUsername.mockResolvedValue(null);
        mockedHashPassword.mockResolvedValue("hash");
        mockedCreateUser.mockResolvedValue({
            id: "42",
            username: "alice",
            displayName: "Alice",
            avatar: "",
            createdAt: Date.now(),
        });

        await expect(
            registerWithPassword({
                username: "alice",
                displayName: "Alice",
                password: "pass123",
            }),
        ).resolves.toEqual({ userId: "42" });
        expect(mockedCreateUser).toHaveBeenCalledWith({
            username: "alice",
            displayName: "Alice",
            passwordHash: "hash",
        });
        expect(mockedSetSession).toHaveBeenCalledWith("42");
    });

    it("logoutCurrentSession clears persisted session", async () => {
        await logoutCurrentSession();
        expect(mockedClearSession).toHaveBeenCalledTimes(1);
    });
});
