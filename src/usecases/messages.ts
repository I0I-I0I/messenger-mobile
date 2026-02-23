import { enqueueSendMessage, listMessages } from "@/src/repository/messageRepository";
import { runSyncCycle } from "@/src/sync/syncScheduler";
import { emitSyncWarning } from "@/src/sync/dataEvents";

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
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown sync error";
        emitSyncWarning({
            code: "OUTBOX_SYNC_FAILED",
            message,
        });
        // Message is persisted locally; sync can retry later.
    }
    return local;
}
