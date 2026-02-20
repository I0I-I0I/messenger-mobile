import { Pressable, StyleSheet, Text, View, Image } from "react-native";

import { User } from "@/src/domain/types";

type UserRowProps = {
  user: User;
  onPress: () => void;
};

export function UserRow({ user, onPress }: UserRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
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
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  username: {
    color: "#6b7280",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
