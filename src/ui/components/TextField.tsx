import {
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    View,
} from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type TextFieldProps = {
    value: string;
    label?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    style?: StyleProp<TextStyle>;
};

export function TextField({
    label = "",
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    autoCapitalize = "none",
    style = {},
}: TextFieldProps) {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            {label ? (
                <Text style={[styles.label, { color: theme.colors.text }]}>
                    {label}
                </Text>
            ) : null}
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.mutedText}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
                style={[
                    styles.input,
                    {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.inputBackground,
                        color: theme.colors.text,
                    },
                    style,
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 16,
    },
});
