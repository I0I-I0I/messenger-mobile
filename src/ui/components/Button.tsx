import { Pressable, StyleProp, StyleSheet, Text } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type ButtonProps = {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    style?: StyleProp<any>;
};

export function Button({
    title,
    onPress,
    style = {},
    disabled = false,
}: ButtonProps) {
    const { theme } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.colors.primary },
                style,
                disabled ? styles.disabled : null,
                pressed && !disabled ? styles.pressed : null,
            ]}
        >
            <Text style={styles.text}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    disabled: {
        opacity: 0.55,
    },
    pressed: {
        opacity: 0.8,
    },
    text: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
});
