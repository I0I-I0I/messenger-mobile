jest.mock("@/src/repository/sessionRepository", () => ({
    clearSession: jest.fn(),
    getSession: jest.fn(),
    setSession: jest.fn(),
}));

jest.mock("@/src/sync/bootstrap", () => ({
    runBootstrapSync: jest.fn(),
}));

jest.mock("@/src/transport/rest/auth", () => ({
    loginRequest: jest.fn(),
    logoutRequest: jest.fn(),
    registerRequest: jest.fn(),
}));

jest.mock("@/src/domain/validators", () => ({
    validateRegistrationInput: jest.fn(),
}));

import {
    hydrateSession,
    loginWithPassword,
    logoutCurrentSession,
    registerWithPassword,
} from "@/src/usecases/auth";
import * as sessionRepository from "@/src/repository/sessionRepository";
import * as bootstrapSync from "@/src/sync/bootstrap";
import * as authTransport from "@/src/transport/rest/auth";
import * as validators from "@/src/domain/validators";

const mockedClearSession = jest.mocked(sessionRepository.clearSession);
const mockedGetSession = jest.mocked(sessionRepository.getSession);
const mockedSetSession = jest.mocked(sessionRepository.setSession);
const mockedRunBootstrapSync = jest.mocked(bootstrapSync.runBootstrapSync);
const mockedLoginRequest = jest.mocked(authTransport.loginRequest);
const mockedLogoutRequest = jest.mocked(authTransport.logoutRequest);
const mockedRegisterRequest = jest.mocked(authTransport.registerRequest);
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

    it("loginWithPassword stores session and runs bootstrap", async () => {
        mockedLoginRequest.mockResolvedValue({
            id: "1",
            username: "alice",
        } as any);
        mockedRunBootstrapSync.mockResolvedValue(undefined);

        await expect(
            loginWithPassword({ username: "alice", password: "pass123" }),
        ).resolves.toEqual({ userId: "1" });
        expect(mockedSetSession).toHaveBeenCalledWith("1");
        expect(mockedRunBootstrapSync).toHaveBeenCalledWith("1");
    });

    it("loginWithPassword maps transport errors to code", async () => {
        mockedLoginRequest.mockRejectedValue(new Error("INVALID_CREDENTIALS"));

        await expect(
            loginWithPassword({ username: "alice", password: "pass123" }),
        ).rejects.toThrow("INVALID_CREDENTIALS");
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
        expect(mockedRegisterRequest).not.toHaveBeenCalled();
    });

    it("registerWithPassword stores session and runs bootstrap", async () => {
        mockedValidateRegistrationInput.mockReturnValue(null);
        mockedRegisterRequest.mockResolvedValue({
            id: "42",
            username: "alice",
            display_name: "Alice",
        } as any);
        mockedRunBootstrapSync.mockResolvedValue(undefined);

        await expect(
            registerWithPassword({
                username: "alice",
                displayName: "Alice",
                password: "pass123",
            }),
        ).resolves.toEqual({ userId: "42" });
        expect(mockedRegisterRequest).toHaveBeenCalledWith({
            username: "alice",
            display_name: "Alice",
            password: "pass123",
        });
        expect(mockedSetSession).toHaveBeenCalledWith("42");
        expect(mockedRunBootstrapSync).toHaveBeenCalledWith("42");
    });

    it("logoutCurrentSession clears session even if backend logout fails", async () => {
        mockedLogoutRequest.mockRejectedValue(new Error("NETWORK_ERROR"));

        await logoutCurrentSession();
        expect(mockedClearSession).toHaveBeenCalledTimes(1);
    });
});
