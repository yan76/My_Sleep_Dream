import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type StatItem = {
  icon: string;
  value: string | number;
  label: string;
};

type StatsGridProps = {
  items: StatItem[];
};

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={index} style={styles.cell}>
          <View style={styles.cellInner}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  cell: {
    width: "48%",
    minHeight: 130,
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  cellInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 18,
    paddingHorizontal: 10
  },
  icon: {
    fontSize: 22
  },
  value: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "800"
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center" as const
  }
});
