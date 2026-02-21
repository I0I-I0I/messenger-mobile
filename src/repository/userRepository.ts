import type { User } from "@/src/domain/types";
import { findUserByUsername, getUserById, searchUsers as searchUserRows, upsertUser } from "@/src/db/queries/users";

function toUser(row: Awaited<ReturnType<typeof getUserById>>): User | null {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatar: row.avatar,
        createdAt: row.createdAt,
    };
}

export async function getUser(userId: string) {
    const row = await getUserById(userId);
    return toUser(row);
}

export async function searchUsers(query: string, limit = 10): Promise<User[]> {
    const rows = await searchUserRows(query, limit);
    return rows.map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatar: row.avatar,
        createdAt: row.createdAt,
    }));
}

export async function createUser(input: {
    username: string;
    displayName: string;
    passwordHash: string;
}) {
    const id = input.username.toLowerCase();
    const row = await upsertUser({
        id,
        username: input.username,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(id)}`,
    });

    return toUser(row);
}

export async function getUserAuthByUsername(username: string) {
    const row = await findUserByUsername(username);
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        passwordHash: row.passwordHash ?? "",
    };
}
