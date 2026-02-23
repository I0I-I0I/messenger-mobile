jest.mock("@/src/repository/messageRepository", () => ({
    enqueueSendMessage: jest.fn(),
    listMessages: jest.fn(),
}));

jest.mock("@/src/sync/syncScheduler", () => ({
    runSyncCycle: jest.fn(),
}));

jest.mock("@/src/sync/dataEvents", () => ({
    emitSyncWarning: jest.fn(),
}));

import { loadMessages, sendMessage } from "@/src/usecases/messages";
import * as messageRepository from "@/src/repository/messageRepository";
import * as dataEvents from "@/src/sync/dataEvents";
import * as syncScheduler from "@/src/sync/syncScheduler";

const mockedEnqueueSendMessage = jest.mocked(
    messageRepository.enqueueSendMessage,
);
const mockedListMessages = jest.mocked(messageRepository.listMessages);
const mockedRunSyncCycle = jest.mocked(syncScheduler.runSyncCycle);
const mockedEmitSyncWarning = jest.mocked(dataEvents.emitSyncWarning);

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
        mockedRunSyncCycle.mockResolvedValue(undefined);

        await expect(sendMessage(input)).resolves.toEqual(localMessage);
        expect(mockedEnqueueSendMessage).toHaveBeenCalledWith(input);
        expect(mockedRunSyncCycle).toHaveBeenCalledWith("user-1");
        expect(mockedEmitSyncWarning).not.toHaveBeenCalled();
    });

    it("sendMessage keeps local success when sync fails", async () => {
        const input = {
            chatId: "chat-1",
            senderId: "user-1",
            content: "hello",
        };
        mockedEnqueueSendMessage.mockResolvedValue({
            id: "local-msg-1",
        } as any);
        mockedRunSyncCycle.mockRejectedValue(new Error("SYNC_ERROR"));

        await expect(sendMessage(input)).resolves.toEqual({
            id: "local-msg-1",
        });
        expect(mockedEnqueueSendMessage).toHaveBeenCalledWith(input);
        expect(mockedEmitSyncWarning).toHaveBeenCalledWith({
            code: "OUTBOX_SYNC_FAILED",
            message: "SYNC_ERROR",
        });
    });
});
