import { upsertConversation } from "@/src/db/queries/conversations";
import { findOrCreateDirectChat, getChatById, listChatsForUser } from "@/src/repository/chatRepository";
import { applyUsers } from "@/src/sync/applyServerData";
import { normalizeConversation } from "@/src/sync/normalizers";
import { ApiError } from "@/src/transport/rest/client";
import { createDirectConversationRequest } from "@/src/transport/rest/conversations";

export async function loadChats(userId: string) {
    return listChatsForUser(userId);
}

export async function loadChatById(chatId: string) {
    return getChatById(chatId);
}

export async function openOrCreateDirectChat(input: {
    currentUserId: string;
    otherUserId: string;
}) {
    try {
        const response = await createDirectConversationRequest({
            other_user_id: input.otherUserId,
        });
        const normalized = normalizeConversation(
            response,
            input.currentUserId,
            input.otherUserId,
        );

        if (!normalized) {
            throw new Error("INVALID_CONVERSATION_RESPONSE");
        }

        await upsertConversation({
            id: normalized.id,
            userA: normalized.userA,
            userB: normalized.userB,
            createdAt: normalized.createdAt,
            updatedAt: normalized.updatedAt,
            serverUpdatedAt: normalized.serverUpdatedAt,
            lastMessagePreview: normalized.lastMessagePreview,
            lastMessageAt: normalized.lastMessageAt,
            unreadCount: normalized.unreadCount,
        });

        const record =
            typeof response === "object" && response !== null
                ? (response as Record<string, unknown>)
                : null;
        if (record && Array.isArray(record.members)) {
            await applyUsers(record.members);
        }

        const chat = await getChatById(normalized.id);
        if (chat) {
            return chat;
        }

        return {
            id: normalized.id,
            userA: normalized.userA,
            userB: normalized.userB,
            createdAt: normalized.createdAt,
        };
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
        if (error.status !== 0 && error.status < 500) {
            throw error;
        }
        return findOrCreateDirectChat(input);
    }
}
