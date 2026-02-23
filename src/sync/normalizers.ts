import type {
    ApiUserDto,
    ConversationDto,
    MessageDto,
} from "@/src/transport/rest/types";

export type NormalizedUser = {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    createdAt: number;
    updatedAt: number;
};

export type NormalizedConversation = {
    id: string;
    userA: string;
    userB: string;
    createdAt: number;
    updatedAt: number;
    serverUpdatedAt?: number;
    lastMessagePreview: string;
    lastMessageAt: number;
    unreadCount: number;
};

export type NormalizedMessage = {
    id: string;
    conversationId: string;
    senderId: string;
    clientMessageId?: string;
    seq?: number;
    content: string;
    createdAt: number;
};

function asRecord(value: unknown) {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
}

export function toMillis(value: unknown, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value > 9_000_000_000 ? value : value * 1000;
    }

    if (typeof value === "string") {
        const num = Number(value);
        if (Number.isFinite(num)) {
            return num > 9_000_000_000 ? num : num * 1000;
        }
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

export function normalizeUser(
    dto: ApiUserDto | unknown,
): NormalizedUser | null {
    const record = asRecord(dto);
    if (!record || typeof record.id !== "string") {
        return null;
    }

    const now = Date.now();
    const username =
        typeof record.username === "string" ? record.username : record.id;
    const displayName =
        typeof record.display_name === "string"
            ? record.display_name
            : typeof record.displayName === "string"
              ? record.displayName
              : username;
    const avatar =
        typeof record.avatar_url === "string"
            ? record.avatar_url
            : typeof record.avatar === "string"
              ? record.avatar
              : null;

    const result = {
        id: record.id,
        username,
        displayName,
        avatar,
        createdAt: toMillis(record.created_at ?? record.createdAt, now),
        updatedAt: toMillis(record.updated_at ?? record.updatedAt, now),
    };
    return result;
}

function extractParticipantIds(record: Record<string, unknown>) {
    const directIds: string[] = [];

    const rawMemberIds = record.member_ids ?? record.participant_ids;
    if (Array.isArray(rawMemberIds)) {
        for (const value of rawMemberIds) {
            if (typeof value === "string") {
                directIds.push(value);
            }
        }
    }

    const members = record.members;
    if (Array.isArray(members)) {
        for (const member of members) {
            if (typeof member === "string") {
                directIds.push(member);
                continue;
            }
            const memberRecord = asRecord(member);
            if (memberRecord && typeof memberRecord.id === "string") {
                directIds.push(memberRecord.id);
            }
        }
    }

    if (typeof record.user_a === "string") {
        directIds.push(record.user_a);
    }
    if (typeof record.userA === "string") {
        directIds.push(record.userA);
    }
    if (typeof record.user_b === "string") {
        directIds.push(record.user_b);
    }
    if (typeof record.userB === "string") {
        directIds.push(record.userB);
    }
    if (typeof record.other_user_id === "string") {
        directIds.push(record.other_user_id);
    }

    return Array.from(new Set(directIds));
}

export function normalizeConversation(
    dto: ConversationDto | unknown,
    currentUserId: string,
    fallbackOtherUserId?: string,
) {
    const record = asRecord(dto);
    if (!record || typeof record.id !== "string") {
        return null;
    }

    const now = Date.now();
    const participantIds = extractParticipantIds(record);
    let otherUserId =
        participantIds.find((id) => id !== currentUserId) ??
        fallbackOtherUserId ??
        currentUserId;

    if (!otherUserId) {
        otherUserId = currentUserId;
    }

    const userA = currentUserId < otherUserId ? currentUserId : otherUserId;
    const userB = currentUserId < otherUserId ? otherUserId : currentUserId;
    const createdAt = toMillis(record.created_at ?? record.createdAt, now);
    const updatedAt = toMillis(
        record.updated_at ?? record.updatedAt,
        createdAt,
    );
    const lastMessageAt = toMillis(
        record.last_message_at ?? record.lastMessageAt,
        updatedAt,
    );

    return {
        id: record.id,
        userA,
        userB,
        createdAt,
        updatedAt,
        serverUpdatedAt: updatedAt,
        lastMessagePreview:
            typeof record.last_message_preview === "string"
                ? record.last_message_preview
                : typeof record.lastMessagePreview === "string"
                  ? record.lastMessagePreview
                  : "",
        lastMessageAt,
        unreadCount:
            typeof record.unread_count === "number"
                ? record.unread_count
                : typeof record.unreadCount === "number"
                  ? record.unreadCount
                  : 0,
    } satisfies NormalizedConversation;
}

export function normalizeMessage(
    dto: MessageDto | unknown,
): NormalizedMessage | null {
    const record = asRecord(dto);
    if (!record || typeof record.id !== "string") {
        return null;
    }

    const conversationId =
        typeof record.conversation_id === "string"
            ? record.conversation_id
            : typeof record.conversationId === "string"
              ? record.conversationId
              : "";
    const senderId =
        typeof record.sender_id === "string"
            ? record.sender_id
            : typeof record.senderId === "string"
              ? record.senderId
              : "";

    if (!conversationId || !senderId) {
        return null;
    }

    const seq = typeof record.seq === "number" ? record.seq : undefined;

    return {
        id: record.id,
        conversationId,
        senderId,
        clientMessageId:
            typeof record.client_message_id === "string"
                ? record.client_message_id
                : typeof record.clientMessageId === "string"
                  ? record.clientMessageId
                  : undefined,
        seq,
        content: typeof record.content === "string" ? record.content : "",
        createdAt: toMillis(record.created_at ?? record.createdAt, Date.now()),
    };
}
