import type { Chat, ChatListItem } from "@/src/domain/types";
import {
    findOrCreateDirectConversation,
    getConversationById,
    listConversationsForUser,
} from "@/src/db/queries/conversations";
import { getLastMessageForConversation } from "@/src/db/queries/messages";
import { getUserById } from "@/src/db/queries/users";

function toChat(
    input: NonNullable<Awaited<ReturnType<typeof getConversationById>>>,
): Chat {
    return {
        id: input.id,
        userA: input.userA,
        userB: input.userB,
        createdAt: input.createdAt,
    };
}

export async function listChatsForUser(
    userId: string,
): Promise<ChatListItem[]> {
    const conversations = await listConversationsForUser(userId);

    const rows = await Promise.all(
        conversations.map(async (conversation) => {
            const otherUserId =
                conversation.userA === userId
                    ? conversation.userB
                    : conversation.userA;
            const otherUser = await getUserById(otherUserId);
            if (!otherUser) {
                return null;
            }

            const lastMessageRow = await getLastMessageForConversation(
                conversation.id,
            );

            return {
                chat: toChat(conversation),
                otherUser: {
                    id: otherUser.id,
                    username: otherUser.username,
                    displayName: otherUser.displayName,
                    avatar: otherUser?.avatar ?? null,
                    createdAt: otherUser?.createdAt ?? conversation.createdAt,
                },
                lastMessage: lastMessageRow
                    ? {
                          id: lastMessageRow.id,
                          chatId: lastMessageRow.conversationId,
                          senderId: lastMessageRow.senderId,
                          content: lastMessageRow.content,
                          createdAt: lastMessageRow.createdAt,
                          status: lastMessageRow.status,
                      }
                    : null,
            } satisfies ChatListItem;
        }),
    );

    return rows.filter(
        (item): item is NonNullable<typeof item> => item !== null,
    );
}

export async function getChatById(chatId: string): Promise<Chat | null> {
    const conversation = await getConversationById(chatId);
    return conversation ? toChat(conversation) : null;
}

export async function findOrCreateDirectChat(input: {
    currentUserId: string;
    otherUserId: string;
}): Promise<Chat> {
    const conversation = await findOrCreateDirectConversation(
        input.currentUserId,
        input.otherUserId,
    );
    return toChat(conversation);
}
