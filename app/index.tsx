import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { QuickActionGrid } from "@/components/home/QuickActionGrid";
import { TonightGoalCard } from "@/components/home/TonightGoalCard";
import { CountdownCard } from "@/components/home/CountdownCard";
import { useAppStore } from "@/store/useAppStore";
import { AppStats, RescueSession, UserConfig } from "@/types/app";
import { nowTime } from "@/utils/date";
import {
  getAppStats,
  getTodaySession,
  getUserConfig,
  shouldShowMorningCheckIn,
  startTodaySession
} from "@/storage/rescueSessionStorage";

type HomeData = {
  config: UserConfig | null;
  session: RescueSession | null;
  stats: AppStats | null;
  needsCheckin: boolean;
};

function getSessionText(session: RescueSession | null, needsCheckin: boolean) {
  if (needsCheckin) {
    return {
      label: "需要次日打卡",
      detail: "昨晚已经进入睡觉状态，今天补一笔结果就好。"
    };
  }

  if (!session) {
    return {
      label: "今晚还没开始自救",
      detail: "还没有创建今日自救 Session。"
    };
  }

  if (session.status === "ready_to_sleep") {
    return {
      label: "已准备睡觉",
      detail: "今晚已经收尾，等待明早打卡。"
    };
  }

  if (session.status === "completed") {
    return {
      label: "已完成",
      detail: "今晚的自救已经记录完成。"
    };
  }

  if (session.status === "in_shutdown_challenge") {
    return {
      label: "下线挑战中",
      detail: "你已经选择把手机放下，再撑过最后一段。"
    };
  }

  if (session.status === "in_relax_mode") {
    return {
      label: "放松模式中",
      detail: "正在用白噪音或放松流程帮自己降速。"
    };
  }

  return {
    label: "自救流程进行中",
    detail: "今日 Session 已开始，可以继续今晚自救。"
  };
}

function getPrimaryAction() {
  return { title: "开始自救", disabled: false };
}

export default function HomeScreen() {
  const legacyConfig = useAppStore((state) => state.userConfig);
  const [data, setData] = useState<HomeData>({
    config: null,
    session: null,
    stats: null,
    needsCheckin: false
  });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHomeData() {
        setLoading(true);
        const [config, session, stats, needsCheckin] = await Promise.all([
          getUserConfig(),
          getTodaySession(),
          getAppStats(),
          shouldShowMorningCheckIn()
        ]);

        if (active) {
          setData({ config, session, stats, needsCheckin });
          setLoading(false);
        }
      }

      loadHomeData();

      return () => {
        active = false;
      };
    }, [])
  );

  if (!legacyConfig.hasOnboarded && !data.config?.hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  const config = data.config?.hasOnboarded ? data.config : legacyConfig;
  const hasTargetBedtime = Boolean(config.targetSleepTime || config.targetBedtime);
  const targetBedtime = config.targetSleepTime || config.targetBedtime;
  const statusText = getSessionText(data.session, data.needsCheckin);
  const action = getPrimaryAction();

  const handlePrimaryAction = async () => {
    setStarting(true);
    try {
      await startTodaySession();
      router.push("/rescue");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
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
        title="晚上好，今天也辛苦了"
        subtitle="首页会跟着今晚的真实状态变化，先看一眼目标，再决定下一步。"
      />

      {!hasTargetBedtime ? (
        <AppCard topAccent>
          <Text style={styles.emptyTitle}>还没有设置目标睡觉时间</Text>
          <Text style={styles.emptyText}>先初始化你的睡觉目标，首页才能显示倒计时和今晚自救入口。</Text>
          <AppButton title="去设置目标" variant="secondary" onPress={() => router.push("/settings")} />
        </AppCard>
      ) : (
        <>
          {data.needsCheckin && (
            <Pressable
              onPress={() => router.push("/checkin")}
              style={({ pressed }) => [styles.checkinBanner, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.checkinContent}>
                <View style={styles.checkinIcon}>
                  <Text style={styles.checkinIconText}>☀</Text>
                </View>
                <View style={styles.checkinText}>
                  <Text style={styles.checkinTitle}>记录昨晚结果</Text>
                  <Text style={styles.checkinSub}>补上昨晚的睡觉结果，连续早睡天数才会更新。</Text>
                </View>
                <Text style={styles.checkinArrow}>›</Text>
              </View>
            </Pressable>
          )}

          <CountdownCard targetTime={targetBedtime} />
          <TonightGoalCard bedtime={targetBedtime} wakeUpTime={config.wakeUpTime} />

          <AppCard>
            <View style={styles.realDataRow}>
              <View>
                <Text style={styles.dataLabel}>今日自救状态</Text>
                <Text style={styles.dataValue}>{loading ? "读取中..." : statusText.label}</Text>
              </View>
              <View style={styles.streakBox}>
                <Text style={styles.streakValue}>{data.stats?.currentStreak ?? 0}</Text>
                <Text style={styles.streakLabel}>连续早睡天</Text>
              </View>
            </View>
            <Text style={styles.statusDetail}>{statusText.detail}</Text>
          </AppCard>

          <AppButton
            title={starting ? "正在进入..." : action.title}
            variant="gradient"
            disabled={action.disabled || loading || starting}
            icon={<Text style={styles.btnIcon}>✓</Text>}
            onPress={handlePrimaryAction}
          />
        </>
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
  emptyTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
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
    fontSize: 14,
    lineHeight: 20
  },
  checkinArrow: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "800"
  },
  realDataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  dataLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  dataValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6
  },
  streakBox: {
    minWidth: 104,
    borderRadius: 20,
    backgroundColor: colors.surfaceCool,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  streakValue: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: "800"
  },
  streakLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  statusDetail: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
