import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppTextInput } from "@/components/common/AppTextInput";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import {
  createOrUpdateSleepRecord,
  getMorningCheckInDate,
  getSessionByDate,
  getUserConfig
} from "@/storage/rescueSessionStorage";
import { RescueSession } from "@/types/app";
import { addDays, isValidTime, todayKey } from "@/utils/date";

const reasons = ["短视频停不下来", "社交消息", "工作学习", "焦虑内耗", "只是想多拥有一点时间"];
const moods = [
  { label: "精神不错", color: colors.success },
  { label: "还可以", color: colors.primary },
  { label: "有点困", color: colors.warning },
  { label: "很疲惫", color: colors.danger }
] as const;

export default function CheckinScreen() {
  const [checkInDate, setCheckInDate] = useState(todayKey(addDays(new Date(), -1)));
  const [session, setSession] = useState<RescueSession | null>(null);
  const [success, setSuccess] = useState(true);
  const [actualSleepTime, setActualSleepTime] = useState("23:30");
  const [selectedReason, setSelectedReason] = useState(reasons[0]);
  const [selectedMood, setSelectedMood] = useState(1);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadCheckInContext() {
        const [date, config] = await Promise.all([getMorningCheckInDate(), getUserConfig()]);
        const targetDate = date ?? todayKey(addDays(new Date(), -1));
        const targetSession = await getSessionByDate(targetDate);

        if (active) {
          setCheckInDate(targetDate);
          setSession(targetSession);
          setActualSleepTime(config.targetSleepTime || config.targetBedtime || "23:30");
        }
      }

      loadCheckInContext();

      return () => {
        active = false;
      };
    }, [])
  );

  const save = async () => {
    if (!isValidTime(actualSleepTime)) {
      return;
    }

    setSaving(true);
    try {
      await createOrUpdateSleepRecord({
        date: checkInDate,
        sessionId: session?.id,
        actualSleepTime,
        success,
        reasonIfFailed: success ? undefined : selectedReason,
        moodNextMorning: moods[selectedMood].label
      });
      router.replace("/review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader
        title="次日打卡"
        subtitle="花几十秒记录昨晚结果。这里是复盘，不是审判。"
      />

      <AppCard topAccent>
        <Text style={styles.cardTitle}>昨晚是否按时睡？</Text>
        <View style={styles.choiceRow}>
          <Pressable
            onPress={() => setSuccess(true)}
            style={[styles.choice, success && styles.choiceActive]}
          >
            <Text style={[styles.choiceText, success && styles.choiceTextActive]}>按时睡了</Text>
          </Pressable>
          <Pressable
            onPress={() => setSuccess(false)}
            style={[styles.choice, !success && styles.choiceActive]}
          >
            <Text style={[styles.choiceText, !success && styles.choiceTextActive]}>没有按时</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard tone="cool">
        <Text style={styles.cardTitle}>昨晚睡觉概览</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{checkInDate.slice(5)}</Text>
            <Text style={styles.statLabel}>记录日期</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{actualSleepTime}</Text>
            <Text style={styles.statLabel}>实际睡觉</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{session?.shutdownChallengeCompleted ? "已完成" : "未完成"}</Text>
            <Text style={styles.statLabel}>下线挑战</Text>
          </View>
        </View>
      </AppCard>

      <AppCard>
        <AppTextInput
          label="实际睡觉时间"
          value={actualSleepTime}
          onChangeText={setActualSleepTime}
          placeholder="例如 23:45"
        />
        {!isValidTime(actualSleepTime) ? <Text style={styles.error}>请输入 HH:mm 格式</Text> : null}
      </AppCard>

      {!success ? (
        <AppCard>
          <Text style={styles.cardTitle}>如果失败，主要原因是？</Text>
          <View style={styles.reasonWrap}>
            {reasons.map((reason) => {
              const active = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[styles.reason, active && styles.reasonActive]}
                >
                  <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{reason}</Text>
                </Pressable>
              );
            })}
          </View>
        </AppCard>
      ) : null}

      <AppCard>
        <Text style={styles.cardTitle}>今天醒来的感觉</Text>
        <View style={styles.moodRow}>
          {moods.map((mood, index) => (
            <Pressable
              key={mood.label}
              onPress={() => setSelectedMood(index)}
              style={[
                styles.moodChip,
                selectedMood === index && {
                  borderColor: mood.color,
                  backgroundColor: mood.color + "20"
                }
              ]}
            >
              <Text style={[
                styles.moodText,
                selectedMood === index && { color: mood.color }
              ]}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <AppButton
        title="保存打卡，查看今日复盘"
        variant="gradient"
        disabled={saving || !isValidTime(actualSleepTime)}
        onPress={save}
      />
      <AppButton title="稍后再说" variant="ghost" onPress={() => router.push("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  choiceRow: {
    flexDirection: "row",
    gap: 10
  },
  choice: {
    flex: 1,
    minHeight: 56,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  choiceActive: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.lineStrong
  },
  choiceText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  choiceTextActive: {
    color: colors.accent
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6
  },
  statValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.line
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  reason: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  reasonActive: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.lineStrong
  },
  reasonText: {
    color: colors.ink,
    fontWeight: "800"
  },
  reasonTextActive: {
    color: colors.accent
  },
  moodRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8
  },
  moodChip: {
    flex: 1,
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  moodText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center" as const
  }
});
