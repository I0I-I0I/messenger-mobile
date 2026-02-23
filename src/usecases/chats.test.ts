jest.mock("@/src/repository/chatRepository", () => ({
    findOrCreateDirectChat: jest.fn(),
    getChatById: jest.fn(),
    listChatsForUser: jest.fn(),
}));

jest.mock("@/src/db/queries/conversations", () => ({
    upsertConversation: jest.fn(),
}));

jest.mock("@/src/sync/applyServerData", () => ({
    applyUsers: jest.fn(),
}));

jest.mock("@/src/transport/rest/conversations", () => ({
    createDirectConversationRequest: jest.fn(),
}));

import {
    loadChatById,
    loadChats,
    openOrCreateDirectChat,
} from "@/src/usecases/chats";
import * as chatRepository from "@/src/repository/chatRepository";
import * as conversationsQuery from "@/src/db/queries/conversations";
import * as syncApply from "@/src/sync/applyServerData";
import * as conversationsTransport from "@/src/transport/rest/conversations";
import { ApiError } from "@/src/transport/rest/client";

const mockedFindOrCreateDirectChat = jest.mocked(
    chatRepository.findOrCreateDirectChat,
);
const mockedGetChatById = jest.mocked(chatRepository.getChatById);
const mockedListChatsForUser = jest.mocked(chatRepository.listChatsForUser);
const mockedUpsertConversation = jest.mocked(conversationsQuery.upsertConversation);
const mockedApplyUsers = jest.mocked(syncApply.applyUsers);
const mockedCreateDirectConversationRequest = jest.mocked(
    conversationsTransport.createDirectConversationRequest,
);

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

    it("loadChatById delegates to getChatById", async () => {
        const row = { id: "chat-1" } as any;
        mockedGetChatById.mockResolvedValue(row);

        await expect(loadChatById("chat-1")).resolves.toEqual(row);
        expect(mockedGetChatById).toHaveBeenCalledWith("chat-1");
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
