import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { getMorningCheckInDate } from "@/storage/rescueSessionStorage";
import { completeMorningCheckin } from "@/storage/dailyExecutionStorage";
import { getSleepAudioSessionByDate } from "@/storage/sleepAudioStorage";
import { SleepAudioSession } from "@/types/app";
import { addDays, todayKey } from "@/utils/date";

export default function CheckinScreen() {
  const [date, setDate] = useState<string>(todayKey(addDays(new Date(), -1)));
  const [audioSession, setAudioSession] = useState<SleepAudioSession | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const checkinDate = (await getMorningCheckInDate()) ?? todayKey(addDays(new Date(), -1));
    setDate(checkinDate);
    setAudioSession(await getSleepAudioSessionByDate(checkinDate));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeCheckin = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      await completeMorningCheckin({ date });
      router.replace("/review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.ghost} onPress={() => router.replace("/")}>
          <Text style={styles.ghostText}>返回首页</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>次日打卡</Text>
        <Text style={styles.title}>补录一下昨晚结果</Text>
        <Text style={styles.subtitle}>不用评判昨晚，只要把真实结果放在这里。这样你就能看见自己正在变好。</Text>
      </View>

      <AppCard tone="warm" style={styles.primaryCard}>
        <Text style={styles.cardTitle}>昨晚记录</Text>
        <Text style={styles.body}>这次会先完成打卡闭环。实际入睡时间、醒来感受等细项可以在后续表单迭代中继续补齐。</Text>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </AppCard>

      <AppCard tone="cool">
        <View style={styles.statusRow}>
          <Text style={styles.label}>昨晚声音线索</Text>
          <Text style={styles.statusPill}>{audioStatusLabel(audioSession)}</Text>
        </View>
        <Text style={styles.body}>{audioSummary(audioSession)}</Text>
      </AppCard>

      <AppButton title={saving ? "正在保存..." : "完成次日打卡"} variant="gradient" onPress={completeCheckin} disabled={saving} />
    </Screen>
  );
}

function audioStatusLabel(session: SleepAudioSession | null): string {
  if (!session) {
    return "未开启";
  }

  if (session.status === "permission_denied") {
    return "未授权";
  }

  if (session.eventCount > 0) {
    return `${session.eventCount} 段线索`;
  }

  if (session.status === "completed" || session.status === "stopped") {
    return "比较安静";
  }

  return "已记录";
}

function audioSummary(session: SleepAudioSession | null): string {
  if (!session) {
    return "昨晚未开启声音监听。这完全没关系，不影响这次打卡和成长记录。";
  }

  if (session.status === "permission_denied") {
    return "昨晚没有麦克风授权，所以没有记录声音摘要。睡前闭环仍然已经完成。";
  }

  if (session.eventCount > 0) {
    return "昨晚检测到几段明显声音。它可能来自梦话、翻身或环境声，先把它当作一个温柔线索就好。";
  }

  return "昨晚没有记录到明显声音线索。第一版先展示本机摘要，后续会继续完善真实识别。";
}

const styles = StyleSheet.create({
  top: {
    minHeight: 42,
    alignItems: "flex-start"
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
  header: {
    gap: 10
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  primaryCard: {
    minHeight: 190
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  datePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#39313A",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  dateText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900"
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  statusPill: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#303143",
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden"
  }
});
