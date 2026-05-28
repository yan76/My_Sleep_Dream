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
  { title: "放下工作和消息", subtitle: "给自己一个真正休息的信号", icon: "📵" },
  { title: "3分钟呼吸放松", subtitle: "跟着引导，让呼吸慢下来", icon: "🌬️" },
  { title: "调暗屏幕和灯光", subtitle: "告诉眼睛和大脑：该收工了", icon: "🌙" },
  { title: "写下今天最放不下的事", subtitle: "清空大脑缓存，释放焦虑", icon: "✍️" },
  { title: "开启下线挑战", subtitle: "最后一步，给自己一个仪式", icon: "⚡" }
];

export default function RescueScreen() {
  const markRescueSuccess = useAppStore((state) => state.markRescueSuccess);
  const [done, setDone] = useState<Record<number, boolean>>({ 0: true });
  const completed = Object.values(done).filter(Boolean).length;
  const progress = (completed / steps.length) * 100;

  const success = () => {
    markRescueSuccess();
    Alert.alert(
      "自救成功 ✦",
      "今晚没有彻底滑走，能拉回来一点，就算自救成功。",
      [{ text: "好的", onPress: () => router.push("/") }]
    );
  };

  return (
    <Screen>
      <PageHeader title="今晚自救流程" subtitle="一步一步把夜晚的主动权拿回来" />

      {/* Progress card */}
      <AppCard topAccent>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>完成进度</Text>
          <Text style={styles.progressCount}>{completed}/{steps.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </AppCard>

      {/* Step list */}
      <View style={styles.list}>
        {steps.map((step, index) => {
          const checked = Boolean(done[index]);
          const isActive = index === completed && !checked;
          const isLocked = index > completed && !checked;
          return (
            <Pressable
              key={step.title}
              onPress={() => {
                if (!isLocked) {
                  setDone((value) => ({ ...value, [index]: !checked }));
                }
              }}
              style={[
                styles.step,
                isActive && styles.activeStep,
                checked && styles.checkedStep,
                isLocked && styles.lockedStep
              ]}
            >
              {/* Status indicator */}
              <View style={[
                styles.stepIndicator,
                checked && styles.indicatorChecked,
                isActive && styles.indicatorActive
              ]}>
                {checked ? (
                  <Text style={styles.checkMark}>✓</Text>
                ) : isActive ? (
                  <View style={styles.pulseDot} />
                ) : (
                  <Text style={styles.stepNum}>{index + 1}</Text>
                )}
              </View>

              <View style={styles.stepCopy}>
                <Text style={[
                  styles.stepTitle,
                  checked && styles.checkedTitle,
                  isLocked && styles.lockedTitle
                ]}>
                  {step.title}
                </Text>
                <Text style={[
                  styles.stepMeta,
                  isLocked && styles.lockedMeta
                ]}>
                  {checked ? "✓ 已完成" : isActive ? "进行中" : step.subtitle}
                </Text>
              </View>

              {isActive ? (
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>去完成</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <AppButton
        title={completed === steps.length ? "完成自救" : "继续下一步"}
        variant="gradient"
        onPress={success}
      />
      <BottomNav active="rescue" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progressText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  progressCount: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800"
  },
  progressTrack: {
    height: 8,
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
    gap: 12
  },
  step: {
    minHeight: 96,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  activeStep: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.lineStrong
  },
  checkedStep: {
    backgroundColor: colors.surface,
    opacity: 0.7
  },
  lockedStep: {
    backgroundColor: colors.surface,
    borderColor: colors.line
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong
  },
  indicatorChecked: {
    backgroundColor: colors.accent + "50"
  },
  indicatorActive: {
    backgroundColor: colors.surfaceCool
  },
  checkMark: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800"
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary
  },
  stepNum: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  stepCopy: {
    flex: 1,
    gap: 4
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  checkedTitle: {
    color: colors.muted
  },
  lockedTitle: {
    color: colors.muted,
    opacity: 0.5
  },
  stepMeta: {
    color: colors.muted,
    fontSize: 14
  },
  lockedMeta: {
    opacity: 0.5
  },
  actionPill: {
    backgroundColor: colors.primary + "30",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary + "50"
  },
  actionPillText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800"
  }
});