import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";

const steps = [
  "放下工作和消息",
  "3分钟呼吸放松",
  "调暗屏幕和灯光",
  "写下今天最放不下的事",
  "开启下线挑战"
];

export default function RescueScreen() {
  const markRescueSuccess = useAppStore((state) => state.markRescueSuccess);
  const [done, setDone] = useState<Record<number, boolean>>({ 0: true, 3: true });
  const completed = Object.values(done).filter(Boolean).length;

  const success = () => {
    markRescueSuccess();
    Alert.alert("自救成功", "很好，今晚没有彻底滑走。能拉回来一点，就算自救成功。");
    router.push("/");
  };

  return (
    <Screen>
      <PageHeader title="今晚自救流程" />

      <AppCard>
        <Text style={styles.progressText}>已完成 {completed}/5</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(completed / steps.length) * 100}%` }]} />
        </View>
      </AppCard>

      <View style={styles.list}>
        {steps.map((step, index) => {
          const checked = Boolean(done[index]);
          const active = index === 1;
          return (
            <Pressable
              key={step}
              onPress={() => setDone((value) => ({ ...value, [index]: !checked }))}
              style={[styles.step, active && styles.activeStep]}
            >
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, checked && styles.checkedTitle]}>
                  {checked ? "√ " : ""}{step}
                </Text>
                <Text style={styles.stepMeta}>{checked ? "已完成" : active ? "进行态 · 去完成" : "未完成"}</Text>
              </View>
              {active ? <Text style={styles.actionPill}>去完成</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <AppButton title="继续下一步" onPress={success} />
      <BottomNav active="rescue" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressText: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "800"
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  list: {
    gap: 16
  },
  step: {
    minHeight: 104,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  activeStep: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.lineStrong
  },
  stepCopy: {
    flex: 1,
    gap: 8
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  checkedTitle: {
    color: colors.muted
  },
  stepMeta: {
    color: colors.muted,
    fontSize: 16
  },
  actionPill: {
    color: colors.accent,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    overflow: "hidden",
    fontSize: 16,
    fontWeight: "800"
  }
});
