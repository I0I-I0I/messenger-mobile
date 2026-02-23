jest.mock("@/src/repository/userRepository", () => ({
    searchUsers: jest.fn(),
}));

jest.mock("@/src/sync/applyServerData", () => ({
    applyUsers: jest.fn(),
}));

jest.mock("@/src/transport/rest/users", () => ({
    searchUsersRequest: jest.fn(),
}));

import { searchUsersByQuery } from "@/src/usecases/users";
import * as userRepository from "@/src/repository/userRepository";
import * as syncApply from "@/src/sync/applyServerData";
import * as usersTransport from "@/src/transport/rest/users";
import { ApiError } from "@/src/transport/rest/client";

const mockedSearchUsersLocal = jest.mocked(userRepository.searchUsers);
const mockedApplyUsers = jest.mocked(syncApply.applyUsers);
const mockedSearchUsersRequest = jest.mocked(usersTransport.searchUsersRequest);

describe("users usecases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("uses remote search and caches users when query is provided", async () => {
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
        mockedApplyUsers.mockResolvedValue(undefined);

        const result = await searchUsersByQuery({ query: "alice" });
        expect(mockedSearchUsersRequest).toHaveBeenCalledWith({
            query: "alice",
            limit: 10,
        });
        expect(mockedApplyUsers).toHaveBeenCalledTimes(1);
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

    it("uses remote search when query is empty", async () => {
        mockedSearchUsersRequest.mockResolvedValue([]);
        mockedApplyUsers.mockResolvedValue(undefined);

        await expect(searchUsersByQuery({})).resolves.toEqual([]);
        expect(mockedSearchUsersRequest).toHaveBeenCalledWith({
            query: undefined,
            limit: 10,
        });
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
});
