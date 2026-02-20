import { Link, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { validateRegistrationInput } from "@/src/domain/validators";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Button } from "@/src/ui/components/Button";
import { TextField } from "@/src/ui/components/TextField";

export default function RegisterScreen() {
  const login = useSessionStore((state: SessionState) => state.login);
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    const validationError = validateRegistrationInput(
      username,
      displayName,
      password,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await new Promise<{ id: string }>((res) => {
        setTimeout(() => {
          res({ id: "1" });
        });
      });
      await login(user.id);
      router.replace("/(app)/(tabs)/chats");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const normalized = message.toLowerCase();

      if (normalized.includes("unique") && normalized.includes("username")) {
        setError("Такой логин уже существует.");
        return;
      }

      if (normalized.includes("not null") && normalized.includes("username")) {
        setError(
          "В вашем браузере хранятся старые локальные данные. Попробуйте ввести новое имя пользователя один раз или удалите данные сайта и повторите попытку.",
        );
        return;
      }

      setError(`Не получается создать аккаунт. ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
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
            label="Логин"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextField
            label="Имя"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
          <TextField
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Как минимум 6 символов"
          />

          {error ? (
            <Text style={[styles.error, { color: theme.colors.notification }]}>
              {error}
            </Text>
          ) : null}

          <Button
            title={loading ? "Создание аккаунта..." : "Зарегистрироваться"}
            onPress={onRegister}
            disabled={loading}
          />

          <Link
            href="/(auth)/login"
            style={[styles.link, { color: theme.colors.primary }]}
          >
            Уже есть аккаунт? Войти
          </Link>
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
  link: {
    textAlign: "center",
    marginTop: 8,
  },
  error: {},
});
