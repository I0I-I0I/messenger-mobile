import { getDb } from "@/src/db";
import type { UserRow } from "@/src/db/types";

type DbUserRow = {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    created_at: number;
    updated_at: number;
    password_hash: string | null;
};

function toUserRow(row: DbUserRow): UserRow {
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatar: row.avatar_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        passwordHash: row.password_hash ?? undefined,
    };
}

export async function getUserById(userId: string) {
    const db = await getDb();
    const row = await db.getFirstAsync<DbUserRow>(
        `SELECT
            id,
            username,
            display_name,
            avatar_url,
            created_at,
            updated_at,
            password_hash
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [userId],
    );

    return row ? toUserRow(row) : null;
}

export async function searchUsers(query: string, limit: number) {
    const db = await getDb();
    const normalized = query.trim().toLowerCase();

    const rows = normalized
        ? await db.getAllAsync<DbUserRow>(
              `SELECT
                    id,
                    username,
                    display_name,
                    avatar_url,
                    created_at,
                    updated_at,
                    password_hash
               FROM users
               WHERE lower(username) LIKE ? OR lower(display_name) LIKE ?
               ORDER BY created_at DESC
               LIMIT ?`,
              [`%${normalized}%`, `%${normalized}%`, Math.max(0, limit)],
          )
        : await db.getAllAsync<DbUserRow>(
              `SELECT
                    id,
                    username,
                    display_name,
                    avatar_url,
                    created_at,
                    updated_at,
                    password_hash
               FROM users
               ORDER BY created_at DESC
               LIMIT ?`,
              [Math.max(0, limit)],
          );

    return rows.map(toUserRow);
}

export async function upsertUser(input: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    passwordHash?: string;
}) {
    const db = await getDb();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO users (
            id,
            username,
            display_name,
            avatar_url,
            created_at,
            updated_at,
            password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            username = excluded.username,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at,
            password_hash = COALESCE(excluded.password_hash, users.password_hash);`,
        [
            input.id,
            input.username,
            input.displayName,
            input.avatar ?? "",
            now,
            now,
            input.passwordHash ?? null,
        ],
    );

    return getUserById(input.id);
}

export async function findUserByUsername(username: string) {
    const db = await getDb();
    const normalized = username.trim().toLowerCase();

    const row = await db.getFirstAsync<DbUserRow>(
        `SELECT
            id,
            username,
            display_name,
            avatar_url,
            created_at,
            updated_at,
            password_hash
         FROM users
         WHERE lower(username) = ?
         LIMIT 1`,
        [normalized],
    );

    return row ? toUserRow(row) : null;
}
