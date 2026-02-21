import { findOrCreateDirectChat, getChatById, listChatsForUser } from "@/src/repository/chatRepository";

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
    return findOrCreateDirectChat(input);
}
