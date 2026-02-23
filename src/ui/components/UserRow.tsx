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

import { User } from "@/src/domain/types";
import { useTheme } from "@/src/theme/ThemeProvider";

type UserRowProps = {
    user: User;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
};

export function UserRow({ user, onPress, style }: UserRowProps) {
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
            {user.avatar !== null && user.avatar.length !== 0 ? (
                <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatarImage}
                />
            ) : (
                <AvatarIcon width={40} height={40} color={theme.colors.text} />
            )}
            <View>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                    {user.displayName}
                </Text>
                <Text
                    style={[styles.username, { color: theme.colors.mutedText }]}
                >
                    @{user.username}
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
    name: {
        fontSize: 16,
        fontWeight: "600",
    },
    username: {},
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
});
