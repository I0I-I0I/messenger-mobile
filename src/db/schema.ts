import type { SQLiteDatabase } from "expo-sqlite";

import { createId } from "@/src/domain/id";
import {
    INITIAL_MESSAGES_BY_CHAT_ID,
    MOCK_CHATS,
    MOCK_USERS,
} from "@/src/service/mockData";

export const DB_VERSION = 2;

const DEMO_PASSWORD_HASH_FOR_USER_1 =
    "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

function conversationIdForPair(a: string, b: string) {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

const CREATE_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        password_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY NOT NULL,
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_message_preview TEXT NOT NULL DEFAULT '',
        last_message_at INTEGER NOT NULL,
        unread_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
        server_echo INTEGER NOT NULL DEFAULT 0 CHECK (server_echo IN (0, 1)),
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
        ON messages (conversation_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL,
        next_retry_at INTEGER NOT NULL
    );
`;

const REQUIRED_COLUMNS: Record<string, string[]> = {
    users: [
        "id",
        "username",
        "display_name",
        "avatar_url",
        "created_at",
        "updated_at",
        "password_hash",
    ],
    conversations: [
        "id",
        "user_a",
        "user_b",
        "created_at",
        "updated_at",
        "last_message_preview",
        "last_message_at",
        "unread_count",
    ],
    messages: [
        "id",
        "conversation_id",
        "sender_id",
        "content",
        "created_at",
        "status",
        "server_echo",
    ],
    outbox: [
        "id",
        "type",
        "payload_json",
        "created_at",
        "attempts",
        "next_retry_at",
    ],
};

async function hasRequiredColumns(
    db: SQLiteDatabase,
    tableName: string,
    requiredColumns: string[],
) {
    const rows = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${tableName});`,
    );
    const columnNames = new Set(rows.map((row) => row.name));
    return requiredColumns.every((column) => columnNames.has(column));
}

async function hasSchemaMismatch(db: SQLiteDatabase) {
    for (const [tableName, requiredColumns] of Object.entries(
        REQUIRED_COLUMNS,
    )) {
        const ok = await hasRequiredColumns(db, tableName, requiredColumns);
        if (!ok) {
            return true;
        }
    }
    return false;
}

async function recreateSchema(db: SQLiteDatabase) {
    await db.execAsync(`
        DROP TABLE IF EXISTS messages;
        DROP TABLE IF EXISTS outbox;
        DROP TABLE IF EXISTS conversations;
        DROP TABLE IF EXISTS users;
    `);
    await db.execAsync(CREATE_SCHEMA_SQL);
}

export async function applyMigrations(db: SQLiteDatabase) {
    const versionRow = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
    );
    const currentVersion = versionRow?.user_version ?? 0;
    let migrated = false;

    if (currentVersion < 1) {
        await db.execAsync(CREATE_SCHEMA_SQL);
        migrated = true;
    }

    const mismatch = await hasSchemaMismatch(db);
    if (mismatch) {
        await recreateSchema(db);
        migrated = true;
    }

    if (migrated || currentVersion < DB_VERSION) {
        await db.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
    }
}

export async function seedDatabaseIfEmpty(db: SQLiteDatabase) {
    const usersCountRow = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM users",
    );

    if ((usersCountRow?.count ?? 0) > 0) {
        return;
    }

    const now = Date.now();

    await db.withTransactionAsync(async () => {
        for (const user of MOCK_USERS) {
            await db.runAsync(
                `INSERT INTO users (
                    id, username, display_name, avatar_url, created_at, updated_at, password_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                [
                    user.id,
                    user.username,
                    user.displayName,
                    user.avatar,
                    user.createdAt,
                    now,
                    user.id === "1" ? DEMO_PASSWORD_HASH_FOR_USER_1 : null,
                ],
            );
        }

        const conversations = new Map<
            string,
            {
                id: string;
                userA: string;
                userB: string;
                createdAt: number;
            }
        >();

        for (const chat of MOCK_CHATS) {
            const id = conversationIdForPair(chat.userA, chat.userB);
            const userA = chat.userA < chat.userB ? chat.userA : chat.userB;
            const userB = chat.userA < chat.userB ? chat.userB : chat.userA;
            const existing = conversations.get(id);

            if (!existing || chat.createdAt < existing.createdAt) {
                conversations.set(id, {
                    id,
                    userA,
                    userB,
                    createdAt: chat.createdAt,
                });
            }
        }

        for (const conversation of conversations.values()) {
            await db.runAsync(
                `INSERT INTO conversations (
                    id, user_a, user_b, created_at, updated_at, last_message_preview, last_message_at, unread_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    conversation.id,
                    conversation.userA,
                    conversation.userB,
                    conversation.createdAt,
                    conversation.createdAt,
                    "",
                    conversation.createdAt,
                    0,
                ],
            );
        }

        for (const chat of MOCK_CHATS) {
            const conversationId = conversationIdForPair(
                chat.userA,
                chat.userB,
            );
            const list = INITIAL_MESSAGES_BY_CHAT_ID[chat.id] ?? [];

            for (const item of list) {
                await db.runAsync(
                    `INSERT INTO messages (
                        id, conversation_id, sender_id, content, created_at, status, server_echo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    [
                        createId("seed_msg"),
                        conversationId,
                        item.senderId,
                        item.content,
                        item.createdAt,
                        "sent",
                        1,
                    ],
                );
            }
        }

        await db.execAsync(`
            UPDATE conversations
            SET
                last_message_at = COALESCE(
                    (
                        SELECT MAX(m.created_at)
                        FROM messages m
                        WHERE m.conversation_id = conversations.id
                    ),
                    conversations.last_message_at
                ),
                updated_at = COALESCE(
                    (
                        SELECT MAX(m.created_at)
                        FROM messages m
                        WHERE m.conversation_id = conversations.id
                    ),
                    conversations.updated_at
                ),
                last_message_preview = COALESCE(
                    (
                        SELECT m2.content
                        FROM messages m2
                        WHERE m2.conversation_id = conversations.id
                        ORDER BY m2.created_at DESC
                        LIMIT 1
                    ),
                    conversations.last_message_preview
                );
        `);
    });
}
