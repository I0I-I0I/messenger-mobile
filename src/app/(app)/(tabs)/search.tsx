import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDebounce } from "use-debounce";

import { User } from "@/src/domain/types";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { TextField } from "@/src/ui/components/TextField";
import { UserRow } from "@/src/ui/components/UserRow";
import { openOrCreateDirectChat } from "@/src/usecases/chats";
import { searchUsersByQuery } from "@/src/usecases/users";

export default function FriendsScreen() {
    const userId = useSessionStore((state: SessionState) => state.userId);
    const { theme } = useTheme();
    const [query, setQuery] = useState("");
    const [debouncedQuery] = useDebounce(query, 500);
    const trimmedQuery = debouncedQuery.trim();
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        let active = true;

        async function load() {
            if (trimmedQuery === "") {
                if (active) {
                    setUsers([]);
                }
                return;
            }
            if (!userId) {
                if (active) {
                    setUsers([]);
                }
                return;
            }
            try {
                const result = await searchUsersByQuery({
                    query: trimmedQuery,
                    limit: 10,
                });
                if (active) {
                    setUsers(result);
                }
            } catch {
                if (active) {
                    setUsers([]);
                }
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [debouncedQuery, trimmedQuery, userId]);

    async function openChat(otherUserId: string) {
        if (!userId) {
            return;
        }
        const chat = await openOrCreateDirectChat({
            currentUserId: userId,
            otherUserId: otherUserId,
        });
        router.push({
            pathname: "/(app)/chat/[chatId]",
            params: { chatId: chat.id },
        });
    }

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
            edges={[]}
        >
            <TextField
                label=""
                value={query}
                onChangeText={setQuery}
                placeholder="Поиск пользователя..."
            />

            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    if (item.id === userId) {
                        return null;
                    }

                    return (
                        <UserRow
                            style={styles.listItem}
                            user={item}
                            onPress={() => void openChat(item.id)}
                        />
                    );
                }}
                ListEmptyComponent={
                    trimmedQuery ? (
                        <Text
                            style={[
                                styles.empty,
                                { color: theme.colors.mutedText },
                            ]}
                        >
                            Никого не найдено
                        </Text>
                    ) : null
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
