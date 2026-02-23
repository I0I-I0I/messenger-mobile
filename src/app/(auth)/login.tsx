import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Button } from "@/src/ui/components/Button";
import { TextField } from "@/src/ui/components/TextField";
import { loginWithPassword } from "@/src/usecases/auth";
import config from "@/src/config";
import { clearDb } from "@/src/db";

export default function LoginScreen() {
    const login = useSessionStore((state: SessionState) => state.login);
    const router = useRouter();
    const { theme } = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onLogin() {
        setError(null);
        setLoading(true);

        try {
            const session = await loginWithPassword({
                username,
                password,
            });
            await login(session.userId);
            router.replace("/(app)/(tabs)/chats");
        } catch (error) {
            const message = error instanceof Error ? error.message : "UNKNOWN";
            if (
                message === "INVALID_PASSWORD" ||
                message === "INVALID_CREDENTIALS" ||
                message === "INVALID_LOGIN" ||
                message === "USER_NOT_FOUND"
            ) {
                setError("Неправильный пароль");
                return;
            }
            if (message === "NETWORK_ERROR") {
                setError("Сервер недоступен");
                return;
            }
            // setError(`Ошибка входа + ${config.DEBUG ? error : ""}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                        Войти
                    </Text>
                    <TextField
                        placeholder="Логин"
                        value={username}
                        onChangeText={setUsername}
                        style={styles.input}
                        autoCapitalize="none"
                    />
                    <TextField
                        placeholder="Пароль"
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
                        title={loading ? "Вход..." : "Войти"}
                        onPress={onLogin}
                        disabled={loading}
                    />

                    <Link
                        href="/(auth)/register"
                        style={[styles.link, { color: theme.colors.primary }]}
                    >
                        Создать аккаунт
                    </Link>
                    {config.DEBUG ? (
                        <Button
                            title="RESET_DB"
                            onPress={() => void clearDb()}
                        />
                    ) : null}
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
        padding: 20,
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
