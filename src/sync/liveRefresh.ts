import { subscribeDataEvents } from "@/src/sync/dataEvents";

export function bindChatLiveRefresh(input: {
    conversationId: string;
    refreshMessages: () => void;
    refreshHeader: () => void;
}) {
    if (!input.conversationId) {
        return () => {};
    }

    return subscribeDataEvents((event) => {
        if (
            event.type === "messages_changed" &&
            event.conversationId === input.conversationId
        ) {
            input.refreshMessages();
            input.refreshHeader();
            return;
        }

        if (
            event.type === "conversations_changed" &&
            (!event.conversationId ||
                event.conversationId === input.conversationId)
        ) {
            input.refreshHeader();
        }
    });
}

export function bindChatsLiveRefresh(input: {
    reload: () => void;
    debounceMs?: number;
}) {
    const debounceMs = input.debounceMs ?? 120;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
        if (timer) {
            return;
        }
        timer = setTimeout(() => {
            timer = null;
            input.reload();
        }, debounceMs);
    };

    const unsubscribe = subscribeDataEvents((event) => {
        if (
            event.type === "messages_changed" ||
            event.type === "conversations_changed"
        ) {
            scheduleReload();
        }
    });

    return () => {
        unsubscribe();
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };
}
