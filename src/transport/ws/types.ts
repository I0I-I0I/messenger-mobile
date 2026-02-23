export type WsCommand =
    | { op: "subscribe"; conversation_ids: string[] }
    | { op: "unsubscribe"; conversation_ids: string[] }
    | { op: "ping"; ts?: number };

export type WsWelcomeEvent = {
    type: "connection.welcome";
    connection_id: string;
    user_id: string;
    server_time: string;
    heartbeat_sec: number;
    protocol_version: number;
};

export type WsAckEvent = {
    type: "ack";
    op: "subscribe" | "unsubscribe";
    ok: true;
    details?: { conversation_ids?: string[] };
};

export type WsPongEvent = {
    type: "pong";
    ts?: number;
};

export type WsErrorCode =
    | "UNAUTHORIZED"
    | "TOKEN_EXPIRED"
    | "FORBIDDEN_CONVERSATION"
    | "INVALID_COMMAND"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";

export type WsErrorEvent = {
    type: "error";
    error: {
        code: WsErrorCode;
        message: string;
        details?: unknown;
    };
};

export type WsUserProfile = {
    id: string;
    username?: string;
    display_name?: string;
    displayName?: string;
    avatar_url?: string | null;
    avatar?: string | null;
    created_at?: string | number;
    createdAt?: string | number;
    updated_at?: string | number;
    updatedAt?: string | number;
};

export type MessageCreatedEvent = {
    type: "message.created";
    event_id: string;
    conversation_id: string;
    seq: number;
    occurred_at: string;
    payload: {
        id: string;
        sender_id: string;
        client_message_id?: string;
        content: string;
        created_at: string;
        sender?: WsUserProfile;
        sender_user?: WsUserProfile;
        senderUser?: WsUserProfile;
        author?: WsUserProfile;
        from_user?: WsUserProfile;
        fromUser?: WsUserProfile;
        sender_username?: string;
        senderUsername?: string;
        sender_display_name?: string;
        senderDisplayName?: string;
        sender_name?: string;
        senderName?: string;
        sender_avatar_url?: string | null;
        senderAvatarUrl?: string | null;
        sender_avatar?: string | null;
        senderAvatar?: string | null;
        sender_created_at?: string | number;
        senderCreatedAt?: string | number;
        sender_updated_at?: string | number;
        senderUpdatedAt?: string | number;
    };
};

export type ConversationUpdatedEvent = {
    type: "conversation.updated";
    event_id: string;
    conversation_id: string;
    seq: number;
    occurred_at: string;
    payload: {
        id: string;
        updated_at: string;
        last_message_preview: string | null;
        last_message_at: string | null;
    };
};

export type WsServerEvent =
    | WsWelcomeEvent
    | WsAckEvent
    | WsPongEvent
    | WsErrorEvent
    | MessageCreatedEvent
    | ConversationUpdatedEvent;

function asRecord(value: unknown) {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
}

function parseWsUserProfile(value: unknown): WsUserProfile | undefined {
    const record = asRecord(value);
    if (!record || typeof record.id !== "string") {
        return undefined;
    }

    return {
        id: record.id,
        username:
            typeof record.username === "string" ? record.username : undefined,
        display_name:
            typeof record.display_name === "string"
                ? record.display_name
                : undefined,
        displayName:
            typeof record.displayName === "string"
                ? record.displayName
                : undefined,
        avatar_url:
            typeof record.avatar_url === "string" || record.avatar_url === null
                ? (record.avatar_url as string | null)
                : undefined,
        avatar:
            typeof record.avatar === "string" || record.avatar === null
                ? (record.avatar as string | null)
                : undefined,
        created_at:
            typeof record.created_at === "string" ||
            typeof record.created_at === "number"
                ? (record.created_at as string | number)
                : undefined,
        createdAt:
            typeof record.createdAt === "string" ||
            typeof record.createdAt === "number"
                ? (record.createdAt as string | number)
                : undefined,
        updated_at:
            typeof record.updated_at === "string" ||
            typeof record.updated_at === "number"
                ? (record.updated_at as string | number)
                : undefined,
        updatedAt:
            typeof record.updatedAt === "string" ||
            typeof record.updatedAt === "number"
                ? (record.updatedAt as string | number)
                : undefined,
    };
}

function isWsErrorCode(value: unknown): value is WsErrorCode {
    return (
        value === "UNAUTHORIZED" ||
        value === "TOKEN_EXPIRED" ||
        value === "FORBIDDEN_CONVERSATION" ||
        value === "INVALID_COMMAND" ||
        value === "RATE_LIMITED" ||
        value === "INTERNAL_ERROR"
    );
}

function parseErrorEvent(record: Record<string, unknown>): WsErrorEvent | null {
    const error = asRecord(record.error);
    if (!error) {
        return null;
    }

    if (
        !isWsErrorCode(error.code) ||
        typeof error.message !== "string"
    ) {
        return null;
    }

    return {
        type: "error",
        error: {
            code: error.code,
            message: error.message,
            details: error.details,
        },
    };
}

function parseAckEvent(record: Record<string, unknown>): WsAckEvent | null {
    if (
        (record.op !== "subscribe" && record.op !== "unsubscribe") ||
        record.ok !== true
    ) {
        return null;
    }

    const details = asRecord(record.details);
    return {
        type: "ack",
        op: record.op,
        ok: true,
        details:
            details && Array.isArray(details.conversation_ids)
                ? {
                      conversation_ids: details.conversation_ids.filter(
                          (value): value is string =>
                              typeof value === "string",
                      ),
                  }
                : undefined,
    };
}

function parseWelcomeEvent(
    record: Record<string, unknown>,
): WsWelcomeEvent | null {
    if (
        typeof record.connection_id !== "string" ||
        typeof record.user_id !== "string" ||
        typeof record.server_time !== "string" ||
        typeof record.heartbeat_sec !== "number" ||
        typeof record.protocol_version !== "number"
    ) {
        return null;
    }

    return {
        type: "connection.welcome",
        connection_id: record.connection_id,
        user_id: record.user_id,
        server_time: record.server_time,
        heartbeat_sec: record.heartbeat_sec,
        protocol_version: record.protocol_version,
    };
}

function parseMessageCreatedEvent(
    record: Record<string, unknown>,
): MessageCreatedEvent | null {
    const payload = asRecord(record.payload);
    if (
        typeof record.event_id !== "string" ||
        typeof record.conversation_id !== "string" ||
        typeof record.seq !== "number" ||
        typeof record.occurred_at !== "string" ||
        !payload ||
        typeof payload.id !== "string" ||
        typeof payload.sender_id !== "string" ||
        typeof payload.content !== "string" ||
        typeof payload.created_at !== "string"
    ) {
        return null;
    }

    const clientMessageId =
        typeof payload.client_message_id === "string"
            ? payload.client_message_id
            : undefined;
    const sender =
        parseWsUserProfile(payload.sender) ??
        parseWsUserProfile(payload.sender_user) ??
        parseWsUserProfile(payload.senderUser) ??
        parseWsUserProfile(payload.author) ??
        parseWsUserProfile(payload.from_user) ??
        parseWsUserProfile(payload.fromUser);

    return {
        type: "message.created",
        event_id: record.event_id,
        conversation_id: record.conversation_id,
        seq: record.seq,
        occurred_at: record.occurred_at,
        payload: {
            id: payload.id,
            sender_id: payload.sender_id,
            client_message_id: clientMessageId,
            content: payload.content,
            created_at: payload.created_at,
            sender,
            sender_user: parseWsUserProfile(payload.sender_user),
            senderUser: parseWsUserProfile(payload.senderUser),
            author: parseWsUserProfile(payload.author),
            from_user: parseWsUserProfile(payload.from_user),
            fromUser: parseWsUserProfile(payload.fromUser),
            sender_username:
                typeof payload.sender_username === "string"
                    ? payload.sender_username
                    : undefined,
            senderUsername:
                typeof payload.senderUsername === "string"
                    ? payload.senderUsername
                    : undefined,
            sender_display_name:
                typeof payload.sender_display_name === "string"
                    ? payload.sender_display_name
                    : undefined,
            senderDisplayName:
                typeof payload.senderDisplayName === "string"
                    ? payload.senderDisplayName
                    : undefined,
            sender_name:
                typeof payload.sender_name === "string"
                    ? payload.sender_name
                    : undefined,
            senderName:
                typeof payload.senderName === "string"
                    ? payload.senderName
                    : undefined,
            sender_avatar_url:
                typeof payload.sender_avatar_url === "string" ||
                payload.sender_avatar_url === null
                    ? (payload.sender_avatar_url as string | null)
                    : undefined,
            senderAvatarUrl:
                typeof payload.senderAvatarUrl === "string" ||
                payload.senderAvatarUrl === null
                    ? (payload.senderAvatarUrl as string | null)
                    : undefined,
            sender_avatar:
                typeof payload.sender_avatar === "string" ||
                payload.sender_avatar === null
                    ? (payload.sender_avatar as string | null)
                    : undefined,
            senderAvatar:
                typeof payload.senderAvatar === "string" ||
                payload.senderAvatar === null
                    ? (payload.senderAvatar as string | null)
                    : undefined,
            sender_created_at:
                typeof payload.sender_created_at === "string" ||
                typeof payload.sender_created_at === "number"
                    ? (payload.sender_created_at as string | number)
                    : undefined,
            senderCreatedAt:
                typeof payload.senderCreatedAt === "string" ||
                typeof payload.senderCreatedAt === "number"
                    ? (payload.senderCreatedAt as string | number)
                    : undefined,
            sender_updated_at:
                typeof payload.sender_updated_at === "string" ||
                typeof payload.sender_updated_at === "number"
                    ? (payload.sender_updated_at as string | number)
                    : undefined,
            senderUpdatedAt:
                typeof payload.senderUpdatedAt === "string" ||
                typeof payload.senderUpdatedAt === "number"
                    ? (payload.senderUpdatedAt as string | number)
                    : undefined,
        },
    };
}

function parseConversationUpdatedEvent(
    record: Record<string, unknown>,
): ConversationUpdatedEvent | null {
    const payload = asRecord(record.payload);
    if (
        typeof record.event_id !== "string" ||
        typeof record.conversation_id !== "string" ||
        typeof record.seq !== "number" ||
        typeof record.occurred_at !== "string" ||
        !payload ||
        typeof payload.id !== "string" ||
        typeof payload.updated_at !== "string" ||
        (typeof payload.last_message_preview !== "string" &&
            payload.last_message_preview !== null) ||
        (typeof payload.last_message_at !== "string" &&
            payload.last_message_at !== null)
    ) {
        return null;
    }

    return {
        type: "conversation.updated",
        event_id: record.event_id,
        conversation_id: record.conversation_id,
        seq: record.seq,
        occurred_at: record.occurred_at,
        payload: {
            id: payload.id,
            updated_at: payload.updated_at,
            last_message_preview: payload.last_message_preview,
            last_message_at: payload.last_message_at,
        },
    };
}

export function parseWsServerEvent(input: unknown): WsServerEvent | null {
    if (typeof input !== "string") {
        return null;
    }

    let raw: unknown;
    try {
        raw = JSON.parse(input);
    } catch {
        return null;
    }

    const record = asRecord(raw);
    if (!record || typeof record.type !== "string") {
        return null;
    }

    switch (record.type) {
        case "connection.welcome":
            return parseWelcomeEvent(record);
        case "ack":
            return parseAckEvent(record);
        case "pong":
            if (
                typeof record.ts !== "number" &&
                typeof record.ts !== "undefined"
            ) {
                return null;
            }
            return { type: "pong", ts: record.ts };
        case "error":
            return parseErrorEvent(record);
        case "message.created":
            return parseMessageCreatedEvent(record);
        case "conversation.updated":
            return parseConversationUpdatedEvent(record);
        default:
            return null;
    }
}

export function isDurableWsEvent(
    event: WsServerEvent,
): event is MessageCreatedEvent | ConversationUpdatedEvent {
    return (
        event.type === "message.created" ||
        event.type === "conversation.updated"
    );
}
