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

import config from "@/src/config";
import {
    AUTH_VALIDATION_MESSAGES,
    LoginFieldErrors,
    validateLoginInput,
    validatePassword,
    validateUsername,
} from "@/src/domain/authValidation";
import { clearDb } from "@/src/db";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Button } from "@/src/ui/components/Button";
import { TextField } from "@/src/ui/components/TextField";
import { loginWithPassword } from "@/src/usecases/auth";

const INITIAL_TOUCHED_STATE = {
    username: false,
    password: false,
};

export default function LoginScreen() {
    const login = useSessionStore((state: SessionState) => state.login);
    const router = useRouter();
    const { theme } = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [touched, setTouched] = useState(INITIAL_TOUCHED_STATE);
    const [loading, setLoading] = useState(false);

    const currentValidationErrors = validateLoginInput({ username, password });
    const hasValidationErrors =
        Boolean(currentValidationErrors.username) ||
        Boolean(currentValidationErrors.password);
    const isSubmitDisabled = loading || hasValidationErrors;

    function onUsernameChange(value: string) {
        setUsername(value);
        setFormError(null);
        if (!touched.username) {
            return;
        }
        const nextError = validateUsername(value);
        setFieldErrors((current) => ({
            ...current,
            username: nextError ?? undefined,
        }));
    }

    function onPasswordChange(value: string) {
        setPassword(value);
        setFormError(null);
        if (!touched.password) {
            return;
        }
        const nextError = validatePassword(value);
        setFieldErrors((current) => ({
            ...current,
            password: nextError ?? undefined,
        }));
    }

    function onUsernameBlur() {
        setTouched((current) => ({ ...current, username: true }));
        const nextError = validateUsername(username);
        setFieldErrors((current) => ({
            ...current,
            username: nextError ?? undefined,
        }));
    }

    function onPasswordBlur() {
        setTouched((current) => ({ ...current, password: true }));
        const nextError = validatePassword(password);
        setFieldErrors((current) => ({
            ...current,
            password: nextError ?? undefined,
        }));
    }

    async function onLogin() {
        const nextFieldErrors = validateLoginInput({ username, password });
        const hasErrors =
            Boolean(nextFieldErrors.username) ||
            Boolean(nextFieldErrors.password);
        setTouched({ username: true, password: true });
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        if (hasErrors) {
            return;
        }

        setLoading(true);

        try {
            const session = await loginWithPassword({
                username: username.trim(),
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
                setFormError(AUTH_VALIDATION_MESSAGES.invalidCredentials);
                return;
            }
            if (message === "NETWORK_ERROR") {
                setFormError(AUTH_VALIDATION_MESSAGES.networkUnavailable);
                return;
            }
            setFormError(
                `Не получается войти. ${config.DEBUG ? message : ""}`.trim(),
            );
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
                        onChangeText={onUsernameChange}
                        onBlur={onUsernameBlur}
                        style={styles.input}
                        autoCapitalize="none"
                    />
                    {fieldErrors.username ? (
                        <Text
                            selectable
                            style={[
                                styles.fieldError,
                                { color: theme.colors.notification },
                            ]}
                        >
                            {fieldErrors.username}
                        </Text>
                    ) : null}
                    <TextField
                        placeholder="Пароль"
                        value={password}
                        onChangeText={onPasswordChange}
                        onBlur={onPasswordBlur}
                        style={styles.input}
                        secureTextEntry
                    />
                    {fieldErrors.password ? (
                        <Text
                            selectable
                            style={[
                                styles.fieldError,
                                { color: theme.colors.notification },
                            ]}
                        >
                            {fieldErrors.password}
                        </Text>
                    ) : null}

                    {formError ? (
                        <Text
                            selectable
                            style={[
                                styles.formError,
                                { color: theme.colors.notification },
                            ]}
                        >
                            {formError}
                        </Text>
                    ) : null}

                    <Button
                        title={loading ? "Вход..." : "Войти"}
                        onPress={onLogin}
                        disabled={isSubmitDisabled}
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
    fieldError: {
        marginTop: -6,
    },
    formError: {},
});
