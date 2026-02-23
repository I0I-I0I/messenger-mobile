/* eslint-disable import/first */

jest.mock("@/src/db/queries/conversations", () => ({
    getConversationById: jest.fn(),
    upsertConversation: jest.fn(),
    updateConversationFromServer: jest.fn(),
}));

jest.mock("@/src/repository/messageRepository", () => ({
    reconcilePendingMessageFromRealtime: jest.fn(),
    upsertRemoteMessageFromRealtime: jest.fn(),
}));

jest.mock("@/src/db/queries/users", () => ({
    upsertUser: jest.fn(),
}));

import { applyRealtimeEvent } from "@/src/sync/realtimeSync";
import * as conversationsQuery from "@/src/db/queries/conversations";
import * as usersQuery from "@/src/db/queries/users";
import * as messageRepository from "@/src/repository/messageRepository";

const mockedGetConversationById = jest.mocked(conversationsQuery.getConversationById);
const mockedUpsertConversation = jest.mocked(conversationsQuery.upsertConversation);
const mockedUpdateConversationFromServer = jest.mocked(
    conversationsQuery.updateConversationFromServer,
);
const mockedReconcilePendingMessageFromRealtime = jest.mocked(
    messageRepository.reconcilePendingMessageFromRealtime,
);
const mockedUpsertRemoteMessageFromRealtime = jest.mocked(
    messageRepository.upsertRemoteMessageFromRealtime,
);
const mockedUpsertUser = jest.mocked(usersQuery.upsertUser);

describe("applyRealtimeEvent", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("reconciles local pending message and skips remote insert", async () => {
        mockedGetConversationById.mockResolvedValue({ id: "c1" } as any);
        mockedReconcilePendingMessageFromRealtime.mockResolvedValue({
            id: "m1",
        } as any);

        const result = await applyRealtimeEvent({
            currentUserId: "u1",
            event: {
                type: "message.created",
                event_id: "evt1",
                conversation_id: "c1",
                seq: 12,
                occurred_at: "2026-02-23T00:00:00Z",
                payload: {
                    id: "srv1",
                    sender_id: "u1",
                    client_message_id: "cm1",
                    content: "hello",
                    created_at: "2026-02-23T00:00:00Z",
                },
            },
        });

        expect(mockedReconcilePendingMessageFromRealtime).toHaveBeenCalled();
        expect(mockedUpsertRemoteMessageFromRealtime).not.toHaveBeenCalled();
        expect(result).toEqual({ requiresHydrationSync: false });
    });

    it("creates fallback conversation and upserts remote message when no pending match", async () => {
        mockedGetConversationById.mockResolvedValue(null);
        mockedReconcilePendingMessageFromRealtime.mockResolvedValue(null);
        mockedUpsertConversation.mockResolvedValue({ id: "c1" } as any);

        const result = await applyRealtimeEvent({
            currentUserId: "u1",
            event: {
                type: "message.created",
                event_id: "evt1",
                conversation_id: "c1",
                seq: 15,
                occurred_at: "2026-02-23T00:00:01Z",
                payload: {
                    id: "srv2",
                    sender_id: "u2",
                    client_message_id: "cm2",
                    content: "hi",
                    created_at: "2026-02-23T00:00:01Z",
                },
            },
        });

        expect(mockedUpsertConversation).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "c1",
                lastMessagePreview: "hi",
            }),
        );
        expect(mockedUpsertRemoteMessageFromRealtime).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationId: "c1",
                senderId: "u2",
                serverId: "srv2",
                serverSeq: 15,
            }),
        );
        expect(result).toEqual({ requiresHydrationSync: true });
    });

    it("upserts sender profile from realtime payload when provided", async () => {
        mockedGetConversationById.mockResolvedValue({ id: "c1" } as any);
        mockedReconcilePendingMessageFromRealtime.mockResolvedValue(null);
        mockedUpsertRemoteMessageFromRealtime.mockResolvedValue({ id: "m1" } as any);

        const result = await applyRealtimeEvent({
            currentUserId: "u1",
            event: {
                type: "message.created",
                event_id: "evt1",
                conversation_id: "c1",
                seq: 10,
                occurred_at: "2026-02-23T00:00:01Z",
                payload: {
                    id: "srv2",
                    sender_id: "u2",
                    content: "hi",
                    created_at: "2026-02-23T00:00:01Z",
                    sender: {
                        id: "u2",
                        username: "alice",
                        display_name: "Alice",
                    },
                },
            },
        });

        expect(mockedUpsertUser).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "u2",
                username: "alice",
                displayName: "Alice",
            }),
        );
        expect(result).toEqual({ requiresHydrationSync: false });
    });

    it("applies conversation.updated via server update query", async () => {
        mockedUpdateConversationFromServer.mockResolvedValue(null);

        await applyRealtimeEvent({
            currentUserId: "u1",
            event: {
                type: "conversation.updated",
                event_id: "evt2",
                conversation_id: "c2",
                seq: 20,
                occurred_at: "2026-02-23T00:00:02Z",
                payload: {
                    id: "c2",
                    updated_at: "2026-02-23T00:00:02Z",
                    last_message_preview: "new",
                    last_message_at: "2026-02-23T00:00:02Z",
                },
            },
        });

        expect(mockedUpdateConversationFromServer).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationId: "c2",
                lastMessagePreview: "new",
            }),
        );
    });
});
