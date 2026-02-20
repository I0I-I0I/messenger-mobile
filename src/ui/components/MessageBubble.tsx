import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type MessageBubbleProps = {
  body: string;
  mine: boolean;
  timestamp: number;
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ body, mine, timestamp }: MessageBubbleProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, mine ? styles.mineWrap : styles.otherWrap]}>
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: theme.colors.primary }
            : {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
              },
        ]}
      >
        <Text
          style={[
            styles.text,
            mine ? styles.mineText : { color: theme.colors.text },
          ]}
        >
          {body}
        </Text>
        <Text
          style={[
            styles.time,
            mine ? styles.mineTime : { color: theme.colors.mutedText },
          ]}
        >
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 4,
    flexDirection: "row",
  },
  mineWrap: {
    justifyContent: "flex-end",
  },
  otherWrap: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  text: {
    fontSize: 15,
  },
  mineText: {
    color: "#fff",
  },
  time: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  mineTime: {
    color: "#e2e8f0",
  },
});
