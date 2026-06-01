import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { nowTime } from "@/utils/date";

type TopBarProps = {
  leftLabel?: string;
  rightLabel?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  showTime?: boolean;
};

export function TopBar({ leftLabel, rightLabel = "设置", onLeftPress, onRightPress, showTime = true }: TopBarProps) {
  return (
    <View style={styles.top}>
      {leftLabel ? (
        <Pressable style={styles.ghost} onPress={onLeftPress ?? (() => router.back())}>
          <Text style={styles.ghostText}>{leftLabel}</Text>
        </Pressable>
      ) : showTime ? (
        <View style={styles.time}>
          <View style={styles.dot} />
          <Text style={styles.timeText}>{nowTime()}</Text>
        </View>
      ) : (
        <View style={styles.spacer} />
      )}

      {rightLabel ? (
        <Pressable style={styles.ghost} onPress={onRightPress ?? (() => router.push("/settings"))}>
          <Text style={styles.ghostText}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  time: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  timeText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  ghost: {
    minHeight: 34,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15
  },
  ghostText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  spacer: {
    width: 64
  }
});
