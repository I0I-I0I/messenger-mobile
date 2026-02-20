import { Tabs, router } from "expo-router";
import { View } from "react-native";

import SearchIcon from "@/assets/icons/search.svg";
import ChatIcon from "@/assets/icons/chat.svg";
import SettingsIcon from "@/assets/icons/settings.svg";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Button } from "@/src/ui/components/Button";

export default function TabLayout() {
    const logout = useSessionStore((state: SessionState) => state.logout);
    const { theme } = useTheme();

    async function onLogout() {
        await logout();
        router.replace("/(auth)/login");
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.mutedText,
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                },
                sceneStyle: { backgroundColor: theme.colors.background },
                headerStyle: {
                    backgroundColor: theme.colors.card,
                    height: 100,
                },
                headerRightContainerStyle: {
                    paddingRight: 16,
                    paddingLeft: 16,
                    paddingBottom: 10,
                },
                headerRight: ({
                    tintColor,
                    pressColor,
                    pressOpacity,
                    canGoBack,
                }) => {
                    return (
                        <View>
                            <Button
                                title="Выйти"
                                onPress={() => void onLogout()}
                            />
                        </View>
                    );
                },
                headerTintColor: theme.colors.text,
                headerTitleStyle: { color: theme.colors.text },
                headerShown: true,
            }}
        >
            <Tabs.Screen
                name="chats"
                options={{
                    title: "Чаты",
                    headerTitle: "Чаты",
                    headerRight: () => (
                        <View>
                            <Button
                                title="Выйти"
                                onPress={() => void onLogout()}
                            />
                        </View>
                    ),
                    tabBarIcon: ({ color }) => (
                        <ChatIcon color={color} width={22} height={22} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: "Поиск",
                    headerTitle: "Поиск",
                    tabBarIcon: ({ color }) => (
                        <SearchIcon color={color} width={22} height={22} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Настройки",
                    headerTitle: "Настройки",
                    tabBarIcon: ({ color }) => (
                        <SettingsIcon color={color} width={22} height={22} />
                    ),
                }}
            />
        </Tabs>
    );
}
