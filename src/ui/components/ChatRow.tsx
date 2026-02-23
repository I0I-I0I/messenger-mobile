import {
    Pressable,
    StyleSheet,
    Text,
    View,
    Image,
    StyleProp,
    ViewStyle,
} from "react-native";

import AvatarIcon from "@/assets/icons/avatar.svg";

import { ChatListItem } from "@/src/domain/types";
import { useTheme } from "@/src/theme/ThemeProvider";

type ChatRowProps = {
    item: ChatListItem;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
};

function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ChatRow({ item, onPress, style }: ChatRowProps) {
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
                style,
                pressed && styles.pressed,
            ]}
        >
            {item.otherUser.avatar !== null &&
            item.otherUser.avatar.length !== 0 ? (
                <Image
                    source={{ uri: item.otherUser.avatar }}
                    style={styles.avatarImage}
                />
            ) : (
                <AvatarIcon width={40} height={40} color={theme.colors.text} />
            )}
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
