import {
    getConversationById,
    upsertConversation,
} from "@/src/db/queries/conversations";
import { getUserById, upsertUser } from "@/src/db/queries/users";
import { upsertServerMessage } from "@/src/repository/messageRepository";
import {
    normalizeConversation,
    normalizeMessage,
    normalizeUser,
    type NormalizedConversation,
} from "@/src/sync/normalizers";
import type {
    ApiUserDto,
    ConversationDto,
    MessageDto,
} from "@/src/transport/rest/types";

function appendUserCandidate(output: unknown[], value: unknown) {
    if (Array.isArray(value)) {
        for (const item of value) {
            appendUserCandidate(output, item);
        }
        return;
    }

    if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        output.push(record);

        const nestedCandidates = [
            record.user,
            record.profile,
            record.member,
            record.account,
        ];
        for (const nested of nestedCandidates) {
            if (typeof nested === "object" && nested !== null) {
                output.push(nested);
            }
        }
    }
}

export function extractConversationUsers(
    conversation: ConversationDto | unknown,
) {
    const record =
        typeof conversation === "object" && conversation !== null
            ? (conversation as Record<string, unknown>)
            : null;
    if (!record) {
        return [];
    }

    const candidates: unknown[] = [];
    appendUserCandidate(candidates, record.members);
    appendUserCandidate(candidates, record.users);
    appendUserCandidate(candidates, record.participants);
    appendUserCandidate(candidates, record.participant_users);
    appendUserCandidate(candidates, record.participantUsers);
    appendUserCandidate(candidates, record.other_user);
    appendUserCandidate(candidates, record.otherUser);
    appendUserCandidate(candidates, record.peer);
    appendUserCandidate(candidates, record.counterpart);

    return candidates;
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

async function ensureUserExists(userId: string) {
    const existing = await getUserById(userId);
    if (existing) {
        return;
    }

    const now = Date.now();
    await upsertUser({
        id: userId,
        username: userId,
        displayName: "",
        avatar: null,
        createdAt: now,
        updatedAt: now,
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
        await applyUsers(extractConversationUsers(conversationDto));

        const otherUserId =
            normalized.userA === input.currentUserId
                ? normalized.userB
                : normalized.userA;
        if (otherUserId && otherUserId !== input.currentUserId) {
            await ensureUserExists(otherUserId);
        }
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

        if (message.sender) {
            await applyUsers([message.sender]);
        } else if (message.senderId !== input.currentUserId) {
            await ensureUserExists(message.senderId);
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
