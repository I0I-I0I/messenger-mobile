import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export function Button({ title, onPress, disabled = false }: ButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.colors.primary },
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
