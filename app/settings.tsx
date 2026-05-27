import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppTextInput } from "@/components/common/AppTextInput";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { TimePickerField } from "@/components/common/TimePickerField";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { isValidTime } from "@/utils/date";

export default function SettingsScreen() {
  const userConfig = useAppStore((state) => state.userConfig);
  const reminderSettings = useAppStore((state) => state.reminderSettings);
  const updateConfig = useAppStore((state) => state.updateConfig);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const clearAllData = useAppStore((state) => state.clearAllData);

  const [targetBedtime, setTargetBedtime] = useState(userConfig.targetBedtime);
  const [wakeUpTime, setWakeUpTime] = useState(userConfig.wakeUpTime);
  const [reminderTime, setReminderTime] = useState(reminderSettings.reminderTime);
  const [reminderEnabled, setReminderEnabled] = useState(reminderSettings.enabled);

  const save = () => {
    updateConfig({ targetBedtime, wakeUpTime });
    updateReminderSettings({ reminderTime, enabled: reminderEnabled });
    router.push("/");
  };

  const clear = () => {
    Alert.alert("清空本地数据？", "这会删除配置、记录和徽章。", [
      { text: "取消", style: "cancel" },
      {
        text: "清空",
        style: "destructive",
        onPress: () => {
          clearAllData();
          router.replace("/onboarding");
        }
      }
    ]);
  };

  const valid = isValidTime(targetBedtime) && isValidTime(wakeUpTime) && isValidTime(reminderTime);

  return (
    <Screen>
      <PageHeader title="调整你的夜晚边界" subtitle="让提醒和目标贴近真实生活，而不是变成新的压力。" />

      <AppCard>
        <TimePickerField label="目标睡觉时间" value={targetBedtime} onChange={setTargetBedtime} />
        <TimePickerField label="起床时间" value={wakeUpTime} onChange={setWakeUpTime} />
      </AppCard>

      <AppCard>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.title}>提醒</Text>
            <Text style={styles.muted}>{reminderEnabled ? "已开启" : "已关闭"}</Text>
          </View>
          <Pressable
            onPress={() => setReminderEnabled((value) => !value)}
            style={[styles.switch, reminderEnabled && styles.switchOn]}
          >
            <View style={[styles.knob, reminderEnabled && styles.knobOn]} />
          </Pressable>
        </View>
        <TimePickerField label="提醒时间" value={reminderTime} onChange={setReminderTime} />
        <AppTextInput
          label="睡前模式提前分钟数"
          value={String(reminderSettings.bedtimeModeReminderMinutesBefore)}
          editable={false}
        />
      </AppCard>

      <AppButton title="保存设置" onPress={save} disabled={!valid} />
      <AppButton title="清空本地数据" variant="danger" onPress={clear} />
      <AppButton title="回到首页" variant="ghost" onPress={() => router.push("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  }
});
