import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { Button } from "@/src/ui/components/Button";

export default function HomeScreen() {
  const logout = useSessionStore((state: SessionState) => state.logout);

  async function onLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Messenger Mock</Text>
      <View style={styles.buttons}>
        <Button title="Chats" onPress={() => router.push("/(app)/home")} />
        <Button
          title="Find friends"
          onPress={() => router.push("/(app)/home")}
        />
        <Button title="Logout" onPress={onLogout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 20,
    justifyContent: "center",
    gap: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  buttons: {
    gap: 12,
  },
});
