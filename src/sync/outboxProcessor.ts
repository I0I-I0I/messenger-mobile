import { listOutboxReady, markOutboxRetry, removeOutboxItem } from "@/src/db/queries/outbox";
import {
    markMessageAsFailed,
    upsertServerMessage,
} from "@/src/repository/messageRepository";
import { normalizeMessage } from "@/src/sync/normalizers";
import { ApiError } from "@/src/transport/rest/client";
import { sendMessageRequest } from "@/src/transport/rest/messages";

const MAX_ATTEMPTS = 5;

type SendMessageOutboxPayload = {
    messageId?: string;
    chatId?: string;
    senderId?: string;
    clientMessageId?: string;
    content?: string;
};

function parsePayload(payloadJson: string): SendMessageOutboxPayload | null {
    try {
        const parsed = JSON.parse(payloadJson) as SendMessageOutboxPayload;
        return parsed;
    } catch {
        return null;
    }
}

function isRetryableError(error: unknown) {
    if (!(error instanceof ApiError)) {
        return true;
    }

    if (error.status === 0 || error.status === 408 || error.status === 429) {
        return true;
    }

    return error.status >= 500;
}

export async function processOutboxOnce() {
    const jobs = await listOutboxReady();

    for (const job of jobs) {
        if (job.type !== "send_message") {
            await removeOutboxItem(job.id);
            continue;
        }

        const payload = parsePayload(job.payloadJson);
        if (
            !payload?.messageId ||
            !payload.chatId ||
            !payload.senderId ||
            !payload.clientMessageId ||
            !payload.content
        ) {
            await removeOutboxItem(job.id);
            continue;
        }

        try {
            const response = await sendMessageRequest({
                conversationId: payload.chatId,
                clientMessageId: payload.clientMessageId,
                content: payload.content,
            });

            const normalized = normalizeMessage({
                ...response,
                conversation_id:
                    response.conversation_id ?? payload.chatId,
                sender_id: response.sender_id ?? payload.senderId,
                client_message_id:
                    response.client_message_id ?? payload.clientMessageId,
            });

            if (!normalized) {
                throw new Error("INVALID_SEND_RESPONSE");
            }

            await upsertServerMessage({
                localMessageId: payload.messageId,
                conversationId: normalized.conversationId,
                senderId: normalized.senderId,
                serverId: normalized.id,
                clientMessageId:
                    normalized.clientMessageId ?? payload.clientMessageId,
                content: normalized.content,
                createdAt: normalized.createdAt,
                serverSeq: normalized.seq,
            });

            await removeOutboxItem(job.id);
        } catch (error) {
            if (job.attempts + 1 >= MAX_ATTEMPTS || !isRetryableError(error)) {
                try {
                    await markMessageAsFailed(payload.messageId);
                } finally {
                    await removeOutboxItem(job.id);
                }
                continue;
            }

            await markOutboxRetry(job.id);
        }
    }
}
