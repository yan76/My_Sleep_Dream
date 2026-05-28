import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { getCurrentStreak } from "@/utils/sleep";

const points = [26, 46, 72, 62, 104, 128, 146];
const segments = ["本周", "本月", "全部"] as const;

export default function RecordsScreen() {
  const records = useAppStore((state) => state.dailyRecords);
  const streak = getCurrentStreak(records);
  const [activeSegment, setActiveSegment] = useState(0);

  const maxPoint = Math.max(...points, 1);

  return (
    <Screen>
      <PageHeader title="数据成就" subtitle="这些小进展都算数，能被记下的都值得" />

      {/* Segment control */}
      <View style={styles.segment}>
        {segments.map((label, index) => (
          <Pressable
            key={label}
            onPress={() => setActiveSegment(index)}
            style={[styles.segmentItem, activeSegment === index && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeSegment === index && styles.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Streak card */}
      <AppCard tone="warm" topAccent>
        <Text style={styles.cardTitle}>连胜记录</Text>
        <View style={styles.streakRow}>
          <View style={styles.streakNum}>
            <Text style={styles.streakValue}>{streak || 0}</Text>
            <Text style={styles.streakUnit}>天</Text>
          </View>
          <Text style={styles.streakMsg}>继续保持！每一次坚持都算数</Text>
        </View>
      </AppCard>

      {/* Chart card */}
      <AppCard style={styles.chartCard}>
        <Text style={styles.cardTitle}>一周入睡时间趋势</Text>
        <View style={styles.chart}>
          {/* Chart lines */}
          {[0.25, 0.5, 0.75].map((pos, i) => (
            <View key={i} style={[styles.chartLine, { top: `${pos * 100}%` }]} />
          ))}
          {/* Data points */}
          {points.map((val, index) => {
            const height = (val / maxPoint) * 140;
            return (
              <View key={index} style={styles.pointColumn}>
                <View style={[styles.bar, { height: Math.max(height, 8) }]} />
                <Text style={styles.dayLabel}>{["一","二","三","四","五","六","日"][index]}</Text>
              </View>
            );
          })}
        </View>
      </AppCard>

      {/* Analysis card */}
      <AppCard>
        <Text style={styles.cardTitle}>熬夜原因分析</Text>
        <View style={styles.reasonRow}>
          <View style={styles.donut}>
            {["#8796FF", "#E3D4B5", "#99E3BB", "#FF7083"].map((color, i) => (
              <View key={i} style={[styles.donutSegment, { borderColor: color, transform: [{ rotate: `${i * 75}deg` }] }]} />
            ))}
            <View style={styles.donutHole}>
              <Text style={styles.donutPercent}>42%</Text>
            </View>
          </View>
          <View style={styles.legend}>
            {[
              { label: "刷短视频", value: "42%", color: colors.primary },
              { label: "工作学习", value: "28%", color: colors.accent },
              { label: "情绪内耗", value: "18%", color: colors.success },
              { label: "其他", value: "12%", color: colors.danger }
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </AppCard>

      {/* Badge tags */}
      <View style={styles.badges}>
        <View style={[styles.badge, styles.badgeActive]}>
          <Text style={styles.badgeActiveText}>✦ {streak || 5}天连胜</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>今晚没白熬</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>能量 +30</Text>
        </View>
      </View>

      {/* Summary card */}
      <AppCard tone="cool">
        <Text style={styles.summary}>
          这周你比上周平均早睡了 26 分钟。
          不需要完美，继续一点点变好。{"\n"}✨ 每一次小小的胜利都在积累。
        </Text>
      </AppCard>

      <BottomNav active="growth" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    minHeight: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    padding: 6
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 24
  },
  segmentActive: {
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  segmentText: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.accent
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  streakNum: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4
  },
  streakValue: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: "800"
  },
  streakUnit: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "700"
  },
  streakMsg: {
    flex: 1,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  chartCard: {
    minHeight: 280,
    justifyContent: "space-between"
  },
  chart: {
    flex: 1,
    minHeight: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    position: "relative" as const,
    paddingBottom: 24
  },
  chartLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  pointColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6
  },
  bar: {
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + "70",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  dayLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24
  },
  donut: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 18,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const
  },
  donutSegment: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 18,
    borderColor: "transparent"
  },
  donutHole: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  donutPercent: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  legend: {
    gap: 10,
    flex: 1
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  legendLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 15
  },
  legendValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  badge: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  badgeActive: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceWarm
  },
  badgeActiveText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800"
  },
  badgeText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800"
  },
  summary: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center" as const
  }
});