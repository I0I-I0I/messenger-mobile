import { router, useFocusEffect } from "expo-router";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { ChatRow } from "@/src/ui/components/ChatRow";
import { ChatListItem } from "@/src/domain/types";
import { loadChats } from "@/src/usecases/chats";

export default function HomeScreen() {
    const userId = useSessionStore((state: SessionState) => state.userId);
    const { theme } = useTheme();
    const [items, setItems] = useState<ChatListItem[]>([]);

    const load = useCallback(async () => {
        if (!userId) {
            setItems([]);
            return;
        }
        const result = await loadChats(userId);
        setItems(result);
    }, [userId]);

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
            edges={[]}
        >
            <FlatList
                data={items}
                keyExtractor={(item) => item.chat.id}
                renderItem={({ item }) => (
                    <ChatRow
                        style={styles.listItem}
                        item={item}
                        onPress={() => {
                            router.push({
                                pathname: "/(app)/chat/[chatId]",
                                params: { chatId: item.chat.id },
                            });
                        }}
                    />
                )}
                ListEmptyComponent={
                    <Text
                        style={[
                            styles.empty,
                            { color: theme.colors.mutedText },
                        ]}
                    >
                        У вас пока нет чатов
                    </Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listItem: {
        borderBottomWidth: 1,
    },
    empty: {
        textAlign: "center",
        marginTop: 18,
    },
});
