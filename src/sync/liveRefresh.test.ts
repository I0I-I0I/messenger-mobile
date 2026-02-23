import {
    emitConversationsChanged,
    emitMessagesChanged,
} from "@/src/sync/dataEvents";
import {
    bindChatLiveRefresh,
    bindChatsLiveRefresh,
} from "@/src/sync/liveRefresh";

describe("live refresh bindings", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it("chat binding reacts only to matching conversation events", () => {
        const refreshMessages = jest.fn();
        const refreshHeader = jest.fn();

        const unsubscribe = bindChatLiveRefresh({
            conversationId: "chat-1",
            refreshMessages,
            refreshHeader,
        });

        emitMessagesChanged("chat-2");
        emitConversationsChanged("chat-2");
        expect(refreshMessages).toHaveBeenCalledTimes(0);
        expect(refreshHeader).toHaveBeenCalledTimes(0);

        emitConversationsChanged("chat-1");
        expect(refreshMessages).toHaveBeenCalledTimes(0);
        expect(refreshHeader).toHaveBeenCalledTimes(1);

        emitMessagesChanged("chat-1");
        expect(refreshMessages).toHaveBeenCalledTimes(1);
        expect(refreshHeader).toHaveBeenCalledTimes(2);

        unsubscribe();
        emitMessagesChanged("chat-1");
        emitConversationsChanged("chat-1");
        expect(refreshMessages).toHaveBeenCalledTimes(1);
        expect(refreshHeader).toHaveBeenCalledTimes(2);
    });

    it("chats binding debounces reload events", () => {
        const reload = jest.fn();
        const unsubscribe = bindChatsLiveRefresh({
            reload,
            debounceMs: 120,
        });

        emitMessagesChanged("chat-1");
        emitConversationsChanged("chat-1");
        emitMessagesChanged("chat-2");

        expect(reload).toHaveBeenCalledTimes(0);
        jest.advanceTimersByTime(119);
        expect(reload).toHaveBeenCalledTimes(0);
        jest.advanceTimersByTime(1);
        expect(reload).toHaveBeenCalledTimes(1);

        emitConversationsChanged("chat-2");
        emitConversationsChanged("chat-3");
        jest.advanceTimersByTime(120);
        expect(reload).toHaveBeenCalledTimes(2);

        unsubscribe();
        emitMessagesChanged("chat-1");
        jest.advanceTimersByTime(120);
        expect(reload).toHaveBeenCalledTimes(2);
    });
});
