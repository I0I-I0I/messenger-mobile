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
    sender?: NormalizedUser;
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

function pickString(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
    }
    return undefined;
}

function pickNullableString(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === "string") {
            return value;
        }
        if (value === null) {
            return null;
        }
    }
    return undefined;
}

function getRecordByKeys(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const candidate = asRecord(record[key]);
        if (candidate) {
            return candidate;
        }
    }
    return null;
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

export function normalizeMessageSenderProfile(
    source: unknown,
    fallbackSenderId?: string,
) {
    const record = asRecord(source);
    if (!record) {
        return null;
    }

    const nestedUserRecord = getRecordByKeys(record, [
        "sender",
        "sender_user",
        "senderUser",
        "author",
        "from_user",
        "fromUser",
        "user",
    ]);
    const nestedHasProfileFields = Boolean(
        nestedUserRecord &&
            (typeof nestedUserRecord.username === "string" ||
                typeof nestedUserRecord.display_name === "string" ||
                typeof nestedUserRecord.displayName === "string" ||
                typeof nestedUserRecord.avatar_url === "string" ||
                typeof nestedUserRecord.avatar === "string" ||
                nestedUserRecord.avatar === null),
    );
    const nestedUser =
        nestedUserRecord && nestedHasProfileFields
            ? normalizeUser(nestedUserRecord)
            : null;
    const nestedUserId =
        nestedUserRecord && typeof nestedUserRecord.id === "string"
            ? nestedUserRecord.id
            : undefined;

    const senderId = nestedUser?.id ?? nestedUserId ?? fallbackSenderId;
    if (!senderId) {
        return null;
    }

    const username = pickString(
        record.sender_username,
        record.senderUsername,
        nestedUser?.username,
    );
    const displayName = pickString(
        record.sender_display_name,
        record.senderDisplayName,
        record.sender_name,
        record.senderName,
        nestedUser?.displayName,
    );
    const avatar = pickNullableString(
        record.sender_avatar_url,
        record.senderAvatarUrl,
        record.sender_avatar,
        record.senderAvatar,
        nestedUser?.avatar,
    );

    const hasProfileData =
        nestedHasProfileFields ||
        Boolean(username) ||
        Boolean(displayName) ||
        typeof avatar !== "undefined";
    if (!hasProfileData) {
        return null;
    }

    const now = Date.now();
    return {
        id: senderId,
        username: username ?? senderId,
        displayName: displayName ?? username ?? senderId,
        avatar: avatar ?? null,
        createdAt: toMillis(
            record.sender_created_at ??
                record.senderCreatedAt ??
                nestedUser?.createdAt,
            now,
        ),
        updatedAt: toMillis(
            record.sender_updated_at ??
                record.senderUpdatedAt ??
                nestedUser?.updatedAt,
            now,
        ),
    } satisfies NormalizedUser;
}

function collectIdsFromUserLike(value: unknown, output: string[]) {
    if (typeof value === "string") {
        output.push(value);
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectIdsFromUserLike(item, output);
        }
        return;
    }

    const record = asRecord(value);
    if (!record) {
        return;
    }

    if (typeof record.id === "string") {
        output.push(record.id);
    }

    const nestedUser = getRecordByKeys(record, [
        "user",
        "profile",
        "member",
        "account",
    ]);
    if (nestedUser && typeof nestedUser.id === "string") {
        output.push(nestedUser.id);
    }
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
        collectIdsFromUserLike(members, directIds);
    }

    collectIdsFromUserLike(record.users, directIds);
    collectIdsFromUserLike(record.participants, directIds);
    collectIdsFromUserLike(record.participant_users, directIds);
    collectIdsFromUserLike(record.participantUsers, directIds);
    collectIdsFromUserLike(record.other_user, directIds);
    collectIdsFromUserLike(record.otherUser, directIds);
    collectIdsFromUserLike(record.peer, directIds);
    collectIdsFromUserLike(record.counterpart, directIds);

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
    const sender = normalizeMessageSenderProfile(record, senderId);

    return {
        id: record.id,
        conversationId,
        senderId,
        sender: sender ?? undefined,
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
