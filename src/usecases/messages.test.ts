jest.mock("@/src/repository/messageRepository", () => ({
    enqueueSendMessage: jest.fn(),
    listMessages: jest.fn(),
}));

jest.mock("@/src/sync/outboxProcessor", () => ({
    processOutboxOnce: jest.fn(),
}));

import { loadMessages, sendMessage } from "@/src/usecases/messages";
import * as messageRepository from "@/src/repository/messageRepository";
import * as outboxProcessor from "@/src/sync/outboxProcessor";

const mockedEnqueueSendMessage = jest.mocked(
    messageRepository.enqueueSendMessage,
);
const mockedListMessages = jest.mocked(messageRepository.listMessages);
const mockedProcessOutboxOnce = jest.mocked(outboxProcessor.processOutboxOnce);

describe("messages usecases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loadMessages delegates to repository", async () => {
        const rows = [{ id: "1", content: "hello" }] as any;
        mockedListMessages.mockResolvedValue(rows);

        await expect(loadMessages("chat-1")).resolves.toEqual(rows);
        expect(mockedListMessages).toHaveBeenCalledWith("chat-1");
    });

    it("sendMessage enqueues local message and processes outbox", async () => {
        const input = {
            chatId: "chat-1",
            senderId: "user-1",
            content: "hello",
        };
        const localMessage = {
            id: "local-msg-1",
            chatId: "chat-1",
            senderId: "user-1",
            content: "hello",
            createdAt: Date.now(),
            status: "pending",
        } as const;
        mockedEnqueueSendMessage.mockResolvedValue(localMessage);
        mockedProcessOutboxOnce.mockResolvedValue(undefined);

        await expect(sendMessage(input)).resolves.toEqual(localMessage);
        expect(mockedEnqueueSendMessage).toHaveBeenCalledWith(input);
        expect(mockedProcessOutboxOnce).toHaveBeenCalledTimes(1);
    });

    it("sendMessage surfaces outbox processing errors", async () => {
        const input = {
            chatId: "chat-1",
            senderId: "user-1",
            content: "hello",
        };
        mockedEnqueueSendMessage.mockResolvedValue({
            id: "local-msg-1",
        } as any);
        mockedProcessOutboxOnce.mockRejectedValue(new Error("OUTBOX_ERROR"));

        await expect(sendMessage(input)).rejects.toThrow("OUTBOX_ERROR");
        expect(mockedEnqueueSendMessage).toHaveBeenCalledWith(input);
    });
});
