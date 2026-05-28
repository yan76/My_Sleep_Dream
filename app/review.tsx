import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import {
  getLatestSleepRecord,
  getSessionByDate
} from "@/storage/rescueSessionStorage";
import { RescueSession, SleepRecord } from "@/types/app";

function getFeedback(record: SleepRecord | null) {
  if (!record) {
    return "还没有可复盘的睡眠记录。完成次日打卡后，这里会显示昨晚结果。";
  }

  if (record.success) {
    return "昨晚你按时停下来了。不是因为完美，而是你真的给自己争取到了一段恢复时间。";
  }

  return "昨晚没有按时也没关系。今晚先把入口变小：提前打开自救流程，遇到想刷时直接进下线挑战。";
}

export default function ReviewScreen() {
  const [record, setRecord] = useState<SleepRecord | null>(null);
  const [session, setSession] = useState<RescueSession | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadReview() {
        setLoading(true);
        const latest = await getLatestSleepRecord();
        const relatedSession = latest ? await getSessionByDate(latest.date) : null;

        if (active) {
          setRecord(latest);
          setSession(relatedSession);
          setLoading(false);
        }
      }

      loadReview();

      return () => {
        active = false;
      };
    }, [])
  );

  const feedback = getFeedback(record);

  return (
    <Screen>
      <PageHeader title="今日复盘" subtitle="看见结果，然后把今晚变得更容易一点。" />

      {!record && !loading ? (
        <AppCard topAccent>
          <Text style={styles.emptyTitle}>还没有打卡记录</Text>
          <Text style={styles.emptyText}>{feedback}</Text>
          <AppButton title="去次日打卡" variant="secondary" onPress={() => router.push("/checkin")} />
        </AppCard>
      ) : (
        <>
          <AppCard topAccent>
            <Text style={styles.resultLabel}>昨晚结果</Text>
            <Text style={[styles.resultTitle, record?.success ? styles.successText : styles.failText]}>
              {loading ? "读取中..." : record?.success ? "按时睡了" : "没有按时"}
            </Text>
            <Text style={styles.feedback}>{feedback}</Text>
          </AppCard>

          <AppCard tone="cool">
            <Text style={styles.cardTitle}>记录详情</Text>
            <View style={styles.grid}>
              <View style={styles.item}>
                <Text style={styles.itemValue}>{record?.actualSleepTime ?? "--:--"}</Text>
                <Text style={styles.itemLabel}>实际睡觉时间</Text>
              </View>
              <View style={styles.item}>
                <Text style={styles.itemValue}>{session?.shutdownChallengeCompleted ? "是" : "否"}</Text>
                <Text style={styles.itemLabel}>完成下线挑战</Text>
              </View>
              <View style={styles.item}>
                <Text style={styles.itemValue}>{session?.relaxModeUsed ? "是" : "否"}</Text>
                <Text style={styles.itemLabel}>使用放松模式</Text>
              </View>
              <View style={styles.item}>
                <Text style={styles.itemValue}>{record?.moodNextMorning ?? "未记录"}</Text>
                <Text style={styles.itemLabel}>醒来的感觉</Text>
              </View>
            </View>
          </AppCard>

          {!record?.success && record?.reasonIfFailed ? (
            <AppCard>
              <Text style={styles.cardTitle}>失败原因</Text>
              <Text style={styles.reason}>{record.reasonIfFailed}</Text>
              <Text style={styles.feedback}>补救建议：今晚把“开始自救”提前到目标睡觉时间前 30 分钟。</Text>
            </AppCard>
          ) : null}

          <AppCard>
            <Text style={styles.cardTitle}>今日一句反馈</Text>
            <Text style={styles.feedback}>{feedback}</Text>
          </AppCard>
        </>
      )}

      <AppButton title="回到首页" variant="gradient" onPress={() => router.push("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  resultTitle: {
    fontSize: 34,
    fontWeight: "800"
  },
  successText: {
    color: colors.success
  },
  failText: {
    color: colors.warning
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  feedback: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  item: {
    width: "48%",
    minHeight: 96,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 6
  },
  itemValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center" as const
  },
  itemLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center" as const
  },
  reason: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  }
});
