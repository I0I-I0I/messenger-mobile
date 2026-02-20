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

import { hashPassword } from "@/src/domain/validators";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { Button } from "@/src/ui/components/Button";
import { TextField } from "@/src/ui/components/TextField";

export default function LoginScreen() {
  const login = useSessionStore((state: SessionState) => state.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setError(null);
    setLoading(true);

    try {
      const user = { id: "1", email: "test@example.com", passwordHash: "hash" };
      if (!user) {
        setError("User not found.");
        return;
      }

      const hash = await hashPassword(password);
      if (hash !== user.passwordHash) {
        setError("Invalid password.");
        return;
      }

      await login(user.id);
      router.replace("/(app)/home");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Войти</Text>
          <TextField
            label="Логин"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextField
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={loading ? "Вход..." : "Войти"}
            onPress={onLogin}
            disabled={loading}
          />

          <Link href="/(auth)/register" style={styles.link}>
            Создать аккаунт
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
    backgroundColor: "#f3f4f6",
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
    color: "#111827",
    marginBottom: 8,
  },
  link: {
    color: "#1f6feb",
    textAlign: "center",
    marginTop: 8,
  },
  error: {
    color: "#b91c1c",
  },
});
