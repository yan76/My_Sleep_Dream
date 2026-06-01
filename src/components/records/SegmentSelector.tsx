import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type SegmentSelectorProps = {
  segments: readonly string[];
  activeIndex: number;
  onChange: (index: number) => void;
};

export function SegmentSelector({ segments, activeIndex, onChange }: SegmentSelectorProps) {
  return (
    <View style={styles.row}>
      {segments.map((label, index) => {
        const active = activeIndex === index;
        return (
          <Pressable
            key={label}
            onPress={() => onChange(index)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    backgroundColor: colors.surface
  },
  tabActive: {
    backgroundColor: colors.surfaceWarm
  },
  tabText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800"
  },
  tabTextActive: {
    color: colors.accent
  }
});
