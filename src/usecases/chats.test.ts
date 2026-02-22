jest.mock("@/src/repository/chatRepository", () => ({
    findOrCreateDirectChat: jest.fn(),
    getChatById: jest.fn(),
    listChatsForUser: jest.fn(),
}));

import {
    loadChatById,
    loadChats,
    openOrCreateDirectChat,
} from "@/src/usecases/chats";
import * as chatRepository from "@/src/repository/chatRepository";

const mockedFindOrCreateDirectChat = jest.mocked(
    chatRepository.findOrCreateDirectChat,
);
const mockedGetChatById = jest.mocked(chatRepository.getChatById);
const mockedListChatsForUser = jest.mocked(chatRepository.listChatsForUser);

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

    it("openOrCreateDirectChat delegates to repository", async () => {
        const input = { currentUserId: "1", otherUserId: "2" };
        const row = { id: "1__2" } as any;
        mockedFindOrCreateDirectChat.mockResolvedValue(row);

        await expect(openOrCreateDirectChat(input)).resolves.toEqual(row);
        expect(mockedFindOrCreateDirectChat).toHaveBeenCalledWith(input);
    });
});
