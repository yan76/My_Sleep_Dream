import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { TimePickerField } from "@/components/common/TimePickerField";
import { colors } from "@/constants/colors";
import { lateNightReasons } from "@/constants/reasons";
import { sleepAidOptions } from "@/constants/sleepAidPreferences";
import { clearLocalAppData, deleteAccountAndLocalData, persistSettings } from "@/features/settings/settingsUseCases";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppStore } from "@/store/useAppStore";
import { LateNightReason, SleepAidPreference } from "@/types/app";
import { isValidTime } from "@/utils/date";
import { getSleepWindow, getSuggestedRescueTime } from "@/utils/sleepPreferences";

const reminderMinuteOptions = [15, 30, 45, 60] as const;
type SettingsDialog = "saved" | "clear" | "deleteAccount" | null;

export default function SettingsScreen() {
  const userConfig = useAppStore((state) => state.userConfig);
  const reminderSettings = useAppStore((state) => state.reminderSettings);
  const updateConfig = useAppStore((state) => state.updateConfig);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const clearAllData = useAppStore((state) => state.clearAllData);
  const persistedReminderSettings = useAppStore((state) => state.reminderSettings);
  const notifications = useNotifications();

  const [targetBedtime, setTargetBedtime] = useState(userConfig.targetBedtime);
  const [wakeUpTime, setWakeUpTime] = useState(userConfig.wakeUpTime);
  const [reminderTime, setReminderTime] = useState(reminderSettings.reminderTime);
  const [reminderEnabled, setReminderEnabled] = useState(reminderSettings.enabled);
  const [bedtimeModeReminderMinutesBefore, setBedtimeModeReminderMinutesBefore] = useState(
    reminderSettings.bedtimeModeReminderMinutesBefore
  );
  const [selectedReasons, setSelectedReasons] = useState<LateNightReason[]>(userConfig.lateNightReasons);
  const [selectedSleepAidPreferences, setSelectedSleepAidPreferences] = useState<SleepAidPreference[]>(
    userConfig.sleepAidPreferences
  );
  const [dialog, setDialog] = useState<SettingsDialog>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const sleepWindow = getSleepWindow(targetBedtime, wakeUpTime);
  const suggestedStart = reminderEnabled ? getSuggestedRescueTime(targetBedtime, bedtimeModeReminderMinutesBefore) : "手动开始";

  const changeTargetBedtime = (value: string) => {
    setTargetBedtime(value);
    if (isValidTime(value)) {
      setReminderTime(getSuggestedRescueTime(value, bedtimeModeReminderMinutesBefore));
    }
  };

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
    if (saving || !valid) {
      return;
    }

    setSaving(true);
    try {
      updateConfig({
        targetBedtime,
        wakeUpTime,
        reminderMinutesBefore: bedtimeModeReminderMinutesBefore,
        lateNightReasons: selectedReasons,
        sleepAidPreferences: selectedSleepAidPreferences
      });
      updateReminderSettings({ reminderTime, enabled: reminderEnabled, bedtimeModeReminderMinutesBefore });
      await persistSettings({
        targetBedtime,
        wakeUpTime,
        reminderEnabled,
        reminderTime,
        bedtimeModeReminderMinutesBefore,
        selectedReasons,
        selectedSleepAidPreferences
      });
      await notifications.refresh();
      setDialog("saved");
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    setDialog("clear");
  };

  const confirmClear = async () => {
    if (clearing) {
      return;
    }

    setClearing(true);
    try {
      await clearLocalAppData({ clearAllData });
      setDialog(null);
      router.replace("/onboarding");
    } finally {
      setClearing(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (deletingAccount) {
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccountAndLocalData({ clearAllData });
      setDialog(null);
      router.replace("/onboarding");
    } finally {
      setDeletingAccount(false);
    }
  };

  const returnHomeAfterSave = () => {
    setDialog(null);
    router.replace("/");
  };

  const valid =
    isValidTime(targetBedtime) &&
    isValidTime(wakeUpTime) &&
    (!reminderEnabled || isValidTime(reminderTime)) &&
    selectedReasons.length > 0;
  const validationMessage = !isValidTime(targetBedtime)
    ? "请输入正确的目标睡觉时间。"
    : !isValidTime(wakeUpTime)
      ? "请输入正确的起床时间。"
      : reminderEnabled && !isValidTime(reminderTime)
        ? "请输入正确的提醒时间，或先关闭提醒。"
        : selectedReasons.length === 0
          ? "请至少选择一个晚睡原因。"
          : "";
  const hasChangedReminder =
    reminderEnabled !== persistedReminderSettings.enabled ||
    reminderTime !== persistedReminderSettings.reminderTime ||
    bedtimeModeReminderMinutesBefore !== persistedReminderSettings.bedtimeModeReminderMinutesBefore;

  return (
    <Screen>
      <PageHeader
        eyebrow="设置"
        title="调整你的夜晚边界"
        subtitle="把“几点前放下手机”定清楚，提醒只负责轻轻推你一下。"
      />

      <AppCard tone="cool">
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>今晚放下手机</Text>
            <Text style={styles.heroTime}>{targetBedtime}</Text>
            <Text style={styles.muted}>目标是在这个时间前结束刷屏，开始进入睡觉状态。</Text>
          </View>
          <View style={styles.badgeStack}>
            <View style={styles.windowBadge}>
              <Text style={styles.windowValue}>{sleepWindow}</Text>
              <Text style={styles.windowLabel}>预计睡眠窗口</Text>
            </View>
            <View style={styles.windowBadge}>
              <Text style={styles.windowValue}>{suggestedStart}</Text>
              <Text style={styles.windowLabel}>建议开始自救</Text>
            </View>
          </View>
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>核心时间</Text>
          <Text style={styles.muted}>决定首页倒计时和每日目标。</Text>
        </View>
        <TimePickerField label="目标睡觉时间" value={targetBedtime} onChange={changeTargetBedtime} />
        <View style={styles.dividerLine} />
        <TimePickerField label="起床时间" value={wakeUpTime} onChange={setWakeUpTime} />
      </AppCard>

      <AppCard>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.title}>提醒</Text>
            <Text style={styles.muted}>{reminderEnabled ? "已开启" : "已关闭，仍可手动开始自救"}</Text>
          </View>
          <Pressable
            onPress={() => setReminderEnabled((value) => !value)}
            style={[styles.switch, reminderEnabled && styles.switchOn]}
          >
            <View style={[styles.knob, reminderEnabled && styles.knobOn]} />
          </Pressable>
        </View>
        {!reminderEnabled ? (
          <Text style={styles.notice}>提醒已关闭，今晚不会主动推你开始收尾；你仍然可以从首页或自救页手动开始。</Text>
        ) : null}
        <View pointerEvents={reminderEnabled ? "auto" : "none"} style={!reminderEnabled && styles.disabledBlock}>
          <TimePickerField label="提醒时间" value={reminderTime} onChange={setReminderTime} />
        </View>
        <View pointerEvents={reminderEnabled ? "auto" : "none"} style={[styles.optionBlock, !reminderEnabled && styles.disabledBlock]}>
          <Text style={styles.inputLabel}>睡前模式提前多久出现</Text>
          <View style={styles.optionRow}>
            {reminderMinuteOptions.map((minutes) => {
              const active = bedtimeModeReminderMinutesBefore === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => {
                    setBedtimeModeReminderMinutesBefore(minutes);
                    if (isValidTime(targetBedtime)) {
                      setReminderTime(getSuggestedRescueTime(targetBedtime, minutes));
                    }
                  }}
                  style={({ pressed }) => [styles.optionChip, active && styles.optionChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{minutes} 分钟</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </AppCard>

      <AppCard tone="warm">
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>容易晚睡的原因</Text>
          <Text style={styles.muted}>自救流程会用它来给你更贴近当晚状态的提示。</Text>
        </View>
        <View style={styles.reasonWrap}>
          {lateNightReasons.map((reason) => {
            const active = selectedReasons.includes(reason.id);
            return (
              <Pressable
                key={reason.id}
                onPress={() => toggleReason(reason.id)}
                style={({ pressed }) => [styles.reason, active && styles.reasonActive, pressed && styles.pressed]}
              >
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{reason.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {selectedReasons.length === 0 ? <Text style={styles.error}>至少选一个原因，方便后续自救更准确。</Text> : null}
      </AppCard>

      <AppCard tone="cool">
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>系统提醒状态</Text>
          <Text style={styles.muted}>{notifications.note}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>权限</Text>
          <Text style={styles.statusValue}>
            {notifications.status?.permission === "granted"
              ? "已允许"
              : notifications.status?.permission === "denied"
                ? "未允许"
                : notifications.status?.permission === "unavailable"
                  ? "不可用"
                  : "待确认"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>注册</Text>
          <Text style={styles.statusValue}>
            {notifications.status?.scheduled ? notifications.status.reminderTime ?? "已注册" : "未注册"}
          </Text>
        </View>
      </AppCard>

      <AppCard tone="lavender">
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>助眠偏好</Text>
          <Text style={styles.muted}>睡意生成器会按这些偏好和晚睡原因，优先推荐更适合今晚的入口。</Text>
        </View>
        <View style={styles.preferenceList}>
          {sleepAidOptions.map((preference) => {
            const active = selectedSleepAidPreferences.includes(preference.id);

            return (
              <Pressable
                key={preference.id}
                onPress={() => toggleSleepAidPreference(preference.id)}
                style={({ pressed }) => [styles.preference, active && styles.preferenceActive, pressed && styles.pressed]}
              >
                <View style={styles.preferenceTextBlock}>
                  <Text style={[styles.preferenceTitle, active && styles.preferenceTitleActive]}>{preference.label}</Text>
                  <Text style={styles.preferenceDescription}>{preference.description}</Text>
                </View>
                <View style={[styles.checkDot, active && styles.checkDotActive]}>
                  {active ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <View style={styles.actionStack}>
        {validationMessage ? <Text style={styles.error}>{validationMessage}</Text> : null}
        {hasChangedReminder ? <Text style={styles.notice}>提醒设置会在保存后永久生效。</Text> : null}
        <AppButton title={saving ? "正在保存..." : "保存设置"} variant="gradient" onPress={save} disabled={!valid || saving} />
        <AppButton title="回到首页" variant="ghost" onPress={() => router.push("/")} />
      </View>

      <AppCard tone="cool">
        <Text style={styles.title}>合规与安全</Text>
        <Text style={styles.muted}>查看隐私政策摘要、用户协议摘要、AI 免责声明、睡眠监听权限说明和商店权限解释。</Text>
        <AppButton title="查看合规与权限说明" variant="secondary" onPress={() => router.push("/legal" as never)} size="md" />
      </AppCard>

      <AppCard tone="rose" style={styles.dangerCard}>
        <Text style={styles.title}>重新开始</Text>
        <Text style={styles.muted}>只在你想清掉本机配置、记录和徽章，重新测试完整流程时使用。</Text>
        <AppButton title="清空本地数据" variant="danger" onPress={clear} size="md" disabled={clearing} />
        <View style={styles.dividerLine} />
        <Text style={styles.muted}>如果已经连接云端，这会请求删除云端账号数据，并清空本机缓存。</Text>
        <AppButton title="删除云端账号数据" variant="danger" onPress={() => setDialog("deleteAccount")} size="md" disabled={deletingAccount} />
      </AppCard>
      <View style={styles.bottomSpacer} />

      <Modal transparent visible={dialog !== null} animationType="fade" onRequestClose={() => setDialog(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialog}>
            {dialog === "saved" ? (
              <>
                <Text style={styles.dialogTitle}>今晚的规划已制定</Text>
                <Text style={styles.dialogBody}>新的睡觉目标、提醒和助眠偏好都已经记下了。今晚打开 App 时，我会按这个节奏轻轻把你带回来。</Text>
                <AppButton title="回到首页" variant="gradient" onPress={returnHomeAfterSave} size="md" />
              </>
            ) : null}
            {dialog === "clear" ? (
              <>
                <Text style={styles.dialogTitle}>清空本地数据？</Text>
                <Text style={styles.dialogBody}>这会删除本机上的配置、睡前记录、复盘、打卡和成长统计。适合重新测试完整流程。</Text>
                <View style={styles.dialogActions}>
                  <AppButton title="取消" variant="ghost" onPress={() => setDialog(null)} size="md" style={styles.dialogButton} disabled={clearing} />
                  <AppButton title={clearing ? "正在清空..." : "清空"} variant="danger" onPress={confirmClear} size="md" style={styles.dialogButton} disabled={clearing} />
                </View>
              </>
            ) : null}
            {dialog === "deleteAccount" ? (
              <>
                <Text style={styles.dialogTitle}>删除云端账号数据？</Text>
                <Text style={styles.dialogBody}>这会请求云端删除你的账号与同步数据，并清空本机缓存。请只在准备重新开始或停止使用时操作。</Text>
                <View style={styles.dialogActions}>
                  <AppButton title="取消" variant="ghost" onPress={() => setDialog(null)} size="md" style={styles.dialogButton} disabled={deletingAccount} />
                  <AppButton title={deletingAccount ? "正在删除..." : "删除"} variant="danger" onPress={confirmDeleteAccount} size="md" style={styles.dialogButton} disabled={deletingAccount} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  heroCopy: {
    flex: 1,
    gap: 8
  },
  kicker: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800"
  },
  heroTime: {
    color: colors.ink,
    fontSize: 46,
    fontWeight: "800",
    lineHeight: 52
  },
  windowBadge: {
    width: 142,
    minHeight: 86,
    borderRadius: 26,
    backgroundColor: "#1D1E2B",  // 原 rgba(255,255,255,0.08)
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    gap: 6
  },
  badgeStack: {
    gap: 10
  },
  windowValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  windowLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  sectionHeader: {
    gap: 4
  },
  statusRow: {
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  statusValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right"
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  toggleCopy: {
    gap: 4
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  muted: {
    color: colors.muted,
    fontSize: 15
  },
  switch: {
    width: 58,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceStrong,
    padding: 3,
    justifyContent: "center"
  },
  switchOn: {
    backgroundColor: colors.primaryDark
  },
  knob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 2
  },
  optionBlock: {
    gap: 10
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700"
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.surface
  },
  optionChipActive: {
    backgroundColor: colors.surfaceCool
  },
  optionText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  optionTextActive: {
    color: colors.primary
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
    backgroundColor: "#302E35"  // 原 rgba(227,212,181,0.18)
  },
  reasonText: {
    color: colors.ink,
    fontWeight: "800"
  },
  reasonTextActive: {
    color: colors.accent
  },
  notice: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  disabledBlock: {
    opacity: 0.42
  },
  preferenceList: {
    gap: 10
  },
  preference: {
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
  preferenceActive: {
    backgroundColor: colors.surfaceCool,
    borderColor: colors.primaryDark
  },
  preferenceTextBlock: {
    flex: 1,
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
  preferenceDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
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
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  },
  actionStack: {
    gap: 12
  },
  dangerCard: {
    gap: 12
  },
  bottomSpacer: {
    height: 110
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 8, 23, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  dialog: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceStrong,
    padding: 22,
    gap: 16
  },
  dialogTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  dialogBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  dialogActions: {
    flexDirection: "row",
    gap: 10
  },
  dialogButton: {
    flex: 1
  }
});
