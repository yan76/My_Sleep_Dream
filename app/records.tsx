import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { getCurrentStreak } from "@/utils/sleep";

const points = [26, 46, 72, 62, 104, 128, 146];

export default function RecordsScreen() {
  const records = useAppStore((state) => state.dailyRecords);
  const streak = getCurrentStreak(records);

  return (
    <Screen>
      <PageHeader title="数据成就与报告" />

      <View style={styles.segment}>
        <Text style={[styles.segmentItem, styles.segmentActive]}>本周</Text>
        <Text style={styles.segmentItem}>本月</Text>
        <Text style={styles.segmentItem}>全部</Text>
      </View>

      <AppCard style={styles.chartCard}>
        <Text style={styles.cardTitle}>一周入睡时间趋势</Text>
        <View style={styles.chart}>
          {points.map((top, index) => (
            <View key={index} style={[styles.point, { left: `${8 + index * 14}%`, bottom: top }]} />
          ))}
          <View style={[styles.line, styles.lineOne]} />
          <View style={[styles.line, styles.lineTwo]} />
          <View style={[styles.line, styles.lineThree]} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>熬夜原因分析</Text>
        <View style={styles.reasonRow}>
          <View style={styles.donut}>
            <View style={styles.donutHole} />
          </View>
          <View>
            <Text style={styles.reason}>刷短视频 42%</Text>
            <Text style={styles.reason}>工作学习 28%</Text>
            <Text style={styles.reason}>情绪内耗 18%</Text>
            <Text style={styles.reason}>其他 12%</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.badges}>
        <Text style={[styles.badge, styles.badgeActive]}>{streak || 5}天连胜</Text>
        <Text style={styles.badge}>今晚没白熬</Text>
        <Text style={styles.badge}>能量+30</Text>
      </View>

      <AppCard>
        <Text style={styles.summary}>这周你比上周平均早睡了 26 分钟。不需要完美，继续一点点变好。</Text>
      </AppCard>

      <BottomNav active="growth" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    minHeight: 72,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 8
  },
  segmentItem: {
    flex: 1,
    textAlign: "center",
    color: colors.muted,
    fontSize: 20,
    fontWeight: "800",
    paddingVertical: 14,
    borderRadius: 24,
    overflow: "hidden"
  },
  segmentActive: {
    color: colors.accent,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  chartCard: {
    minHeight: 260
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  chart: {
    flex: 1,
    minHeight: 170,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)"
  },
  point: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent
  },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  lineOne: {
    top: "28%"
  },
  lineTwo: {
    top: "54%"
  },
  lineThree: {
    top: "78%"
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22
  },
  donut: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 22,
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    borderBottomColor: colors.accent,
    borderLeftColor: colors.success
  },
  donutHole: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: colors.background
  },
  reason: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 28
  },
  badges: {
    flexDirection: "row",
    gap: 12
  },
  badge: {
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
    overflow: "hidden",
    fontSize: 17,
    fontWeight: "800"
  },
  badgeActive: {
    color: colors.accent,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.lineStrong
  },
  summary: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 32
  }
});
