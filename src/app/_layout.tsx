import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";

function RootNavigator() {
    const { navTheme, theme } = useTheme();

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
