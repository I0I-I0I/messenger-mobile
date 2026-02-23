import { createId } from "@/src/domain/id";
import type { Message } from "@/src/domain/types";
import { touchConversation } from "@/src/db/queries/conversations";
import { enqueueOutbox } from "@/src/db/queries/outbox";
import {
    getMessageByClientMessageId,
    getMessageById,
    getMessageByServerId,
    insertMessage,
    listMessagesByConversation,
    updateMessageDelivery,
    updateMessageStatus,
} from "@/src/db/queries/messages";

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
    return updated ? toMessage(updated) : null;
}

export async function markMessageAsFailed(messageId: string) {
    const updated = await updateMessageStatus(messageId, "failed");
    return updated ? toMessage(updated) : null;
}

async function resolveExistingMessage(input: {
    localMessageId?: string;
    senderId: string;
    clientMessageId?: string;
    serverId: string;
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
        localMessageId: input.localMessageId,
        senderId: input.senderId,
        clientMessageId: input.clientMessageId,
        serverId: input.serverId,
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
            return toMessage(updated);
        }
    }

    const inserted = await insertMessage({
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

    await touchConversation(input.conversationId, {
        lastMessagePreview: inserted.content,
        lastMessageAt: inserted.createdAt,
    });

    return toMessage(inserted);
}
