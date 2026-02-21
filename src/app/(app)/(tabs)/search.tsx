import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { findOrCreateDirectChat } from "@/src/service/chats";
import { searchUsers } from "@/src/service/users";
import { User } from "@/src/domain/types";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { TextField } from "@/src/ui/components/TextField";
import { UserRow } from "@/src/ui/components/UserRow";

export default function FriendsScreen() {
    const userId = useSessionStore((state: SessionState) => state.userId);
    const { theme } = useTheme();
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        let active = true;

        async function load() {
            if (!userId) {
                if (active) {
                    setUsers([]);
                }
                return;
            }
            const result = await searchUsers({ query: query, limit: 10 });
            if (active) {
                setUsers(result);
            }
        }

        void load();

        return () => {
            active = false;
        };
    }, [query, userId]);

    async function openChat(otherUserId: string) {
        if (!userId) {
            return;
        }
        const chat = await findOrCreateDirectChat({
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
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <UserRow
                        user={item}
                        onPress={() => void openChat(item.id)}
                    />
                )}
                ListEmptyComponent={
                    <Text
                        style={[
                            styles.empty,
                            { color: theme.colors.mutedText },
                        ]}
                    >
                        Никого не найдено
                    </Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        gap: 12,
    },
    list: {
        gap: 10,
    },
    empty: {
        textAlign: "center",
        marginTop: 18,
    },
});
