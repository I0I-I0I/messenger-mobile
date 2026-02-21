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

import SendIcon from "@/assets/icons/send.svg";
import { getChatById, getChatsForUser } from "@/src/service/chats";
import { getListMessages, sendMessage } from "@/src/service/messages";
import { Message } from "@/src/domain/types";
import { ChatState, useChatStore } from "@/src/state/useChatStore";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { MessageBubble } from "@/src/ui/components/MessageBubble";

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
        const timeoutId = timerRef.current;
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    });

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
        const currentChat = chats.find(
            (item) => item.chat.id === resolvedChatId,
        );
        if (!currentChat) {
            setChatUser(null);
            return;
        }
        setChatUser({
            displayName: currentChat.otherUser.displayName,
            avatar: currentChat.otherUser.avatar,
            lastSeenAt:
                currentChat.lastMessage?.createdAt ??
                currentChat.chat.createdAt,
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
                        <Ionicons
                            name="chevron-back"
                            size={22}
                            color={theme.colors.text}
                        />
                    </Pressable>
                    {chatUser?.avatar ? (
                        <Image
                            source={{ uri: chatUser.avatar }}
                            style={styles.avatarImage}
                        />
                    ) : null}
                    <View style={styles.headerText}>
                        <Text
                            style={[
                                styles.headerName,
                                { color: theme.colors.text },
                            ]}
                            numberOfLines={1}
                        >
                            {chatUser?.displayName ?? "Chat"}
                        </Text>
                        <Text
                            style={[
                                styles.headerLastSeen,
                                { color: theme.colors.mutedText },
                            ]}
                            numberOfLines={1}
                        >
                            {chatUser
                                ? formatLastSeen(chatUser.lastSeenAt)
                                : ""}
                        </Text>
                    </View>
                </View>
            ),
        });
    }, [chatUser, navigation, theme.colors.mutedText, theme.colors.text]);

    const onSend = useCallback(async () => {
        const content = draft.trim();
        if (!userId || !resolvedChatId || !content || sending) {
            return;
        }

        setSending(true);

        try {
            const message = await sendMessage({
                chatId: resolvedChatId,
                senderId: userId,
                content,
            });

            setDraft(resolvedChatId, "");
            setMessages((prev) => [...prev, message]);

            const chat = await getChatById({ chatId: resolvedChatId });
            if (!chat) {
                return;
            }

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        } finally {
            setSending(false);
        }
    }, [draft, resolvedChatId, sending, setDraft, userId]);

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
            keyboardVerticalOffset={
                Platform.OS === "ios" ? headerHeight - 20 : 0
            }
        >
            <SafeAreaView
                style={[
                    styles.inner,
                    { backgroundColor: theme.colors.background },
                ]}
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
                        <Text
                            style={[
                                styles.empty,
                                { color: theme.colors.mutedText },
                            ]}
                        >
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
                            paddingBottom: Math.max(insets.bottom, 10),
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
                                backgroundColor: theme.colors.inputBackground,
                                color: theme.colors.text,
                            },
                        ]}
                        placeholder="Сообщение..."
                        placeholderTextColor={theme.colors.mutedText}
                        returnKeyType="send"
                        onSubmitEditing={() => void onSend()}
                        onKeyPress={onInputKeyPress}
                    />
                    <Pressable
                        style={[
                            styles.sendButton,
                            {
                                backgroundColor: theme.colors.primary,
                                opacity:
                                    sending || !draft.trim() ? 0.5 : 1,
                            },
                        ]}
                        onPress={() => void onSend()}
                        disabled={sending || !draft.trim()}
                        hitSlop={6}
                    >
                        <SendIcon width={20} height={20} color="#ffffff" />
                    </Pressable>
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
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: -3,
        },
        elevation: 6,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    empty: {
        textAlign: "center",
        marginTop: 18,
    },
});
