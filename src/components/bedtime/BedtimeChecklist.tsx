import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { DailyRecord } from "@/types/app";

type Checklist = NonNullable<DailyRecord["bedtimeChecklist"]>;

type BedtimeChecklistProps = {
  value: Checklist;
  onChange: (next: Checklist) => void;
};

const items: { key: keyof Checklist; label: string }[] = [
  { key: "putPhoneDown", label: "放下手机" },
  { key: "washedUp", label: "洗漱完成" },
  { key: "lightsDimmed", label: "灯光调暗" },
  { key: "tomorrowParked", label: "明天的事已经记下" }
];

export function BedtimeChecklist({ value, onChange }: BedtimeChecklistProps) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const checked = value[item.key];
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange({ ...value, [item.key]: !checked })}
            style={[styles.row, checked && styles.checked]}
          >
            <View style={[styles.box, checked && styles.checkedBox]}>
              <Text style={styles.mark}>{checked ? "✓" : ""}</Text>
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10
  },
  row: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  checked: {
    backgroundColor: colors.surfaceCool
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center"
  },
  checkedBox: {
    backgroundColor: colors.primaryDark
  },
  mark: {
    color: colors.surface,
    fontWeight: "800"
  },
  label: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700"
  }
});
