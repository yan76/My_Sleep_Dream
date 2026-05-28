import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { AppButton } from "@/components/common/AppButton";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { QuickActionGrid } from "@/components/home/QuickActionGrid";
import { TonightGoalCard } from "@/components/home/TonightGoalCard";
import { CountdownCard } from "@/components/home/CountdownCard";
import { useAppStore } from "@/store/useAppStore";
import { todayKey, nowTime } from "@/utils/date";

export default function HomeScreen() {
  const userConfig = useAppStore((state) => state.userConfig);
  const ensureTodayRecord = useAppStore((state) => state.ensureTodayRecord);
  const todayRecord = useAppStore((state) => state.dailyRecords[todayKey()]);

  if (!userConfig.hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  const record = todayRecord ?? ensureTodayRecord();
  const currentHour = parseInt(nowTime().split(":")[0], 10);
  const isMorning = currentHour >= 5 && currentHour < 12;
  const needsCheckin = isMorning && record.status !== "checked_in";

  return (
    <Screen>
      {/* Top bar */}
      <View style={styles.topLine}>
        <View style={styles.timeRow}>
          <View style={styles.timeDot} />
          <Text style={styles.status}>{nowTime()}</Text>
        </View>
        <AppButton
          title="设置"
          variant="ghost"
          onPress={() => router.push("/settings")}
          style={styles.settingsButton}
          size="md"
        />
      </View>

      <PageHeader
        title={isMorning ? "早上好 ☀️" : "晚上好，今天也辛苦了"}
        subtitle={
          isMorning
            ? "新的一天开始了，回顾一下昨晚的睡眠吧"
            : "别急着责怪自己，今晚先试着早点停下来"
        }
      />

      {/* Morning check-in banner */}
      {needsCheckin && (
        <Pressable
          onPress={() => router.push("/checkin")}
          style={({ pressed }) => [
            styles.checkinBanner,
            pressed && { opacity: 0.9 }
          ]}
        >
          <View style={styles.checkinContent}>
            <View style={styles.checkinIcon}>
              <Text style={styles.checkinIconText}>☀️</Text>
            </View>
            <View style={styles.checkinText}>
              <Text style={styles.checkinTitle}>今日打卡</Text>
              <Text style={styles.checkinSub}>回顾昨晚睡眠，开启新的一天</Text>
            </View>
            <Text style={styles.checkinArrow}>→</Text>
          </View>
        </Pressable>
      )}

      {/* Countdown card - only show at night */}
      {!isMorning && <CountdownCard targetTime={record.plannedBedtime} />}

      {/* Goal card */}
      {!isMorning && (
        <TonightGoalCard bedtime={record.plannedBedtime} wakeUpTime={userConfig.wakeUpTime} />
      )}

      {/* Main CTA - only at night */}
      {!isMorning && (
        <AppButton
          title="开始今晚自救"
          variant="gradient"
          icon={<Text style={styles.btnIcon}>✦</Text>}
          onPress={() => router.push("/rescue")}
        />
      )}

      <QuickActionGrid />
      <BottomNav active="home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topLine: {
    minHeight: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -56
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  status: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800"
  },
  settingsButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 20
  },
  btnIcon: {
    fontSize: 18,
    color: colors.buttonText
  },
  checkinBanner: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceWarm,
    overflow: "hidden"
  },
  checkinContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14
  },
  checkinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(153,227,187,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  checkinIconText: {
    fontSize: 24
  },
  checkinText: {
    flex: 1,
    gap: 4
  },
  checkinTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  checkinSub: {
    color: colors.muted,
    fontSize: 14
  },
  checkinArrow: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800"
  }
});