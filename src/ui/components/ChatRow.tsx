import { Pressable, StyleSheet, Text, View, Image } from "react-native";

import { ChatListItem } from "@/src/domain/types";
import { useTheme } from "@/src/theme/ThemeProvider";

type ChatRowProps = {
    item: ChatListItem;
    onPress: () => void;
};

function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ChatRow({ item, onPress }: ChatRowProps) {
    const { theme } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.row,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                },
                pressed && styles.pressed,
            ]}
        >
            <Image
                source={{ uri: item.otherUser.avatar }}
                style={styles.avatarImage}
            />
            <View style={styles.main}>
                <View style={styles.header}>
                    <Text style={[styles.name, { color: theme.colors.text }]}>
                        {item.otherUser.displayName}
                    </Text>
                    <Text
                        style={[styles.time, { color: theme.colors.mutedText }]}
                    >
                        {formatTime(
                            item.lastMessage?.createdAt ?? item.chat.createdAt,
                        )}
                    </Text>
                </View>
                <Text
                    style={[styles.preview, { color: theme.colors.mutedText }]}
                    numberOfLines={1}
                >
                    {item.lastMessage?.content ?? "No messages yet"}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    pressed: {
        opacity: 0.75,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    main: {
        flex: 1,
        gap: 4,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    name: {
        fontSize: 16,
        fontWeight: "600",
    },
    time: { fontSize: 12 },
    preview: {},
});
