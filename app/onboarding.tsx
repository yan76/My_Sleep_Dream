import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { TimePickerField } from "@/components/common/TimePickerField";
import { colors } from "@/constants/colors";
import { saveUserConfig } from "@/storage/rescueSessionStorage";
import { lateNightReasons } from "@/constants/reasons";
import { defaultSleepAidPreferences, sleepAidOptions } from "@/constants/sleepAidPreferences";
import { useAppStore } from "@/store/useAppStore";
import { LateNightReason, SleepAidPreference } from "@/types/app";
import { isValidTime } from "@/utils/date";

const reminderMinuteOptions = [15, 30, 45, 60] as const;

export default function OnboardingScreen() {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [targetBedtime, setTargetBedtime] = useState("23:30");
  const [wakeUpTime, setWakeUpTime] = useState("07:30");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(30);
  const [selectedReasons, setSelectedReasons] = useState<LateNightReason[]>([]);
  const [selectedSleepAidPreferences, setSelectedSleepAidPreferences] = useState<SleepAidPreference[]>(
    defaultSleepAidPreferences
  );

  const isValid = isValidTime(targetBedtime) && isValidTime(wakeUpTime) && selectedReasons.length > 0;

  const toggleReason = (reason: LateNightReason) => {
    setSelectedReasons((current) =>
      current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]
    );
  };

  const toggleSleepAidPreference = (preference: SleepAidPreference) => {
    setSelectedSleepAidPreferences((current) =>
      current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]
    );
  };

  const save = async () => {
    completeOnboarding({
      targetBedtime,
      wakeUpTime,
      reminderMinutesBefore,
      lateNightReasons: selectedReasons,
      sleepAidPreferences: selectedSleepAidPreferences
    });
    await saveUserConfig({
      hasOnboarded: true,
      targetSleepTime: targetBedtime,
      targetBedtime,
      wakeUpTime,
      reminderMinutesBefore,
      lateNightReasons: selectedReasons,
      sleepAidPreferences: selectedSleepAidPreferences
    });
    router.replace("/");
  };

  return (
    <Screen>
      {/* Decorative welcome badge */}
      <View style={styles.welcomeBadge}>
        <View style={styles.welcomeGlow} />
        <Text style={styles.welcomeIcon}>🌙</Text>
      </View>

      <PageHeader
        eyebrow="早睡自救局"
        title="先给今晚一个温柔边界"
        subtitle="不是发誓改命，只是把最容易滑走的夜晚，稍微扶稳一点。"
      />

      <AppCard>
        <TimePickerField label="目标睡觉时间" value={targetBedtime} onChange={setTargetBedtime} />
        <View style={styles.dividerLine} />
        <TimePickerField label="起床时间" value={wakeUpTime} onChange={setWakeUpTime} />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>提前多久提醒你开始收尾？</Text>
        <View style={styles.optionRow}>
          {reminderMinuteOptions.map((minutes) => {
            const active = reminderMinutesBefore === minutes;
            return (
              <Pressable
                key={minutes}
                onPress={() => setReminderMinutesBefore(minutes)}
                style={[styles.reason, active && styles.reasonActive]}
              >
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{minutes} 分钟</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>你通常为什么晚睡？</Text>
        <View style={styles.reasonWrap}>
          {lateNightReasons.map((reason) => {
            const active = selectedReasons.includes(reason.id);
            return (
              <Pressable
                key={reason.id}
                onPress={() => toggleReason(reason.id)}
                style={[styles.reason, active && styles.reasonActive]}
              >
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{reason.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>你更愿意用哪种方式进入睡意？</Text>
        <View style={styles.preferenceList}>
          {sleepAidOptions.map((preference) => {
            const active = selectedSleepAidPreferences.includes(preference.id);
            return (
              <Pressable
                key={preference.id}
                onPress={() => toggleSleepAidPreference(preference.id)}
                style={[styles.preference, active && styles.preferenceActive]}
              >
                <View style={styles.preferenceCopy}>
                  <Text style={[styles.preferenceTitle, active && styles.preferenceTitleActive]}>{preference.label}</Text>
                  <Text style={styles.preferenceBody}>{preference.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppButton
        title="开始今晚的自救"
        variant="gradient"
        onPress={save}
        disabled={!isValid}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcomeBadge: {
    alignItems: "center",
    paddingTop: 20
  },
  welcomeGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glowBlue,
    top: 10
  },
  welcomeIcon: {
    fontSize: 48
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 4
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  optionRow: {
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
    backgroundColor: colors.surfaceWarm
  },
  reasonText: {
    color: colors.ink,
    fontWeight: "800"
  },
  reasonTextActive: {
    color: colors.accent
  },
  preferenceList: {
    gap: 10
  },
  preference: {
    borderRadius: 22,
    padding: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  preferenceActive: {
    backgroundColor: colors.surfaceCool,
    borderColor: colors.primaryDark
  },
  preferenceCopy: {
    gap: 4
  },
  preferenceTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  preferenceTitleActive: {
    color: colors.accent
  },
  preferenceBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  }
});
