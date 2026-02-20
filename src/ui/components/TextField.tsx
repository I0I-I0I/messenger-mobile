import { StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type TextFieldProps = {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

export function TextField({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    autoCapitalize = "none",
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
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text,
                    },
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
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
});
