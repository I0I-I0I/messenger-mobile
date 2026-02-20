import { Tabs, router } from "expo-router";
import { View } from "react-native";

import SearchIcon from "@/assets/icons/search.svg";
import ChatIcon from "@/assets/icons/chat.svg";
import { SessionState, useSessionStore } from "@/src/state/useSessionStore";
import { Button } from "@/src/ui/components/Button";

export default function TabLayout() {
  const logout = useSessionStore((state: SessionState) => state.logout);

  async function onLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "blue",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: "Чаты",
          headerTitle: "Чаты",
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <Button title="Выйти" onPress={() => void onLogout()} />
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
        name="chat/[chatId]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
