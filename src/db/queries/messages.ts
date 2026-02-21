import { getDb } from "@/src/db";
import type { MessageRow, MessageStatus } from "@/src/db/types";

type DbMessageRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: number;
    status: MessageStatus;
    server_echo: number;
};

function toMessageRow(row: DbMessageRow): MessageRow {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        createdAt: row.created_at,
        status: row.status,
        serverEcho: row.server_echo === 1 ? 1 : 0,
    };
}

export async function listMessagesByConversation(conversationId: string) {
    const db = await getDb();
    const rows = await db.getAllAsync<DbMessageRow>(
        `SELECT
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            status,
            server_echo
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
        [conversationId],
    );

    return rows.map(toMessageRow);
}

export async function insertMessage(input: MessageRow) {
    const db = await getDb();

    await db.runAsync(
        `INSERT INTO messages (
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            status,
            server_echo
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
            input.id,
            input.conversationId,
            input.senderId,
            input.content,
            input.createdAt,
            input.status,
            input.serverEcho,
        ],
    );

    return input;
}

export async function getLastMessageForConversation(conversationId: string) {
    const db = await getDb();
    const row = await db.getFirstAsync<DbMessageRow>(
        `SELECT
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            status,
            server_echo
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [conversationId],
    );

    return row ? toMessageRow(row) : null;
}

export async function updateMessageStatus(
    messageId: string,
    status: MessageStatus,
) {
    const db = await getDb();

    await db.runAsync(
        `UPDATE messages
         SET status = ?, server_echo = CASE WHEN ? = 'sent' THEN 1 ELSE server_echo END
         WHERE id = ?`,
        [status, status, messageId],
    );

    const updated = await db.getFirstAsync<DbMessageRow>(
        `SELECT
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            status,
            server_echo
         FROM messages
         WHERE id = ?
         LIMIT 1`,
        [messageId],
    );

    return updated ? toMessageRow(updated) : null;
}
