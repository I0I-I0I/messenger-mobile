import { applyConversations, applyMessages, applyUsers } from "@/src/sync/applyServerData";
import { normalizeUser } from "@/src/sync/normalizers";
import { bootstrapSyncRequest } from "@/src/transport/rest/sync";

export async function runBootstrapSync(currentUserId: string) {
    const payload = await bootstrapSyncRequest();

    await applyUsers(payload.users ?? []);

    const me = normalizeUser(payload.me ?? payload.user);
    if (me) {
        await applyUsers([me]);
    }

    await applyConversations({
        conversations: payload.conversations ?? [],
        currentUserId,
    });

    await applyMessages({
        messages: payload.recent_messages ?? payload.recentMessages ?? [],
        currentUserId,
    });
}
