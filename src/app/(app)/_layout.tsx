import { Redirect, Stack } from "expo-router";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";

export default function AppLayout() {
  const userId = useSessionStore((state: SessionState) => state.userId);
  const { theme } = useTheme();

  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
