import { restRequest } from "@/src/transport/rest/client";
import type { ConversationDto } from "@/src/transport/rest/types";

export async function listConversationsRequest() {
    return restRequest<ConversationDto[]>("/v1/conversations");
}

export async function createDirectConversationRequest(input: {
    other_user_id?: string;
    otherUserId?: string;
}) {
    return restRequest<ConversationDto>("/v1/conversations/direct", {
        method: "POST",
        body: JSON.stringify(input),
    });
}
