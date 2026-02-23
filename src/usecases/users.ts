import { searchUsers as searchUsersLocal } from "@/src/repository/userRepository";
import { normalizeUser, toMillis } from "@/src/sync/normalizers";
import { searchUsersRequest } from "@/src/transport/rest/users";
import type { ApiUserDto } from "@/src/transport/rest/types";

export async function searchUsersByQuery(input: {
    query?: string;
    limit?: number;
}) {
    const query = input.query ?? "";
    const limit = input.limit ?? 10;
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
        return [];
    }

    try {
        const remoteUsers = await searchUsersRequest({
            query: normalizedQuery,
            limit,
        });
        const users = Array.isArray(remoteUsers) ? remoteUsers : [];

        return users
            .map((user) => normalizeUser(user) ?? coerceUser(user))
            .filter((user): user is NonNullable<typeof user> => user !== null)
            .map((user) => ({
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                createdAt: user.createdAt,
            }));
    } catch {
        return searchUsersLocal(normalizedQuery, limit);
    }
}

function coerceUser(value: ApiUserDto | unknown) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.id !== "string") {
        return null;
    }
    const username =
        typeof record.username === "string" && record.username.length > 0
            ? record.username
            : record.id;
    const displayName =
        typeof record.display_name === "string" &&
        record.display_name.length > 0
            ? record.display_name
            : typeof record.displayName === "string" &&
                record.displayName.length > 0
              ? record.displayName
              : username;
    const avatar =
        typeof record.avatar_url === "string"
            ? record.avatar_url
            : typeof record.avatar === "string"
              ? record.avatar
              : record.avatar === null
                ? null
                : null;
    const now = Date.now();
    return {
        id: record.id,
        username,
        displayName,
        avatar,
        createdAt: toMillis(record.created_at ?? record.createdAt, now),
    };
}
