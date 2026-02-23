import { enqueueSendMessage, listMessages } from "@/src/repository/messageRepository";
import { runSyncCycle } from "@/src/sync/syncScheduler";

export async function loadMessages(chatId: string) {
    return listMessages(chatId);
}

export async function sendMessage(input: {
    chatId: string;
    senderId: string;
    content: string;
}) {
    const local = await enqueueSendMessage(input);
    try {
        await runSyncCycle(input.senderId);
    } catch {
        // Message is persisted locally; sync can retry later.
    }
    return local;
}
