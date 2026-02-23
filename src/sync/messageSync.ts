import { listConversationServerCursors } from "@/src/db/queries/messages";
import { applyConversations, applyMessages } from "@/src/sync/applyServerData";
import { changesSyncRequest } from "@/src/transport/rest/sync";

export async function pullIncrementalSync(currentUserId: string) {
    const cursors = await listConversationServerCursors();
    const payload = await changesSyncRequest(cursors);

    await applyConversations({
        conversations: payload.conversations ?? [],
        currentUserId,
    });

    await applyMessages({
        messages: payload.messages ?? [],
        currentUserId,
    });
}
