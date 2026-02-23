import { restRequest } from "@/src/transport/rest/client";
import type { MessageDto } from "@/src/transport/rest/types";

export async function listConversationMessagesRequest(input: {
    conversationId: string;
    afterSeq?: number;
    limit?: number;
}) {
    const params = new URLSearchParams();
    if (typeof input.afterSeq === "number") {
        params.set("after_seq", String(input.afterSeq));
    }
    if (typeof input.limit === "number") {
        params.set("limit", String(input.limit));
    }

    const query = params.toString();
    return restRequest<MessageDto[]>(
        `/v1/conversations/${encodeURIComponent(input.conversationId)}/messages${
            query ? `?${query}` : ""
        }`,
    );
}

export async function sendMessageRequest(input: {
    conversationId: string;
    clientMessageId: string;
    content: string;
}) {
    return restRequest<MessageDto>(
        `/v1/conversations/${encodeURIComponent(input.conversationId)}/messages`,
        {
            method: "POST",
            body: JSON.stringify({
                client_message_id: input.clientMessageId,
                content: input.content,
            }),
        },
    );
}
