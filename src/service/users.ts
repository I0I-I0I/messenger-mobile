import { User } from "../domain/types";
import { MOCK_USERS } from "./mockData";

export const searchUsers = async ({
    limit = 10,
}: {
    limit?: number;
}): Promise<User[]> => {
    return Promise.resolve(MOCK_USERS.slice(0, Math.max(0, limit)));
};
