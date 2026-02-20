import { Redirect, Stack } from "expo-router";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";

export default function AuthLayout() {
  const userId = useSessionStore((state: SessionState) => state.userId);

  if (userId) {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
