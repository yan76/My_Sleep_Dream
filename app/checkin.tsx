import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { TimePickerField } from "@/components/common/TimePickerField";
import { SleepAudioSummaryCard } from "@/components/sleep-audio/SleepAudioSummaryCard";
import { colors } from "@/constants/colors";
import { lateNightReasons } from "@/constants/reasons";
import {
  advanceDemoCycleDateAfterCompletedRecord,
  createOrUpdateSleepRecord,
  getMorningCheckInDate,
  getSleepRecordByDate,
  getUserConfig
} from "@/storage/rescueSessionStorage";
import {
  classifySleepResult,
  completeMorningCheckin,
  getDailyExecutionRecordByDate
} from "@/storage/dailyExecutionStorage";
import { getSleepAudioSessionByDate } from "@/storage/sleepAudioStorage";
import { LateNightReason, MorningMood, SleepAudioSession } from "@/types/app";
import { addDays, isValidTime, todayKey } from "@/utils/date";

const moodOptions: { id: MorningMood; label: string; body: string }[] = [
  { id: "good", label: "精神不错", body: "醒来时还算轻松。" },
  { id: "okay", label: "还可以", body: "不算完美，但能继续。" },
  { id: "tired", label: "有点累", body: "先承认身体需要恢复。" }
];

const moodLabelMap: Record<MorningMood, string> = {
  good: "精神不错",
  okay: "还可以",
  tired: "有点累"
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function CheckinScreen() {
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const requestedDate = firstParam(params.date);
  const [date, setDate] = useState<string>(requestedDate ?? todayKey(addDays(new Date(), -1)));
  const [plannedSleepTime, setPlannedSleepTime] = useState("23:30");
  const [actualSleepTime, setActualSleepTime] = useState("23:30");
  const [morningMood, setMorningMood] = useState<MorningMood>("okay");
  const [lateReason, setLateReason] = useState<LateNightReason | undefined>();
  const [audioSession, setAudioSession] = useState<SleepAudioSession | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const checkinDate = requestedDate ?? (await getMorningCheckInDate()) ?? todayKey(addDays(new Date(), -1));
    const [executionRecord, sleepRecord, userConfig, audio] = await Promise.all([
      getDailyExecutionRecordByDate(checkinDate),
      getSleepRecordByDate(checkinDate),
      getUserConfig(),
      getSleepAudioSessionByDate(checkinDate)
    ]);
    const plannedTime = executionRecord?.plannedSleepTime ?? sleepRecord?.plannedSleepTime ?? userConfig.targetSleepTime;

    setDate(checkinDate);
    setPlannedSleepTime(plannedTime);
    setActualSleepTime(executionRecord?.actualSleepTime ?? sleepRecord?.actualSleepTime ?? plannedTime);
    setMorningMood(executionRecord?.morningMood ?? "okay");
    setLateReason(executionRecord?.lateReason);
    setAudioSession(audio);
  }, [requestedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const sleepResult = useMemo(() => {
    if (!isValidTime(actualSleepTime)) {
      return null;
    }
    return classifySleepResult(actualSleepTime, plannedSleepTime);
  }, [actualSleepTime, plannedSleepTime]);
  const needsLateReason = sleepResult === "slightly_late" || sleepResult === "very_late";
  const resultCopy = sleepResult ? sleepResultLabel(sleepResult) : "时间格式待确认";

  const completeCheckin = async () => {
    if (saving) {
      return;
    }

    if (!isValidTime(actualSleepTime)) {
      setValidationMessage("请填写正确的实际入睡时间，例如 23:45。");
      return;
    }

    if (needsLateReason && !lateReason) {
      setValidationMessage("如果昨晚晚了一点，选一个主要原因就好。");
      return;
    }

    setValidationMessage("");
    setSaving(true);
    try {
      await completeMorningCheckin({
        date,
        actualSleepTime,
        morningMood,
        lateReason
      });
      await createOrUpdateSleepRecord({
        date,
        plannedSleepTime,
        actualSleepTime,
        moodNextMorning: moodLabelMap[morningMood],
        reasonIfFailed: lateReason
      });
      await advanceDemoCycleDateAfterCompletedRecord(date);
      router.replace({ pathname: "/review", params: { date } });
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
        <Text style={styles.datePill}>{date}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>次日打卡</Text>
        <Text style={styles.title}>补录一下昨晚结果</Text>
        <Text style={styles.subtitle}>不用评判昨晚，只要把真实结果放在这里。这样你就能看见自己正在变好。</Text>
      </View>

      <AppCard tone="warm" style={styles.primaryCard}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>昨晚结果</Text>
          <Text style={styles.statusPill}>{resultCopy}</Text>
        </View>
        <Text style={styles.cardTitle}>目标 {plannedSleepTime}</Text>
        <TimePickerField label="实际入睡时间" value={actualSleepTime} onChange={setActualSleepTime} />
      </AppCard>

      <AppCard tone="cool">
        <Text style={styles.cardTitle}>醒来感觉</Text>
        <View style={styles.optionList}>
          {moodOptions.map((option) => {
            const active = option.id === morningMood;
            return (
              <Pressable
                key={option.id}
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}
                onPress={() => setMorningMood(option.id)}
              >
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{option.label}</Text>
                  <Text style={styles.optionBody}>{option.body}</Text>
                </View>
                <View style={[styles.checkDot, active && styles.checkDotActive]}>
                  {active ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard tone={needsLateReason ? "warm" : undefined}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>如果晚睡，主要因为什么？</Text>
          <Text style={styles.body}>接近目标时可以不选；如果晚了一点，选最像昨晚的那一个。</Text>
        </View>
        <View style={styles.reasonWrap}>
          {lateNightReasons.map((reason) => {
            const active = reason.id === lateReason;
            return (
              <Pressable
                key={reason.id}
                onPress={() => setLateReason((current) => (current === reason.id ? undefined : reason.id))}
                style={({ pressed }) => [styles.reason, active && styles.reasonActive, pressed && styles.pressed]}
              >
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{reason.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <SleepAudioSummaryCard session={audioSession} onDeleted={() => setAudioSession(null)} />

      <View style={styles.actionStack}>
        {validationMessage ? <Text style={styles.error}>{validationMessage}</Text> : null}
        <AppButton title={saving ? "正在保存..." : "完成次日打卡"} variant="gradient" onPress={completeCheckin} disabled={saving} />
      </View>
    </Screen>
  );
}

function sleepResultLabel(result: ReturnType<typeof classifySleepResult>): string {
  if (result === "near_target") {
    return "接近目标";
  }

  if (result === "slightly_late") {
    return "晚了一点";
  }

  return "晚了很多";
}

const styles = StyleSheet.create({
  top: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
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
  datePill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#303143",
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6
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
    minHeight: 202
  },
  sectionHeader: {
    gap: 8
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
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
  },
  optionList: {
    gap: 10
  },
  option: {
    minHeight: 76,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  optionActive: {
    backgroundColor: colors.surfaceCool,
    borderColor: colors.primaryDark
  },
  optionCopy: {
    flex: 1,
    gap: 4
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  optionTitleActive: {
    color: colors.accent
  },
  optionBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  checkDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  checkDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  checkMark: {
    color: colors.buttonText,
    fontSize: 15,
    fontWeight: "900"
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
    backgroundColor: colors.surface
  },
  reasonActive: {
    backgroundColor: "#302E35"
  },
  reasonText: {
    color: colors.ink,
    fontWeight: "800"
  },
  reasonTextActive: {
    color: colors.accent
  },
  actionStack: {
    gap: 12
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
