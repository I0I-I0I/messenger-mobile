import { createId } from "@/src/domain/id";
import type { Message } from "@/src/domain/types";
import { touchConversation } from "@/src/db/queries/conversations";
import { enqueueOutbox } from "@/src/db/queries/outbox";
import { insertMessage, listMessagesByConversation, updateMessageStatus } from "@/src/db/queries/messages";

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

    const inserted = await insertMessage({
        id: messageId,
        conversationId: input.chatId,
        senderId: input.senderId,
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
