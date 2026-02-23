import { listConversationServerCursors } from "@/src/db/queries/messages";
import { applyConversations, applyMessages, applyUsers } from "@/src/sync/applyServerData";
import { listConversationsRequest } from "@/src/transport/rest/conversations";
import { changesSyncRequest } from "@/src/transport/rest/sync";

export async function pullIncrementalSync(currentUserId: string) {
    const cursors = await listConversationServerCursors();
    const [conversationPayload, payload] = await Promise.all([
        listConversationsRequest().catch(() => []),
        changesSyncRequest(cursors).catch(() => ({
            users: [],
            conversations: [],
            messages: [],
        })),
    ]);

    await applyUsers(payload.users ?? []);

    await applyConversations({
        conversations: [
            ...(conversationPayload ?? []),
            ...(payload.conversations ?? []),
        ],
        currentUserId,
    });

    await applyMessages({
        messages: payload.messages ?? [],
        currentUserId,
    });
}
