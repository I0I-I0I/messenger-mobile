jest.mock("@/src/db/queries/conversations", () => ({
    listConversationsForUser: jest.fn(),
    listConversationIdsForUser: jest.fn(),
    getConversationById: jest.fn(),
    findOrCreateDirectConversation: jest.fn(),
}));

jest.mock("@/src/db/queries/messages", () => ({
    getLastMessageForConversation: jest.fn(),
}));

jest.mock("@/src/db/queries/users", () => ({
    getUserById: jest.fn(),
}));

import { listConversationsForUser } from "@/src/db/queries/conversations";
import { getLastMessageForConversation } from "@/src/db/queries/messages";
import { getUserById } from "@/src/db/queries/users";
import { listChatsForUser } from "@/src/repository/chatRepository";

const mockedListConversationsForUser = jest.mocked(listConversationsForUser);
const mockedGetLastMessageForConversation = jest.mocked(
    getLastMessageForConversation,
);
const mockedGetUserById = jest.mocked(getUserById);

describe("chat repository", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns chat row even if other user profile is missing locally", async () => {
        mockedListConversationsForUser.mockResolvedValue([
            {
                id: "chat-1",
                userA: "user-me",
                userB: "user-remote",
                createdAt: 100,
                updatedAt: 100,
                lastMessagePreview: "hi",
                lastMessageAt: 100,
                unreadCount: 0,
            } as any,
        ]);
        mockedGetUserById.mockResolvedValue(null);
        mockedGetLastMessageForConversation.mockResolvedValue(null);

        const rows = await listChatsForUser("user-me");

        expect(rows).toHaveLength(1);
        expect(rows[0].otherUser.id).toBe("user-remote");
        expect(rows[0].otherUser.displayName).toBe("user-remote");
    });
});
