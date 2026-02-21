import { Message } from "../domain/types";
import { createId } from "../domain/id";
import { INITIAL_MESSAGES_BY_CHAT_ID } from "./mockData";

const messagesByChatId = new Map<string, Message[]>(
    Object.entries(INITIAL_MESSAGES_BY_CHAT_ID).map(([chatId, messages]) => [
        chatId,
        [...messages],
    ]),
);

export const getListMessages = async ({
    chatId,
}: {
    chatId: string;
}): Promise<Message[]> => {
    const messages = messagesByChatId.get(chatId) ?? [];
    return Promise.resolve(
        [...messages].sort((a, b) => a.createdAt - b.createdAt),
    );
};

export const sendMessage = async ({
    chatId,
    senderId,
    content,
}: {
    chatId: string;
    senderId: string;
    content: string;
}): Promise<Message> => {
    const message: Message = {
        id: createId("msg"),
        chatId,
        senderId,
        content,
        createdAt: Date.now(),
        status: "sent",
    };

    const existing = messagesByChatId.get(chatId) ?? [];
    messagesByChatId.set(chatId, [...existing, message]);

    return Promise.resolve(message);
};

export function getLastMessageForChat(chatId: string) {
    const messages = messagesByChatId.get(chatId);
    return messages && messages.length > 0
        ? messages[messages.length - 1]
        : null;
}
