import { getDb } from "@/src/db";
import type { MessageRow, MessageStatus } from "@/src/db/types";

type DbMessageRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    client_message_id: string | null;
    server_id: string | null;
    server_seq: number | null;
    server_created_at: number | null;
    content: string;
    created_at: number;
    status: MessageStatus;
    server_echo: number;
};

type DbConversationCursorRow = {
    conversation_id: string;
    max_seq: number;
};

function toMessageRow(row: DbMessageRow): MessageRow {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        clientMessageId: row.client_message_id ?? undefined,
        serverId: row.server_id ?? undefined,
        serverSeq: row.server_seq ?? undefined,
        serverCreatedAt: row.server_created_at ?? undefined,
        content: row.content,
        createdAt: row.created_at,
        status: row.status,
        serverEcho: row.server_echo === 1 ? 1 : 0,
    };
}

async function getMessageByWhere(
    clause: string,
    args: Array<string | number | null>,
) {
    const db = await getDb();
    const row = await db.getFirstAsync<DbMessageRow>(
        `SELECT
            id,
            conversation_id,
            sender_id,
            client_message_id,
            server_id,
            server_seq,
            server_created_at,
            content,
            created_at,
            status,
            server_echo
         FROM messages
         WHERE ${clause}
         LIMIT 1`,
        args,
    );

    return row ? toMessageRow(row) : null;
}

export async function listMessagesByConversation(conversationId: string) {
    const db = await getDb();
    const rows = await db.getAllAsync<DbMessageRow>(
        `SELECT
            id,
            conversation_id,
            sender_id,
            client_message_id,
            server_id,
            server_seq,
            server_created_at,
            content,
            created_at,
            status,
            server_echo
         FROM messages
         WHERE conversation_id = ?
         ORDER BY
            CASE WHEN server_seq IS NULL THEN 1 ELSE 0 END ASC,
            server_seq ASC,
            created_at ASC`,
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
            client_message_id,
            server_id,
            server_seq,
            server_created_at,
            content,
            created_at,
            status,
            server_echo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
            input.id,
            input.conversationId,
            input.senderId,
            input.clientMessageId ?? null,
            input.serverId ?? null,
            input.serverSeq ?? null,
            input.serverCreatedAt ?? null,
            input.content,
            input.createdAt,
            input.status,
            input.serverEcho,
        ],
    );

    return input;
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

    return getMessageById(messageId);
}

export async function updateMessageDelivery(input: {
    messageId: string;
    serverId: string;
    serverSeq?: number;
    serverCreatedAt?: number;
    content?: string;
}) {
    const db = await getDb();
    const timestamp = input.serverCreatedAt ?? Date.now();

    await db.runAsync(
        `UPDATE messages
         SET
            server_id = ?,
            server_seq = COALESCE(?, server_seq),
            server_created_at = COALESCE(?, server_created_at),
            content = COALESCE(?, content),
            created_at = ?,
            status = 'sent',
            server_echo = 1
         WHERE id = ?`,
        [
            input.serverId,
            input.serverSeq ?? null,
            input.serverCreatedAt ?? null,
            input.content ?? null,
            timestamp,
            input.messageId,
        ],
    );

    return getMessageById(input.messageId);
}

export async function updateMessageByServerId(input: {
    serverId: string;
    conversationId: string;
    senderId: string;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    serverSeq?: number;
    status?: MessageStatus;
}) {
    const db = await getDb();

    await db.runAsync(
        `UPDATE messages
         SET
            conversation_id = ?,
            sender_id = ?,
            client_message_id = COALESCE(?, client_message_id),
            content = ?,
            created_at = ?,
            server_seq = COALESCE(?, server_seq),
            server_created_at = ?,
            status = COALESCE(?, status),
            server_echo = CASE WHEN COALESCE(?, status) = 'sent' THEN 1 ELSE server_echo END
         WHERE server_id = ?`,
        [
            input.conversationId,
            input.senderId,
            input.clientMessageId ?? null,
            input.content,
            input.createdAt,
            input.serverSeq ?? null,
            input.createdAt,
            input.status ?? null,
            input.status ?? null,
            input.serverId,
        ],
    );

    return getMessageByServerId(input.serverId);
}

export async function listConversationServerCursors() {
    const db = await getDb();
    const rows = await db.getAllAsync<DbConversationCursorRow>(
        `SELECT conversation_id, MAX(server_seq) as max_seq
         FROM messages
         WHERE server_seq IS NOT NULL
         GROUP BY conversation_id`,
    );

    const cursors: Record<string, number> = {};
    for (const row of rows) {
        cursors[row.conversation_id] = row.max_seq;
    }

    return cursors;
}

export async function getLastMessageForConversation(conversationId: string) {
    const db = await getDb();
    const row = await db.getFirstAsync<DbMessageRow>(
        `SELECT
            id,
            conversation_id,
            sender_id,
            client_message_id,
            server_id,
            server_seq,
            server_created_at,
            content,
            created_at,
            status,
            server_echo
         FROM messages
         WHERE conversation_id = ?
         ORDER BY
            CASE WHEN server_seq IS NULL THEN 1 ELSE 0 END ASC,
            server_seq DESC,
            created_at DESC
         LIMIT 1`,
        [conversationId],
    );

    return row ? toMessageRow(row) : null;
}

export async function getMessageById(messageId: string) {
    return getMessageByWhere("id = ?", [messageId]);
}

export async function getMessageByServerId(serverId: string) {
    return getMessageByWhere("server_id = ?", [serverId]);
}

export async function getMessageByConversationAndServerSeq(
    conversationId: string,
    serverSeq: number,
) {
    return getMessageByWhere(
        "conversation_id = ? AND server_seq = ?",
        [conversationId, serverSeq],
    );
}

export async function getMessageByClientMessageId(
    senderId: string,
    clientMessageId: string,
) {
    return getMessageByWhere(
        "sender_id = ? AND client_message_id = ?",
        [senderId, clientMessageId],
    );
}
