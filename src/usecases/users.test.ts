jest.mock("@/src/repository/userRepository", () => ({
    searchUsers: jest.fn(),
}));

jest.mock("@/src/transport/rest/users", () => ({
    searchUsersRequest: jest.fn(),
}));

import { searchUsersByQuery } from "@/src/usecases/users";
import * as userRepository from "@/src/repository/userRepository";
import * as usersTransport from "@/src/transport/rest/users";
import { ApiError } from "@/src/transport/rest/client";

const mockedSearchUsersLocal = jest.mocked(userRepository.searchUsers);
const mockedSearchUsersRequest = jest.mocked(usersTransport.searchUsersRequest);

describe("users usecases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("uses remote search when query is provided", async () => {
        mockedSearchUsersRequest.mockResolvedValue([
            {
                id: "1",
                username: "alice",
                display_name: "Alice",
                avatar_url: "",
                created_at: 1_700_000_000_000,
                updated_at: 1_700_000_000_000,
            },
        ] as any);

        const result = await searchUsersByQuery({ query: "alice" });
        expect(mockedSearchUsersRequest).toHaveBeenCalledWith({
            query: "alice",
            limit: 10,
        });
        expect(result).toEqual([
            {
                id: "1",
                username: "alice",
                displayName: "Alice",
                avatar: "",
                createdAt: 1_700_000_000_000,
            },
        ]);
    });

    it("returns empty result without remote search when query is empty", async () => {
        await expect(searchUsersByQuery({})).resolves.toEqual([]);
        expect(mockedSearchUsersRequest).not.toHaveBeenCalled();
    });

    it("falls back to local search when API is unavailable", async () => {
        mockedSearchUsersRequest.mockRejectedValue(
            new ApiError({
                status: 0,
                code: "NETWORK_ERROR",
                message: "Network error",
            }),
        );
        mockedSearchUsersLocal.mockResolvedValue([{ id: "2" }] as any);

        const result = await searchUsersByQuery({ query: "alice", limit: 25 });
        expect(mockedSearchUsersLocal).toHaveBeenCalledWith("alice", 25);
        expect(result).toEqual([{ id: "2" }]);
    });

    it("falls back to local search for unexpected runtime errors", async () => {
        mockedSearchUsersRequest.mockRejectedValue(
            new TypeError("Cannot read properties of undefined"),
        );
        mockedSearchUsersLocal.mockResolvedValue([{ id: "fallback" }] as any);

        const result = await searchUsersByQuery({ query: "alice" });
        expect(mockedSearchUsersLocal).toHaveBeenCalledWith("alice", 10);
        expect(result).toEqual([{ id: "fallback" }]);
    });

    it("skips malformed remote users without crashing", async () => {
        mockedSearchUsersRequest.mockResolvedValue([
            null,
            42,
            { id: "ok", username: "okay", display_name: "Okay" },
            { username: "missing-id" },
        ] as any);

        const result = await searchUsersByQuery({ query: "ok" });
        expect(result).toEqual([
            {
                id: "ok",
                username: "okay",
                displayName: "Okay",
                avatar: null,
                createdAt: expect.any(Number),
            },
        ]);
    });
});
