import { searchUsers as searchUsersLocal } from "@/src/repository/userRepository";
import { applyUsers } from "@/src/sync/applyServerData";
import { normalizeUser } from "@/src/sync/normalizers";
import { ApiError } from "@/src/transport/rest/client";
import { searchUsersRequest } from "@/src/transport/rest/users";

export async function searchUsersByQuery(input: {
    query?: string;
    limit?: number;
}) {
    const query = input.query ?? "";
    const limit = input.limit ?? 10;
    const normalizedQuery = query.trim();

    try {
        const remoteUsers = await searchUsersRequest({
            query: normalizedQuery ? normalizedQuery : undefined,
            limit,
        });
        await applyUsers(remoteUsers);
        let result = remoteUsers
            .map((user) => normalizeUser(user))
            .filter((user): user is NonNullable<typeof user> => user !== null)
            .map((user) => ({
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                createdAt: user.createdAt,
            }));
        return result;
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }

        return searchUsersLocal(normalizedQuery, limit);
    }
}
