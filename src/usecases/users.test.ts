jest.mock("@/src/repository/userRepository", () => ({
    searchUsers: jest.fn(),
}));

import { searchUsersByQuery } from "@/src/usecases/users";
import * as userRepository from "@/src/repository/userRepository";

const mockedSearchUsers = jest.mocked(userRepository.searchUsers);

describe("users usecases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("uses default query and limit when not provided", async () => {
        const rows = [{ id: "1" }] as any;
        mockedSearchUsers.mockResolvedValue(rows);

        await expect(searchUsersByQuery({})).resolves.toEqual(rows);
        expect(mockedSearchUsers).toHaveBeenCalledWith("", 10);
    });

    it("passes explicit query and limit to repository", async () => {
        const rows = [{ id: "2" }] as any;
        mockedSearchUsers.mockResolvedValue(rows);

        await expect(
            searchUsersByQuery({ query: "alice", limit: 25 }),
        ).resolves.toEqual(rows);
        expect(mockedSearchUsers).toHaveBeenCalledWith("alice", 25);
    });
});
