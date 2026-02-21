import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { processOutboxOnce } from "@/src/sync/outboxProcessor";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";

function RootNavigator() {
    const { navTheme, theme } = useTheme();
    const hydrated = useSessionStore((state: SessionState) => state.hydrated);
    const hydrate = useSessionStore((state: SessionState) => state.hydrate);

    useEffect(() => {
        if (!hydrated) {
            void hydrate();
        }
    }, [hydrate, hydrated]);

    useEffect(() => {
        if (hydrated) {
            void processOutboxOnce();
        }
    }, [hydrated]);

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
