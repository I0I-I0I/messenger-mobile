import {
    getConversationById,
    upsertConversation,
    updateConversationFromServer,
} from "@/src/db/queries/conversations";
import { upsertUser } from "@/src/db/queries/users";
import {
    reconcilePendingMessageFromRealtime,
    upsertRemoteMessageFromRealtime,
} from "@/src/repository/messageRepository";
import { normalizeMessageSenderProfile, toMillis } from "@/src/sync/normalizers";
import type {
    ConversationUpdatedEvent,
    MessageCreatedEvent,
    WsServerEvent,
} from "@/src/transport/ws/types";

function pairUsers(a: string, b: string) {
    return a < b ? { userA: a, userB: b } : { userA: b, userB: a };
}

async function ensureConversationForMessage(input: {
    conversationId: string;
    currentUserId: string;
    senderId: string;
    content: string;
    createdAt: number;
    serverUpdatedAt: number;
}) {
    const existing = await getConversationById(input.conversationId);
    if (existing) {
        return { created: false };
    }

    const { userA, userB } = pairUsers(input.currentUserId, input.senderId);
    await upsertConversation({
        id: input.conversationId,
        userA,
        userB,
        createdAt: input.createdAt,
        updatedAt: input.serverUpdatedAt,
        serverUpdatedAt: input.serverUpdatedAt,
        lastMessagePreview: input.content,
        lastMessageAt: input.createdAt,
        unreadCount: 0,
    });
    return { created: true };
}

async function applyMessageCreated(
    event: MessageCreatedEvent,
    currentUserId: string,
) {
    const createdAt = toMillis(event.payload.created_at, Date.now());
    const occurredAt = toMillis(event.occurred_at, createdAt);
    const senderProfile = normalizeMessageSenderProfile(
        event.payload,
        event.payload.sender_id,
    );
    if (senderProfile) {
        await upsertUser({
            id: senderProfile.id,
            username: senderProfile.username,
            displayName: senderProfile.displayName,
            avatar: senderProfile.avatar,
            createdAt: senderProfile.createdAt,
            updatedAt: senderProfile.updatedAt,
        });
    }

    const conversationState = await ensureConversationForMessage({
        conversationId: event.conversation_id,
        currentUserId,
        senderId: event.payload.sender_id,
        content: event.payload.content,
        createdAt,
        serverUpdatedAt: occurredAt,
    });

    const reconciled = await reconcilePendingMessageFromRealtime({
        meId: currentUserId,
        conversationId: event.conversation_id,
        senderId: event.payload.sender_id,
        clientMessageId: event.payload.client_message_id,
        serverId: event.payload.id,
        serverSeq: event.seq,
        content: event.payload.content,
        createdAt,
    });

    if (reconciled) {
        return {
            requiresHydrationSync: conversationState.created && !senderProfile,
        };
    }

    await upsertRemoteMessageFromRealtime({
        conversationId: event.conversation_id,
        senderId: event.payload.sender_id,
        serverId: event.payload.id,
        clientMessageId: event.payload.client_message_id,
        serverSeq: event.seq,
        content: event.payload.content,
        createdAt,
    });

    return {
        requiresHydrationSync: conversationState.created && !senderProfile,
    };
}

async function applyConversationUpdated(event: ConversationUpdatedEvent) {
    const serverUpdatedAt = toMillis(event.payload.updated_at, Date.now());
    const lastMessageAt = event.payload.last_message_at
        ? toMillis(event.payload.last_message_at, serverUpdatedAt)
        : serverUpdatedAt;

    await updateConversationFromServer({
        conversationId: event.conversation_id,
        serverUpdatedAt,
        lastMessagePreview: event.payload.last_message_preview ?? "",
        lastMessageAt,
    });
}

export async function applyRealtimeEvent(input: {
    event: WsServerEvent;
    currentUserId: string;
}) {
    if (input.event.type === "message.created") {
        return applyMessageCreated(input.event, input.currentUserId);
    }

    if (input.event.type === "conversation.updated") {
        await applyConversationUpdated(input.event);
    }

    return { requiresHydrationSync: false };
}
