import { Pressable, StyleSheet, Text, View } from "react-native";

import { User } from "@/src/domain/types";

type UserRowProps = {
  user: User;
  onPress: () => void;
};

export function UserRow({ user, onPress }: UserRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.avatar}>{user.avatar}</Text>
      <View>
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
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
  avatar: {
    fontSize: 24,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  username: {
    color: "#6b7280",
  },
});
