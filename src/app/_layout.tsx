import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { startSyncScheduler, stopSyncScheduler } from "@/src/sync/syncScheduler";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";

function RootNavigator() {
    const { navTheme, theme } = useTheme();
    const hydrated = useSessionStore((state: SessionState) => state.hydrated);
    const userId = useSessionStore((state: SessionState) => state.userId);
    const hydrate = useSessionStore((state: SessionState) => state.hydrate);

    useEffect(() => {
        if (!hydrated) {
            void hydrate();
        }
    }, [hydrate, hydrated]);

    useEffect(() => {
        if (!hydrated || !userId) {
            stopSyncScheduler();
            return;
        }

        const stop = startSyncScheduler({
            getCurrentUserId: () => useSessionStore.getState().userId,
        });

        return () => {
            stop();
        };
    }, [hydrated, userId]);

    if (!hydrated) {
        return null;
    }

    return (
        <NavigationThemeProvider value={navTheme}>
            <StatusBar style={theme.dark ? "light" : "dark"} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.background },
                }}
            />
        </NavigationThemeProvider>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <RootNavigator />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
