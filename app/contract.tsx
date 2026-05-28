import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { TimePickerField } from "@/components/common/TimePickerField";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { isValidTime } from "@/utils/date";

export default function ContractScreen() {
  const targetBedtime = useAppStore((state) => state.userConfig.targetBedtime);
  const confirmContract = useAppStore((state) => state.confirmContract);
  const [plannedBedtime, setPlannedBedtime] = useState(targetBedtime);

  const save = () => {
    confirmContract(plannedBedtime);
    router.push("/");
  };

  return (
    <Screen>
      <PageHeader title="下线挑战" subtitle="给今晚一个清晰边界，别把自己逼到完全没电。" />

      {/* Cat illustration area */}
      <AppCard tone="lavender" style={styles.illustrationCard}>
        <View style={styles.catArea}>
          {/* Decorative orbs */}
          <View style={styles.sleepOrbit1} />
          <View style={styles.sleepOrbit2} />
          {/* Cat face */}
          <Text style={styles.catFace}>😺</Text>
          <Text style={styles.catZ}>zzz</Text>
        </View>
        <Text style={styles.illustrationText}>是时候让猫咪也休息了</Text>
      </AppCard>

      {/* Time picker */}
      <AppCard topAccent>
        <TimePickerField label="今晚计划睡觉时间" value={plannedBedtime} onChange={setPlannedBedtime} />
        <View style={styles.timeDisplay}>
          <Text style={styles.timeValue}>{plannedBedtime}</Text>
          <Text style={styles.timeLabel}>目标就寝时间</Text>
        </View>
        <Text style={styles.copy}>可以现实一点，也可以比默认目标早一点。重点是你愿意承认这个边界。</Text>
      </AppCard>

      {/* Reward tags */}
      <View style={styles.rewards}>
        {["早睡 +1", "能量恢复", "连胜奖励"].map((label) => (
          <View key={label} style={styles.rewardTag}>
            <Text style={styles.rewardText}>✦ {label}</Text>
          </View>
        ))}
      </View>

      <AppButton
        title="确认今晚挑战"
        variant="gradient"
        onPress={save}
        disabled={!isValidTime(plannedBedtime)}
      />
      <AppButton title="回到首页" variant="ghost" onPress={() => router.push("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  illustrationCard: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center"
  },
  catArea: {
    width: 160,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const
  },
  sleepOrbit1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(133,147,255,0.2)",
    opacity: 0.6
  },
  sleepOrbit2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "rgba(133,147,255,0.15)",
    opacity: 0.4
  },
  catFace: {
    fontSize: 60
  },
  catZ: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
    fontStyle: "italic" as const,
    marginTop: 4
  },
  illustrationText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8
  },
  timeDisplay: {
    alignItems: "center",
    paddingVertical: 12
  },
  timeValue: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: "800"
  },
  timeLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center" as const
  },
  rewards: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10
  },
  rewardTag: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  rewardText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800"
  }
});