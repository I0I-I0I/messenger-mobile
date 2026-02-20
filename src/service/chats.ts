import { Chat, ChatListItem } from "../domain/types";
import { createId } from "../domain/id";
import { getLastMessageForChat } from "./messages";
import { getUserById, MOCK_CHATS } from "./mockData";

const chatStore: Chat[] = [...MOCK_CHATS];

export const getChatsForUser = ({
    userId,
}: {
    userId: string;
}): Promise<ChatListItem[]> => {
    const items = chatStore
        .filter((chat) => chat.userA === userId || chat.userB === userId)
        .map((chat) => {
            const otherUserId = chat.userA === userId ? chat.userB : chat.userA;
            const otherUser = getUserById(otherUserId);

            if (!otherUser) {
                return null;
            }

            return {
                chat,
                otherUser,
                lastMessage: getLastMessageForChat(chat.id),
            } satisfies ChatListItem;
        })
        .filter((item): item is ChatListItem => item !== null)
        .sort((a, b) => {
            const aTime = a.lastMessage?.createdAt ?? a.chat.createdAt;
            const bTime = b.lastMessage?.createdAt ?? b.chat.createdAt;
            return bTime - aTime;
        });

    return Promise.resolve(items);
};

export const getChatById = ({ chatId }: { chatId: string }): Promise<Chat> => {
    const chat = chatStore.find((item) => item.id === chatId);
    return Promise.resolve(
        chat ?? {
            id: chatId,
            userA: "1",
            userB: "2",
            createdAt: Date.now(),
        },
    );
};

export const findOrCreateDirectChat = async ({
    currentUserId,
    otherUserId,
}: {
    currentUserId: string;
    otherUserId: string;
}): Promise<Chat> => {
    const existing = chatStore.find(
        (chat) =>
            (chat.userA === currentUserId && chat.userB === otherUserId) ||
            (chat.userA === otherUserId && chat.userB === currentUserId),
    );

    if (existing) {
        return Promise.resolve(existing);
    }

    const created: Chat = {
        id: createId("chat"),
        userA: currentUserId,
        userB: otherUserId,
        createdAt: Date.now(),
    };
    chatStore.unshift(created);
    return Promise.resolve(created);
};
