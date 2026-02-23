export type DataEvent =
    | {
          type: "messages_changed";
          conversationId: string;
      }
    | {
          type: "conversations_changed";
          conversationId?: string;
      }
    | {
          type: "sync_warning";
          code: string;
          message: string;
      };

type DataEventListener = (event: DataEvent) => void;

const listeners = new Set<DataEventListener>();

function emit(event: DataEvent) {
    for (const listener of listeners) {
        try {
            listener(event);
        } catch {
            // Listeners must not break realtime/update pipelines.
        }
    }
}

export function subscribeDataEvents(listener: DataEventListener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function emitConversationsChanged(conversationId?: string) {
    emit({
        type: "conversations_changed",
        conversationId,
    });
}

export function emitMessagesChanged(conversationId: string) {
    emit({
        type: "messages_changed",
        conversationId,
    });
}

export function emitSyncWarning(input: { code: string; message: string }) {
    emit({
        type: "sync_warning",
        code: input.code,
        message: input.message,
    });
}
