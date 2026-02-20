import { Redirect, Stack } from "expo-router";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextField } from "@/src/ui/components/TextField";
import { Text } from "react-native";

export default function AuthLayout() {
  const userId = useSessionStore((state: SessionState) => state.userId);

  if (userId) {
    return (
      <SafeAreaView edges={["top"]}>
        <Text>Hi</Text>
        <TextField value="h" placeholder="Type something" label="Type" />
      </SafeAreaView>
    );
    // return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
