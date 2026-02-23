import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import config from "@/src/config";
import { backOrReplace } from "@/src/navigation/authNavigation";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Button } from "@/src/ui/components/Button";
import { TextField } from "@/src/ui/components/TextField";
import { registerWithPassword } from "@/src/usecases/auth";

export default function RegisterScreen() {
    const login = useSessionStore((state: SessionState) => state.login);
    const { theme } = useTheme();
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onRegister() {
        setError(null);
        setLoading(true);

        try {
            const session = await registerWithPassword({
                username,
                displayName,
                password,
            });
            await login(session.userId);
            router.replace("/(app)/(tabs)/chats");
        } catch (error) {
            const message = error instanceof Error ? error.message : "UNKNOWN";

            if (message === "USERNAME_TAKEN") {
                setError("Такой логин уже существует.");
                return;
            }
            if (message === "NETWORK_ERROR") {
                setError("Сервер недоступен.");
                return;
            }

            setError(
                `Не получается создать аккаунт. ${config.DEBUG ? message : ""}`,
            );
        } finally {
            setLoading(false);
        }
    }

    function onGoToLogin() {
        backOrReplace("/(auth)/login");
    }

    return (
        <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <SafeAreaView
                style={[
                    styles.container,
                    { backgroundColor: theme.colors.background },
                ]}
                edges={["top"]}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        Регистрация
                    </Text>
                    <TextField
                        placeholder="Логин"
                        value={username}
                        onChangeText={setUsername}
                        style={styles.input}
                        autoCapitalize="none"
                    />
                    <TextField
                        placeholder="Имя пользователя"
                        value={displayName}
                        onChangeText={setDisplayName}
                        style={styles.input}
                        autoCapitalize="words"
                    />
                    <TextField
                        placeholder="Пароль (Не менее 6 символов)"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                    />

                    {error ? (
                        <Text
                            style={[
                                styles.error,
                                { color: theme.colors.notification },
                            ]}
                        >
                            {error}
                        </Text>
                    ) : null}

                    <Button
                        title={
                            loading
                                ? "Создание аккаунта..."
                                : "Зарегистрироваться"
                        }
                        onPress={onRegister}
                        disabled={loading}
                    />

                    <Pressable onPress={onGoToLogin}>
                        <Text
                            style={[
                                styles.link,
                                { color: theme.colors.primary },
                            ]}
                        >
                            Уже есть аккаунт? Войти
                        </Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoiding: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        padding: 16,
        justifyContent: "center",
        gap: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
    },
    input: {
        borderRadius: 8,
    },
    link: {
        textAlign: "center",
        marginTop: 8,
    },
    error: {},
});
