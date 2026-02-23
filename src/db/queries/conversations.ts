import { getDb } from "@/src/db";
import type { ConversationRow } from "@/src/db/types";
import { emitConversationsChanged } from "@/src/sync/dataEvents";

type DbConversationRow = {
    id: string;
    user_a: string;
    user_b: string;
    created_at: number;
    updated_at: number;
    server_updated_at: number | null;
    last_message_preview: string;
    last_message_at: number;
    unread_count: number;
};

function toConversationRow(row: DbConversationRow): ConversationRow {
    return {
        id: row.id,
        userA: row.user_a,
        userB: row.user_b,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        serverUpdatedAt: row.server_updated_at ?? undefined,
        lastMessagePreview: row.last_message_preview,
        lastMessageAt: row.last_message_at,
        unreadCount: row.unread_count,
    };
}

export function conversationIdForPair(a: string, b: string) {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export async function getConversationById(conversationId: string) {
    const db = await getDb();
    const row = await db.getFirstAsync<DbConversationRow>(
        `SELECT
            id,
            user_a,
            user_b,
            created_at,
            updated_at,
            server_updated_at,
            last_message_preview,
            last_message_at,
            unread_count
         FROM conversations
         WHERE id = ?
         LIMIT 1`,
        [conversationId],
    );

    return row ? toConversationRow(row) : null;
}

export async function upsertConversation(input: {
    id: string;
    userA: string;
    userB: string;
    createdAt: number;
    updatedAt: number;
    serverUpdatedAt?: number;
    lastMessagePreview?: string;
    lastMessageAt?: number;
    unreadCount?: number;
}) {
    const db = await getDb();

    await db.runAsync(
        `INSERT INTO conversations (
            id,
            user_a,
            user_b,
            created_at,
            updated_at,
            server_updated_at,
            last_message_preview,
            last_message_at,
            unread_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            user_a = excluded.user_a,
            user_b = excluded.user_b,
            updated_at = excluded.updated_at,
            server_updated_at = COALESCE(excluded.server_updated_at, conversations.server_updated_at),
            last_message_preview = excluded.last_message_preview,
            last_message_at = excluded.last_message_at,
            unread_count = excluded.unread_count;`,
        [
            input.id,
            input.userA,
            input.userB,
            input.createdAt,
            input.updatedAt,
            input.serverUpdatedAt ?? null,
            input.lastMessagePreview ?? "",
            input.lastMessageAt ?? input.updatedAt,
            input.unreadCount ?? 0,
        ],
    );

    emitConversationsChanged(input.id);
    return getConversationById(input.id);
}

export async function findOrCreateDirectConversation(
    currentUserId: string,
    otherUserId: string,
) {
    const id = conversationIdForPair(currentUserId, otherUserId);
    const userA = currentUserId < otherUserId ? currentUserId : otherUserId;
    const userB = currentUserId < otherUserId ? otherUserId : currentUserId;

    const existing = await getConversationById(id);
    if (existing) {
        return existing;
    }

    const now = Date.now();
    const created = await upsertConversation({
        id,
        userA,
        userB,
        createdAt: now,
        updatedAt: now,
    });

    if (!created) {
        throw new Error("CONVERSATION_CREATE_FAILED");
    }

    return created;
}

export async function listConversationsForUser(userId: string) {
    const db = await getDb();
    const rows = await db.getAllAsync<DbConversationRow>(
        `SELECT
            id,
            user_a,
            user_b,
            created_at,
            updated_at,
            server_updated_at,
            last_message_preview,
            last_message_at,
            unread_count
         FROM conversations
         WHERE user_a = ? OR user_b = ?
         ORDER BY last_message_at DESC`,
        [userId, userId],
    );

    return rows.map(toConversationRow);
}

export async function listConversationIdsForUser(userId: string) {
    const db = await getDb();
    const rows = await db.getAllAsync<{ id: string }>(
        `SELECT id
         FROM conversations
         WHERE user_a = ? OR user_b = ?
         ORDER BY last_message_at DESC`,
        [userId, userId],
    );

    return rows.map((row) => row.id);
}

export async function touchConversation(
    conversationId: string,
    input: { lastMessagePreview: string; lastMessageAt: number },
) {
    const db = await getDb();

    await db.runAsync(
        `UPDATE conversations
         SET
            last_message_preview = ?,
            last_message_at = ?,
            updated_at = ?
         WHERE id = ?`,
        [
            input.lastMessagePreview,
            input.lastMessageAt,
            input.lastMessageAt,
            conversationId,
        ],
    );

    emitConversationsChanged(conversationId);
    return getConversationById(conversationId);
}

export async function updateConversationFromServer(input: {
    conversationId: string;
    serverUpdatedAt: number;
    lastMessagePreview: string;
    lastMessageAt: number;
}) {
    const existing = await getConversationById(input.conversationId);
    if (!existing) {
        return null;
    }

    if (
        typeof existing.serverUpdatedAt === "number" &&
        existing.serverUpdatedAt > input.serverUpdatedAt
    ) {
        return existing;
    }

    const db = await getDb();
    await db.runAsync(
        `UPDATE conversations
         SET
            last_message_preview = ?,
            last_message_at = ?,
            updated_at = ?,
            server_updated_at = ?
         WHERE id = ?`,
        [
            input.lastMessagePreview,
            input.lastMessageAt,
            input.serverUpdatedAt,
            input.serverUpdatedAt,
            input.conversationId,
        ],
    );

    emitConversationsChanged(input.conversationId);
    return getConversationById(input.conversationId);
}
