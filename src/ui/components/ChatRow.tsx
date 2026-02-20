import { Pressable, StyleSheet, Text, View, Image } from "react-native";

import { ChatListItem } from "@/src/domain/types";

type ChatRowProps = {
  item: ChatListItem;
  onPress: () => void;
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatRow({ item, onPress }: ChatRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image
        source={{ uri: item.otherUser.avatar }}
        style={styles.avatarImage}
      />
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.name}>{item.otherUser.displayName}</Text>
          <Text style={styles.time}>
            {formatTime(item.lastMessage?.createdAt ?? item.chat.createdAt)}
          </Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage?.content ?? "No messages yet"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pressed: {
    opacity: 0.75,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  time: {
    fontSize: 12,
    color: "#6b7280",
  },
  preview: {
    color: "#4b5563",
  },
});
