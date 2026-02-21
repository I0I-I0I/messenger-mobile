import { enqueueSendMessage, listMessages } from "@/src/repository/messageRepository";
import { processOutboxOnce } from "@/src/sync/outboxProcessor";

export async function loadMessages(chatId: string) {
    return listMessages(chatId);
}

export async function sendMessage(input: {
    chatId: string;
    senderId: string;
    content: string;
}) {
    const local = await enqueueSendMessage(input);
    await processOutboxOnce();
    return local;
}
