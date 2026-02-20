import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEvent,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getChatById, getChatsForUser } from "@/src/service/chats";
import { getListMessages, sendMessage } from "@/src/service/messages";
import { Message } from "@/src/domain/types";
import { ChatState, useChatStore } from "@/src/state/useChatStore";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { MessageBubble } from "@/src/ui/components/MessageBubble";
import { Button } from "@/src/ui/components/Button";

type HeaderChatUser = {
  displayName: string;
  avatar: string;
  lastSeenAt: number;
};

function formatLastSeen(timestamp: number) {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Был в ${time}`;
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const userId = useSessionStore((state: SessionState) => state.userId);
  const { theme } = useTheme();

  const draft = useChatStore((state: ChatState) =>
    chatId ? (state.draftByChatId[chatId] ?? "") : "",
  );
  const setDraft = useChatStore((state: ChatState) => state.setDraft);

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatUser, setChatUser] = useState<HeaderChatUser | null>(null);
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

  const loadHeaderUser = useCallback(async () => {
    if (!resolvedChatId || !userId) {
      setChatUser(null);
      return;
    }
    const chats = await getChatsForUser({ userId });
    const currentChat = chats.find((item) => item.chat.id === resolvedChatId);
    if (!currentChat) {
      setChatUser(null);
      return;
    }
    setChatUser({
      displayName: currentChat.otherUser.displayName,
      avatar: currentChat.otherUser.avatar,
      lastSeenAt:
        currentChat.lastMessage?.createdAt ?? currentChat.chat.createdAt,
    });
  }, [resolvedChatId, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
      void loadHeaderUser();
    }, [loadHeaderUser, loadMessages]),
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: "",
      headerLeft: () => (
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          {chatUser?.avatar ? (
            <Image
              source={{ uri: chatUser.avatar }}
              style={styles.avatarImage}
            />
          ) : null}
          <View style={styles.headerText}>
            <Text
              style={[styles.headerName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {chatUser?.displayName ?? "Chat"}
            </Text>
            <Text
              style={[styles.headerLastSeen, { color: theme.colors.mutedText }]}
              numberOfLines={1}
            >
              {chatUser ? formatLastSeen(chatUser.lastSeenAt) : ""}
            </Text>
          </View>
        </View>
      ),
    });
  }, [chatUser, navigation, theme.colors.mutedText, theme.colors.text]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight - 20 : 0}
    >
      <SafeAreaView
        style={[styles.inner, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
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
            <Text style={[styles.empty, { color: theme.colors.mutedText }]}>
              No messages yet. Say hi.
            </Text>
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View
          style={[
            styles.composer,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(resolvedChatId, text)}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
              },
            ]}
            placeholder="Сообщение..."
            placeholderTextColor={theme.colors.mutedText}
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 280,
  },
  backButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerLastSeen: {
    fontSize: 12,
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  empty: {
    textAlign: "center",
    marginTop: 18,
  },
});
