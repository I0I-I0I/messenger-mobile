import {
    getConversationById,
    upsertConversation,
} from "@/src/db/queries/conversations";
import { upsertUser } from "@/src/db/queries/users";
import { upsertServerMessage } from "@/src/repository/messageRepository";
import {
    normalizeConversation,
    normalizeMessage,
    normalizeUser,
    type NormalizedConversation,
} from "@/src/sync/normalizers";
import type { ApiUserDto, ConversationDto, MessageDto } from "@/src/transport/rest/types";

function extractConversationMembers(conversation: ConversationDto | unknown) {
    const record =
        typeof conversation === "object" && conversation !== null
            ? (conversation as Record<string, unknown>)
            : null;
    if (!record || !Array.isArray(record.members)) {
        return [];
    }
    return record.members;
}

async function upsertNormalizedConversation(
    normalizedConversation: NormalizedConversation,
) {
    await upsertConversation({
        id: normalizedConversation.id,
        userA: normalizedConversation.userA,
        userB: normalizedConversation.userB,
        createdAt: normalizedConversation.createdAt,
        updatedAt: normalizedConversation.updatedAt,
        serverUpdatedAt: normalizedConversation.serverUpdatedAt,
        lastMessagePreview: normalizedConversation.lastMessagePreview,
        lastMessageAt: normalizedConversation.lastMessageAt,
        unreadCount: normalizedConversation.unreadCount,
    });
}

export async function applyUsers(users: Array<ApiUserDto | unknown>) {
    for (const userDto of users) {
        const normalized = normalizeUser(userDto);
        if (!normalized) {
            continue;
        }

        await upsertUser({
            id: normalized.id,
            username: normalized.username,
            displayName: normalized.displayName,
            avatar: normalized.avatar,
            createdAt: normalized.createdAt,
            updatedAt: normalized.updatedAt,
        });
    }
}

export async function applyConversations(input: {
    conversations: Array<ConversationDto | unknown>;
    currentUserId: string;
    fallbackOtherUserId?: string;
}) {
    for (const conversationDto of input.conversations) {
        const normalized = normalizeConversation(
            conversationDto,
            input.currentUserId,
            input.fallbackOtherUserId,
        );
        if (!normalized) {
            continue;
        }

        await upsertNormalizedConversation(normalized);
        await applyUsers(extractConversationMembers(conversationDto));
    }
}

export async function applyMessages(input: {
    messages: Array<MessageDto | unknown>;
    currentUserId: string;
}) {
    for (const messageDto of input.messages) {
        const message = normalizeMessage(messageDto);
        if (!message) {
            continue;
        }

        const conversation = await getConversationById(message.conversationId);
        if (!conversation) {
            const fallbackConversation = normalizeConversation(
                {
                    id: message.conversationId,
                    member_ids: [input.currentUserId, message.senderId],
                    updated_at: message.createdAt,
                    last_message_at: message.createdAt,
                    last_message_preview: message.content,
                },
                input.currentUserId,
                message.senderId,
            );
            if (fallbackConversation) {
                await upsertNormalizedConversation(fallbackConversation);
            }
        }

        await upsertServerMessage({
            conversationId: message.conversationId,
            senderId: message.senderId,
            serverId: message.id,
            clientMessageId: message.clientMessageId,
            content: message.content,
            createdAt: message.createdAt,
            serverSeq: message.seq,
        });
    }
}
