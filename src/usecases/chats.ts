import { upsertConversation } from "@/src/db/queries/conversations";
import type { ChatListItem } from "@/src/domain/types";
import { findOrCreateDirectChat, getChatById, listChatsForUser } from "@/src/repository/chatRepository";
import {
    applyConversations,
    applyUsers,
    extractConversationUsers,
} from "@/src/sync/applyServerData";
import { normalizeConversation } from "@/src/sync/normalizers";
import { ApiError } from "@/src/transport/rest/client";
import {
    createDirectConversationRequest,
    listConversationsRequest,
} from "@/src/transport/rest/conversations";
import { batchUsersRequest, searchUsersRequest } from "@/src/transport/rest/users";

const USER_HYDRATION_SEARCH_LIMIT = 20;
export const UNRESOLVED_PROFILE_LABEL = "Loading profile…";

export function isUnresolvedChatUser(
    user: ChatListItem["otherUser"] | null | undefined,
) {
    if (!user || typeof user.id !== "string") {
        return false;
    }

    const username =
        typeof user.username === "string" ? user.username.trim() : "";
    const displayName =
        typeof user.displayName === "string" ? user.displayName.trim() : "";

    return (
        !username ||
        !displayName ||
        username === user.id ||
        displayName === user.id
    );
}

export function getChatUserDisplayName(
    user: ChatListItem["otherUser"] | null | undefined,
) {
    if (!user || isUnresolvedChatUser(user)) {
        return UNRESOLVED_PROFILE_LABEL;
    }

    return user.displayName.trim();
}

function findFallbackUserIds(chats: ChatListItem[]) {
    const ids = new Set<string>();
    for (const chat of chats) {
        if (isUnresolvedChatUser(chat.otherUser)) {
            ids.add(chat.otherUser.id);
        }
    }
    return Array.from(ids);
}

function isExactUserMatch(
    user: Record<string, unknown>,
    targetId: string,
) {
    const normalizedTarget = targetId.trim().toLowerCase();
    const id = typeof user.id === "string" ? user.id : "";
    const username =
        typeof user.username === "string" ? user.username : "";
    const displayName =
        typeof user.display_name === "string"
            ? user.display_name
            : typeof user.displayName === "string"
              ? user.displayName
              : "";

    return (
        id === targetId ||
        username.toLowerCase() === normalizedTarget ||
        displayName.toLowerCase() === normalizedTarget
    );
}

async function hydrateUsersByIdLookup(userIds: string[]) {
    if (!userIds.length) {
        return;
    }

    let unresolvedUserIds = [...userIds];

    try {
        const batchUsers = await batchUsersRequest({ ids: userIds });
        if (batchUsers.length > 0) {
            await applyUsers(batchUsers);
            unresolvedUserIds = userIds.filter(
                (userId) =>
                    !batchUsers.some(
                        (candidate) =>
                            typeof candidate === "object" &&
                            candidate !== null &&
                            isExactUserMatch(
                                candidate as Record<string, unknown>,
                                userId,
                            ),
                    ),
            );
        }
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
    }

    for (const userId of unresolvedUserIds) {
        try {
            const users = await searchUsersRequest({
                query: userId,
                limit: USER_HYDRATION_SEARCH_LIMIT,
            });
            const exact = users.find(
                (candidate) =>
                    typeof candidate === "object" &&
                    candidate !== null &&
                    isExactUserMatch(
                        candidate as Record<string, unknown>,
                        userId,
                    ),
            );

            if (exact) {
                await applyUsers([exact]);
            }
        } catch (error) {
            if (!(error instanceof ApiError)) {
                throw error;
            }
        }
    }
}

async function hydrateFallbackChatUsers(
    currentUserId: string,
    chats: ChatListItem[],
) {
    const fallbackUserIds = findFallbackUserIds(chats);
    if (!fallbackUserIds.length) {
        return;
    }

    try {
        const conversations = await listConversationsRequest();
        await applyConversations({
            conversations,
            currentUserId,
        });
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
    }

    const updatedChats = await listChatsForUser(currentUserId);
    const unresolvedUserIds = findFallbackUserIds(updatedChats);
    await hydrateUsersByIdLookup(unresolvedUserIds);
}

export async function loadChats(userId: string) {
    const chats = await listChatsForUser(userId);
    if (!findFallbackUserIds(chats).length) {
        return chats;
    }

    await hydrateFallbackChatUsers(userId, chats);
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

        await applyUsers(extractConversationUsers(response));

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
