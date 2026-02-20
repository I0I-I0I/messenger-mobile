import { Redirect, Stack } from "expo-router";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";

export default function AppLayout() {
  const userId = useSessionStore((state: SessionState) => state.userId);

  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
