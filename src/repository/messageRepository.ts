import { createId } from "@/src/domain/id";
import type { Message } from "@/src/domain/types";
import { touchConversation } from "@/src/db/queries/conversations";
import { enqueueOutbox } from "@/src/db/queries/outbox";
import {
    getMessageByClientMessageId,
    getMessageByConversationAndServerSeq,
    getMessageById,
    getMessageByServerId,
    insertMessage,
    listMessagesByConversation,
    updateMessageDelivery,
    updateMessageStatus,
} from "@/src/db/queries/messages";
import { emitMessagesChanged } from "@/src/sync/dataEvents";

function toMessage(row: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: number;
    status: "pending" | "sent" | "failed";
}): Message {
    return {
        id: row.id,
        chatId: row.conversationId,
        senderId: row.senderId,
        content: row.content,
        createdAt: row.createdAt,
        status: row.status,
    };
}

export async function listMessages(chatId: string): Promise<Message[]> {
    const rows = await listMessagesByConversation(chatId);
    return rows.map((row) => toMessage(row));
}

export async function enqueueSendMessage(input: {
    chatId: string;
    senderId: string;
    content: string;
}) {
    const now = Date.now();
    const messageId = createId("msg");
    const clientMessageId = createId("client_msg");

    const inserted = await insertMessage({
        id: messageId,
        conversationId: input.chatId,
        senderId: input.senderId,
        clientMessageId,
        content: input.content,
        createdAt: now,
        status: "pending",
        serverEcho: 0,
    });

    await touchConversation(input.chatId, {
        lastMessagePreview: input.content,
        lastMessageAt: now,
    });
    emitMessagesChanged(input.chatId);

    await enqueueOutbox({
        id: createId("outbox"),
        type: "send_message",
        payloadJson: JSON.stringify({
            messageId,
            chatId: input.chatId,
            senderId: input.senderId,
            clientMessageId,
            content: input.content,
        }),
        createdAt: now,
        attempts: 0,
        nextRetryAt: now,
    });

    return toMessage(inserted);
}

export async function markMessageAsSent(messageId: string) {
    const updated = await updateMessageStatus(messageId, "sent");
    if (updated) {
        emitMessagesChanged(updated.conversationId);
    }
    return updated ? toMessage(updated) : null;
}

export async function markMessageAsFailed(messageId: string) {
    const updated = await updateMessageStatus(messageId, "failed");
    if (updated) {
        emitMessagesChanged(updated.conversationId);
    }
    return updated ? toMessage(updated) : null;
}

async function resolveExistingMessage(input: {
    conversationId: string;
    localMessageId?: string;
    senderId: string;
    clientMessageId?: string;
    serverId: string;
    serverSeq?: number;
}) {
    if (input.localMessageId) {
        const byLocal = await getMessageById(input.localMessageId);
        if (byLocal) {
            return byLocal;
        }
    }

    const byServer = await getMessageByServerId(input.serverId);
    if (byServer) {
        return byServer;
    }

    if (typeof input.serverSeq === "number") {
        const bySeq = await getMessageByConversationAndServerSeq(
            input.conversationId,
            input.serverSeq,
        );
        if (bySeq) {
            return bySeq;
        }
    }

    if (input.clientMessageId) {
        const byClientId = await getMessageByClientMessageId(
            input.senderId,
            input.clientMessageId,
        );
        if (byClientId) {
            return byClientId;
        }
    }

    return null;
}

export async function upsertServerMessage(input: {
    conversationId: string;
    senderId: string;
    serverId: string;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    serverSeq?: number;
    localMessageId?: string;
}) {
    const existing = await resolveExistingMessage({
        conversationId: input.conversationId,
        localMessageId: input.localMessageId,
        senderId: input.senderId,
        clientMessageId: input.clientMessageId,
        serverId: input.serverId,
        serverSeq: input.serverSeq,
    });

    if (existing) {
        const updated = await updateMessageDelivery({
            messageId: existing.id,
            serverId: input.serverId,
            serverSeq: input.serverSeq,
            serverCreatedAt: input.createdAt,
            content: input.content,
        });
        if (updated) {
            await touchConversation(input.conversationId, {
                lastMessagePreview: updated.content,
                lastMessageAt: updated.createdAt,
            });
            emitMessagesChanged(input.conversationId);
            return toMessage(updated);
        }
    }

    let inserted = null;
    try {
        inserted = await insertMessage({
            id: createId("srv_msg"),
            conversationId: input.conversationId,
            senderId: input.senderId,
            clientMessageId: input.clientMessageId,
            serverId: input.serverId,
            serverSeq: input.serverSeq,
            serverCreatedAt: input.createdAt,
            content: input.content,
            createdAt: input.createdAt,
            status: "sent",
            serverEcho: 1,
        });
    } catch {
        const byServer = await getMessageByServerId(input.serverId);
        if (byServer) {
            inserted = byServer;
        } else if (typeof input.serverSeq === "number") {
            const bySeq = await getMessageByConversationAndServerSeq(
                input.conversationId,
                input.serverSeq,
            );
            if (bySeq) {
                inserted = bySeq;
            }
        }

        if (!inserted) {
            throw new Error("SERVER_MESSAGE_UPSERT_FAILED");
        }
    }

    await touchConversation(input.conversationId, {
        lastMessagePreview: inserted.content,
        lastMessageAt: inserted.createdAt,
    });
    emitMessagesChanged(input.conversationId);

    return toMessage(inserted);
}

export async function reconcilePendingMessageFromRealtime(input: {
    meId: string;
    conversationId: string;
    senderId: string;
    clientMessageId?: string;
    serverId: string;
    serverSeq: number;
    content: string;
    createdAt: number;
}) {
    if (input.senderId !== input.meId || !input.clientMessageId) {
        return null;
    }

    const localPending = await getMessageByClientMessageId(
        input.meId,
        input.clientMessageId,
    );
    if (!localPending) {
        return null;
    }

    const updated = await updateMessageDelivery({
        messageId: localPending.id,
        serverId: input.serverId,
        serverSeq: input.serverSeq,
        serverCreatedAt: input.createdAt,
        content: input.content,
    });
    if (!updated) {
        return null;
    }

    await touchConversation(input.conversationId, {
        lastMessagePreview: updated.content,
        lastMessageAt: updated.createdAt,
    });
    emitMessagesChanged(input.conversationId);

    return toMessage(updated);
}

export async function upsertRemoteMessageFromRealtime(input: {
    conversationId: string;
    senderId: string;
    serverId: string;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    serverSeq: number;
}) {
    return upsertServerMessage({
        conversationId: input.conversationId,
        senderId: input.senderId,
        serverId: input.serverId,
        clientMessageId: input.clientMessageId,
        content: input.content,
        createdAt: input.createdAt,
        serverSeq: input.serverSeq,
    });
}
