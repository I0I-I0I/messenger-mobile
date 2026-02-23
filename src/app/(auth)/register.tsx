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
import {
    AUTH_VALIDATION_MESSAGES,
    RegisterFieldErrors,
    validateDisplayName,
    validatePassword,
    validateRegisterInput,
    validateUsername,
} from "@/src/domain/authValidation";
import { backOrReplace } from "@/src/navigation/authNavigation";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Button } from "@/src/ui/components/Button";
import { TextField } from "@/src/ui/components/TextField";
import { registerWithPassword } from "@/src/usecases/auth";

const INITIAL_TOUCHED_STATE = {
    username: false,
    displayName: false,
    password: false,
};

export default function RegisterScreen() {
    const login = useSessionStore((state: SessionState) => state.login);
    const { theme } = useTheme();
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [touched, setTouched] = useState(INITIAL_TOUCHED_STATE);
    const [loading, setLoading] = useState(false);

    const currentValidationErrors = validateRegisterInput({
        username,
        displayName,
        password,
    });
    const hasValidationErrors =
        Boolean(currentValidationErrors.username) ||
        Boolean(currentValidationErrors.displayName) ||
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

    function onDisplayNameChange(value: string) {
        setDisplayName(value);
        setFormError(null);
        if (!touched.displayName) {
            return;
        }
        const nextError = validateDisplayName(value);
        setFieldErrors((current) => ({
            ...current,
            displayName: nextError ?? undefined,
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

    function onDisplayNameBlur() {
        setTouched((current) => ({ ...current, displayName: true }));
        const nextError = validateDisplayName(displayName);
        setFieldErrors((current) => ({
            ...current,
            displayName: nextError ?? undefined,
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

    async function onRegister() {
        const nextFieldErrors = validateRegisterInput({
            username,
            displayName,
            password,
        });
        const hasErrors =
            Boolean(nextFieldErrors.username) ||
            Boolean(nextFieldErrors.displayName) ||
            Boolean(nextFieldErrors.password);
        setTouched({
            username: true,
            displayName: true,
            password: true,
        });
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        if (hasErrors) {
            return;
        }

        setLoading(true);

        try {
            const session = await registerWithPassword({
                username: username.trim(),
                displayName: displayName.trim(),
                password,
            });
            await login(session.userId);
            router.replace("/(app)/(tabs)/chats");
        } catch (error) {
            const message = error instanceof Error ? error.message : "UNKNOWN";

            if (message === "USERNAME_TAKEN") {
                setFieldErrors((current) => ({
                    ...current,
                    username: "Такой логин уже существует.",
                }));
                return;
            }
            if (message === "NETWORK_ERROR") {
                setFormError(AUTH_VALIDATION_MESSAGES.networkUnavailable);
                return;
            }
            if (message === "PASSWORD_TOO_SHORT") {
                setFieldErrors((current) => ({
                    ...current,
                    password: AUTH_VALIDATION_MESSAGES.passwordTooShort,
                }));
                return;
            }

            setFormError(
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
                        Регистрация
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
                        placeholder="Имя пользователя"
                        value={displayName}
                        onChangeText={onDisplayNameChange}
                        onBlur={onDisplayNameBlur}
                        style={styles.input}
                        autoCapitalize="words"
                    />
                    {fieldErrors.displayName ? (
                        <Text
                            selectable
                            style={[
                                styles.fieldError,
                                { color: theme.colors.notification },
                            ]}
                        >
                            {fieldErrors.displayName}
                        </Text>
                    ) : null}
                    <TextField
                        placeholder="Пароль (Не менее 8 символов)"
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
                        title={
                            loading
                                ? "Создание аккаунта..."
                                : "Зарегистрироваться"
                        }
                        onPress={onRegister}
                        disabled={isSubmitDisabled}
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
    fieldError: {
        marginTop: -6,
    },
    formError: {},
});
