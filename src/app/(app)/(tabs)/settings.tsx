import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type Mode } from "@/src/theme/themes";
import { useTheme } from "@/src/theme/ThemeProvider";

const MODES: Mode[] = ["system", "light", "dark"];

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>Тема</Text>
        <View style={styles.modeRow}>
          {MODES.map((item) => {
            const selected = item === mode;
            return (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                style={({ pressed }) => [
                  styles.modeButton,
                  {
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: selected
                      ? theme.colors.primary
                      : theme.colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeText,
                    { color: selected ? "#ffffff" : theme.colors.text },
                  ]}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  modeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 92,
    alignItems: "center",
  },
  modeText: {
    fontWeight: "600",
  },
  toggleButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  toggleText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
