import { User } from "../domain/types";
import { MOCK_USERS } from "./mockData";

export const searchUsers = async ({
    query = "",
    limit = 10,
}: {
    query?: string;
    limit?: number;
}): Promise<User[]> => {
    return Promise.resolve(
        MOCK_USERS.slice(0, Math.max(0, limit)).filter((user) => {
            if (!query) {
                return true;
            }
            const users_with_username = user.username
                .toLowerCase()
                .includes(query.toLowerCase());
            const users_with_displayName = user.displayName
                .toLowerCase()
                .includes(query.toLowerCase());
            return users_with_username || users_with_displayName;
        }),
    );
};
