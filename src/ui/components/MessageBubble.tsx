import { StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={[styles.wrap, mine ? styles.mineWrap : styles.otherWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
        <Text style={[styles.text, mine ? styles.mineText : styles.otherText]}>{body}</Text>
        <Text style={[styles.time, mine ? styles.mineTime : styles.otherTime]}>
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
  mine: {
    backgroundColor: "#1f6feb",
  },
  other: {
    backgroundColor: "#e5e7eb",
  },
  text: {
    fontSize: 15,
  },
  mineText: {
    color: "#fff",
  },
  otherText: {
    color: "#111827",
  },
  time: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  mineTime: {
    color: "#dbeafe",
  },
  otherTime: {
    color: "#6b7280",
  },
});
