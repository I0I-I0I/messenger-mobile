import { restRequest } from "@/src/transport/rest/client";
import type {
    ApiUserDto,
    BootstrapDto,
    ConversationDto,
    MessageDto,
    SyncChangesDto,
} from "@/src/transport/rest/types";

export async function bootstrapSyncRequest() {
    const raw = await restRequest<BootstrapDto | Record<string, unknown>>(
        "/v1/sync/bootstrap",
    );
    return normalizeBootstrapPayload(raw);
}

type LegacyChangesItem = {
    conversation_id?: string;
    messages?: Array<MessageDto | unknown>;
};

type LegacyChangesPayload = {
    users?: Array<ApiUserDto | unknown>;
    conversations?: Array<ConversationDto | unknown>;
    messages?: Array<MessageDto | unknown>;
    changes?: Array<LegacyChangesItem | unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function pickConversationDtos(values: unknown[]): ConversationDto[] {
    return values.filter(
        (item): item is ConversationDto =>
            isRecord(item) && typeof item.id === "string",
    );
}

function pickMessageDtos(values: unknown[]): MessageDto[] {
    return values.filter(
        (item): item is MessageDto =>
            isRecord(item) &&
            typeof item.id === "string" &&
            (typeof item.conversation_id === "string" ||
                typeof item.conversationId === "string") &&
            (typeof item.sender_id === "string" ||
                typeof item.senderId === "string"),
    );
}

function pickUserDtos(values: unknown[]): ApiUserDto[] {
    return values.filter(
        (item): item is ApiUserDto =>
            isRecord(item) && typeof item.id === "string",
    );
}

function normalizeBootstrapPayload(
    payload: BootstrapDto | Record<string, unknown> | unknown,
): BootstrapDto {
    if (!isRecord(payload)) {
        return {
            users: [],
            conversations: [],
            recent_messages: [],
        };
    }

    const users = Array.isArray(payload.users)
        ? pickUserDtos(payload.users)
        : [];
    const conversations = Array.isArray(payload.conversations)
        ? pickConversationDtos(payload.conversations)
        : [];
    const recentMessagesSource = Array.isArray(payload.recent_messages)
        ? payload.recent_messages
        : Array.isArray(payload.recentMessages)
          ? payload.recentMessages
          : [];

    return {
        me:
            isRecord(payload.me) && typeof payload.me.id === "string"
                ? (payload.me as ApiUserDto)
                : undefined,
        user:
            isRecord(payload.user) && typeof payload.user.id === "string"
                ? (payload.user as ApiUserDto)
                : undefined,
        users,
        conversations,
        recent_messages: pickMessageDtos(recentMessagesSource),
    };
}

function normalizeSyncChangesPayload(
    payload: SyncChangesDto | LegacyChangesPayload | unknown,
): SyncChangesDto {
    if (!isRecord(payload)) {
        return {
            users: [],
            conversations: [],
            messages: [],
        };
    }

    const users = Array.isArray(payload.users)
        ? pickUserDtos(payload.users)
        : [];
    const conversations = Array.isArray(payload.conversations)
        ? pickConversationDtos(payload.conversations)
        : [];
    const flatMessages: unknown[] = Array.isArray(payload.messages)
        ? [...payload.messages]
        : [];

    if (Array.isArray(payload.changes)) {
        for (const item of payload.changes) {
            if (!isRecord(item) || !Array.isArray(item.messages)) {
                continue;
            }
            flatMessages.push(...item.messages);
        }
    }

    return {
        users,
        conversations,
        messages: pickMessageDtos(flatMessages),
    };
}

export async function changesSyncRequest(afterSeqByConversation: Record<string, number>) {
    const hasCursors = Object.keys(afterSeqByConversation).length > 0;
    const query = hasCursors
        ? `?after_seq_by_conversation=${encodeURIComponent(
              JSON.stringify(afterSeqByConversation),
          )}`
        : "";

    const raw = await restRequest<SyncChangesDto | LegacyChangesPayload>(
        `/v1/sync/changes${query}`,
    );
    return normalizeSyncChangesPayload(raw);
}
