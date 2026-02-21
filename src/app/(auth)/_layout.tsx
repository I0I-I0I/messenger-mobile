import { Redirect, Stack } from "expo-router";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";

export default function AuthLayout() {
    const userId = useSessionStore((state: SessionState) => state.userId);
    const hydrated = useSessionStore((state: SessionState) => state.hydrated);
    const { theme } = useTheme();

    if (!hydrated) {
        return null;
    }

    if (userId) {
        return <Redirect href="/(app)/(tabs)/chats" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
            }}
        />
    );
}
