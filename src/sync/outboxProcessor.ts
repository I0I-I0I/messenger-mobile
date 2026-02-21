import { listOutboxReady, markOutboxRetry, removeOutboxItem } from "@/src/db/queries/outbox";
import { markMessageAsFailed, markMessageAsSent } from "@/src/repository/messageRepository";

const MAX_ATTEMPTS = 5;

export async function processOutboxOnce() {
    const jobs = await listOutboxReady();

    for (const job of jobs) {
        if (job.type !== "send_message") {
            await removeOutboxItem(job.id);
            continue;
        }

        try {
            const payload = JSON.parse(job.payloadJson) as { messageId?: string };
            if (!payload.messageId) {
                await removeOutboxItem(job.id);
                continue;
            }

            await markMessageAsSent(payload.messageId);
            await removeOutboxItem(job.id);
        } catch {
            if (job.attempts >= MAX_ATTEMPTS) {
                try {
                    const payload = JSON.parse(job.payloadJson) as {
                        messageId?: string;
                    };
                    if (payload.messageId) {
                        await markMessageAsFailed(payload.messageId);
                    }
                } finally {
                    await removeOutboxItem(job.id);
                }
                continue;
            }

            await markOutboxRetry(job.id);
        }
    }
}
