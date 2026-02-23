jest.mock("@/src/repository/chatRepository", () => ({
    findOrCreateDirectChat: jest.fn(),
    getChatById: jest.fn(),
    listChatsForUser: jest.fn(),
}));

jest.mock("@/src/db/queries/conversations", () => ({
    upsertConversation: jest.fn(),
}));

jest.mock("@/src/sync/applyServerData", () => ({
    applyConversations: jest.fn(),
    applyUsers: jest.fn(),
    extractConversationUsers: jest.fn(() => []),
}));

jest.mock("@/src/transport/rest/conversations", () => ({
    createDirectConversationRequest: jest.fn(),
    listConversationsRequest: jest.fn(),
}));

jest.mock("@/src/transport/rest/users", () => ({
    batchUsersRequest: jest.fn(),
    searchUsersRequest: jest.fn(),
}));

import {
    getChatUserDisplayName,
    loadChatById,
    loadChats,
    openOrCreateDirectChat,
    UNRESOLVED_PROFILE_LABEL,
} from "@/src/usecases/chats";
import * as chatRepository from "@/src/repository/chatRepository";
import * as conversationsQuery from "@/src/db/queries/conversations";
import * as syncApply from "@/src/sync/applyServerData";
import * as conversationsTransport from "@/src/transport/rest/conversations";
import * as usersTransport from "@/src/transport/rest/users";
import { ApiError } from "@/src/transport/rest/client";

const mockedFindOrCreateDirectChat = jest.mocked(
    chatRepository.findOrCreateDirectChat,
);
const mockedGetChatById = jest.mocked(chatRepository.getChatById);
const mockedListChatsForUser = jest.mocked(chatRepository.listChatsForUser);
const mockedUpsertConversation = jest.mocked(conversationsQuery.upsertConversation);
const mockedApplyConversations = jest.mocked(syncApply.applyConversations);
const mockedApplyUsers = jest.mocked(syncApply.applyUsers);
const mockedExtractConversationUsers = jest.mocked(
    syncApply.extractConversationUsers,
);
const mockedCreateDirectConversationRequest = jest.mocked(
    conversationsTransport.createDirectConversationRequest,
);
const mockedListConversationsRequest = jest.mocked(
    conversationsTransport.listConversationsRequest,
);
const mockedBatchUsersRequest = jest.mocked(usersTransport.batchUsersRequest);
const mockedSearchUsersRequest = jest.mocked(usersTransport.searchUsersRequest);

describe("chats usecases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loadChats delegates to listChatsForUser", async () => {
        const rows = [{ id: "chat-1" }] as any;
        mockedListChatsForUser.mockResolvedValue(rows);

        await expect(loadChats("user-1")).resolves.toEqual(rows);
        expect(mockedListChatsForUser).toHaveBeenCalledWith("user-1");
    });

    it("loadChats hydrates fallback users via conversations and user search", async () => {
        const placeholder = {
            chat: { id: "chat-1" },
            otherUser: {
                id: "u2",
                username: "u2",
                displayName: "u2",
                avatar: null,
                createdAt: 1,
            },
            lastMessage: null,
        } as any;
        const resolved = {
            ...placeholder,
            otherUser: {
                ...placeholder.otherUser,
                username: "alice",
                displayName: "Alice",
            },
        } as any;

        mockedListChatsForUser
            .mockResolvedValueOnce([placeholder])
            .mockResolvedValueOnce([placeholder])
            .mockResolvedValueOnce([resolved]);
        mockedListConversationsRequest.mockResolvedValue([]);
        mockedApplyConversations.mockResolvedValue(undefined);
        mockedBatchUsersRequest.mockResolvedValue([]);
        mockedSearchUsersRequest.mockResolvedValue([
            {
                id: "u2",
                username: "alice",
                display_name: "Alice",
            },
        ] as any);
        mockedApplyUsers.mockResolvedValue(undefined);

        await expect(loadChats("user-1")).resolves.toEqual([resolved]);
        expect(mockedListConversationsRequest).toHaveBeenCalledTimes(1);
        expect(mockedApplyConversations).toHaveBeenCalledWith(
            expect.objectContaining({
                currentUserId: "user-1",
            }),
        );
        expect(mockedBatchUsersRequest).toHaveBeenCalledWith({
            ids: ["u2"],
        });
        expect(mockedSearchUsersRequest).toHaveBeenCalledWith({
            query: "u2",
            limit: 20,
        });
        expect(mockedApplyUsers).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "u2",
                }),
            ]),
        );
    });

    it("loadChatById delegates to getChatById", async () => {
        const row = { id: "chat-1" } as any;
        mockedGetChatById.mockResolvedValue(row);

        await expect(loadChatById("chat-1")).resolves.toEqual(row);
        expect(mockedGetChatById).toHaveBeenCalledWith("chat-1");
    });

    it("maps unresolved users to loading label", () => {
        expect(
            getChatUserDisplayName({
                id: "uuid-1",
                username: "uuid-1",
                displayName: "uuid-1",
                avatar: null,
                createdAt: 1,
            }),
        ).toBe(UNRESOLVED_PROFILE_LABEL);
    });

    it("openOrCreateDirectChat uses backend conversation id when API succeeds", async () => {
        mockedCreateDirectConversationRequest.mockResolvedValue({
            id: "srv-chat-1",
            member_ids: ["1", "2"],
        } as any);
        mockedUpsertConversation.mockResolvedValue(null as any);
        mockedGetChatById.mockResolvedValue({
            id: "srv-chat-1",
        } as any);
        mockedApplyUsers.mockResolvedValue(undefined);

        await expect(
            openOrCreateDirectChat({ currentUserId: "1", otherUserId: "2" }),
        ).resolves.toEqual({ id: "srv-chat-1" });
        expect(mockedCreateDirectConversationRequest).toHaveBeenCalled();
        expect(mockedUpsertConversation).toHaveBeenCalled();
        expect(mockedExtractConversationUsers).toHaveBeenCalled();
    });

    it("openOrCreateDirectChat falls back to local create on API failure", async () => {
        mockedCreateDirectConversationRequest.mockRejectedValue(
            new ApiError({
                status: 0,
                code: "NETWORK_ERROR",
                message: "Network error",
            }),
        );
        mockedFindOrCreateDirectChat.mockResolvedValue({ id: "1__2" } as any);

        await expect(
            openOrCreateDirectChat({ currentUserId: "1", otherUserId: "2" }),
        ).resolves.toEqual({ id: "1__2" });
        expect(mockedFindOrCreateDirectChat).toHaveBeenCalledWith({
            currentUserId: "1",
            otherUserId: "2",
        });
    });
});
