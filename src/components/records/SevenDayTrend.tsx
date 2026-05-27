import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { DailyRecord } from "@/types/app";
import { getLastSevenDays, statusLabels } from "@/utils/sleep";

export function SevenDayTrend({ records }: { records: Record<string, DailyRecord> }) {
  const days = getLastSevenDays(records);

  return (
    <AppCard>
      <Text style={styles.title}>近 7 天</Text>
      <View style={styles.days}>
        {days.map(({ date, record }) => {
          const isGood = record?.status === "slept_on_time";
          const isLate = record?.status === "slept_late";
          return (
            <View key={date} style={styles.day}>
              <View style={[styles.dot, isGood && styles.good, isLate && styles.late]} />
              <Text style={styles.date}>{date.slice(5)}</Text>
              <Text style={styles.status}>{record ? statusLabels[record.status] : "无记录"}</Text>
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6
  },
  day: {
    flex: 1,
    alignItems: "center",
    gap: 6
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.line
  },
  good: {
    backgroundColor: colors.success
  },
  late: {
    backgroundColor: colors.warning
  },
  date: {
    color: colors.muted,
    fontSize: 11
  },
  status: {
    color: colors.ink,
    fontSize: 10,
    textAlign: "center"
  }
});
