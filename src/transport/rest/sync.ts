import { restRequest } from "@/src/transport/rest/client";
import type { BootstrapDto, SyncChangesDto } from "@/src/transport/rest/types";

export async function bootstrapSyncRequest() {
    return restRequest<BootstrapDto>("/v1/sync/bootstrap");
}

export async function changesSyncRequest(afterSeqByConversation: Record<string, number>) {
    if (Object.keys(afterSeqByConversation).length === 0) {
        return {
            conversations: [],
            messages: [],
        } satisfies SyncChangesDto;
    }

    const params = new URLSearchParams();
    params.set(
        "after_seq_by_conversation",
        JSON.stringify(afterSeqByConversation),
    );

    return restRequest<SyncChangesDto>(`/v1/sync/changes?${params.toString()}`);
}
