import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEvent,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getChatById } from "@/src/service/chats";
import { getListMessages, sendMessage } from "@/src/service/messages";
import { Message } from "@/src/domain/types";
import { ChatState, useChatStore } from "@/src/state/useChatStore";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { Button } from "@/src/ui/components/Button";
import { MessageBubble } from "@/src/ui/components/MessageBubble";

export default function ChatScreen() {
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const userId = useSessionStore((state: SessionState) => state.userId);

  const draft = useChatStore((state: ChatState) =>
    chatId ? (state.draftByChatId[chatId] ?? "") : "",
  );
  const setDraft = useChatStore((state: ChatState) => state.setDraft);

  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const resolvedChatId = useMemo(() => chatId ?? "", [chatId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!resolvedChatId) {
      setMessages([]);
      return;
    }
    const result = await getListMessages({ chatId: resolvedChatId });
    setMessages(result);
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  }, [resolvedChatId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
    }, [loadMessages]),
  );

  const onSend = useCallback(async () => {
    if (!userId || !resolvedChatId || !draft.trim() || sending) {
      return;
    }

    setSending(true);

    try {
      await sendMessage({
        chatId: resolvedChatId,
        senderId: userId,
        content: draft,
      });
      setDraft(resolvedChatId, "");
      await loadMessages();

      const chat = await getChatById({ chatId: resolvedChatId });
      if (!chat) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void (async () => {
          await loadMessages();
        })();
      }, 1200);
    } finally {
      setSending(false);
    }
  }, [draft, loadMessages, resolvedChatId, sending, setDraft, userId]);

  const onInputKeyPress = useCallback(
    (event: TextInputKeyPressEvent) => {
      if (Platform.OS === "web" && event.nativeEvent.key === "Enter") {
        void onSend();
      }
    },
    [onSend],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : Platform.OS === "android"
              ? "height"
              : undefined
        }
        keyboardVerticalOffset={8}
      >
        <View style={styles.topBar}>
          <Button title="Back" onPress={() => router.back()} />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              body={item.content}
              mine={item.senderId === userId}
              timestamp={item.createdAt}
            />
          )}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>No messages yet. Say hi.</Text>
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(resolvedChatId, text)}
            style={styles.input}
            placeholder="Сообщение..."
            returnKeyType="send"
            onSubmitEditing={() => void onSend()}
            onKeyPress={onInputKeyPress}
          />
          <Button
            title={sending ? "Отправка..." : " > "}
            onPress={() => void onSend()}
            disabled={sending || !draft.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  inner: {
    flex: 1,
  },
  topBar: {
    padding: 12,
  },
  messages: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  empty: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 18,
  },
});
