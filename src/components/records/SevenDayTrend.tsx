import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { SleepRecord } from "@/types/app";

type SevenDayTrendProps = {
  records: SleepRecord[];
  title?: string;
};

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return dayLabels[d.getDay()];
}

export function SevenDayTrend({ records, title = "近 7 天" }: SevenDayTrendProps) {
  const displayRecords = records.slice(-7);

  return (
    <AppCard>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.days}>
        {displayRecords.map((record) => {
          const success = record.success;
          const hasData = record.actualSleepTime != null;
          return (
            <View key={record.date} style={styles.day}>
              <Text style={styles.dayLabel}>{getDayOfWeek(record.date)}</Text>
              <View
                style={[
                  styles.dot,
                  hasData && success && styles.dotSuccess,
                  hasData && !success && styles.dotFail
                ]}
              />
              <Text style={styles.date}>{record.date.slice(5)}</Text>
            </View>
          );
        })}
        {displayRecords.length < 7 &&
          Array.from({ length: 7 - displayRecords.length }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.day}>
              <Text style={styles.dayLabel}>—</Text>
              <View style={[styles.dot, styles.dotEmpty]} />
              <Text style={styles.date}>—</Text>
            </View>
          ))}
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
    gap: 4
  },
  day: {
    flex: 1,
    alignItems: "center",
    gap: 8
  },
  dayLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line
  },
  dotSuccess: {
    backgroundColor: colors.success
  },
  dotFail: {
    backgroundColor: colors.danger
  },
  dotEmpty: {
    backgroundColor: colors.line
  },
  date: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600"
  }
});
