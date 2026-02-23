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
