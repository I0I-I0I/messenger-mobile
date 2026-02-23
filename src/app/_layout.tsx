import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { subscribeDataEvents } from "@/src/sync/dataEvents";
import { startSyncScheduler, stopSyncScheduler } from "@/src/sync/syncScheduler";
import { startRealtimeSession, stopRealtimeSession } from "@/src/usecases/realtime";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";

function RootNavigator() {
    const { navTheme, theme } = useTheme();
    const hydrated = useSessionStore((state: SessionState) => state.hydrated);
    const userId = useSessionStore((state: SessionState) => state.userId);
    const hydrate = useSessionStore((state: SessionState) => state.hydrate);
    const [syncWarning, setSyncWarning] = useState<string | null>(null);
    const hideWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    useEffect(() => {
        if (!hydrated) {
            void hydrate();
        }
    }, [hydrate, hydrated]);

    useEffect(() => {
        const unsubscribe = subscribeDataEvents((event) => {
            if (event.type !== "sync_warning") {
                return;
            }

            setSyncWarning(`Sync warning: ${event.code} - ${event.message}`);

            if (hideWarningTimerRef.current) {
                clearTimeout(hideWarningTimerRef.current);
            }
            hideWarningTimerRef.current = setTimeout(() => {
                setSyncWarning(null);
                hideWarningTimerRef.current = null;
            }, 4000);
        });

        return () => {
            unsubscribe();
            if (hideWarningTimerRef.current) {
                clearTimeout(hideWarningTimerRef.current);
                hideWarningTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!hydrated || !userId) {
            stopSyncScheduler();
            stopRealtimeSession();
            return;
        }

        const stop = startSyncScheduler({
            getCurrentUserId: () => useSessionStore.getState().userId,
        });
        startRealtimeSession(() => useSessionStore.getState().userId);

        return () => {
            stop();
            stopRealtimeSession();
        };
    }, [hydrated, userId]);

    if (!hydrated) {
        return null;
    }

    return (
        <NavigationThemeProvider value={navTheme}>
            <StatusBar style={theme.dark ? "light" : "dark"} />
            <View style={styles.container}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: theme.colors.background },
                    }}
                />
                {syncWarning ? (
                    <Pressable
                        style={[
                            styles.warningBanner,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={() => setSyncWarning(null)}
                    >
                        <Text
                            style={[
                                styles.warningText,
                                { color: theme.colors.text },
                            ]}
                            numberOfLines={2}
                        >
                            {syncWarning}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    warningBanner: {
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 18,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        opacity: 0.96,
    },
    warningText: {
        fontSize: 13,
        fontWeight: "600",
    },
});
