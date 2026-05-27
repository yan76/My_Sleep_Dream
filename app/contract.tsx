import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
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

      <AppCard>
        <TimePickerField label="今晚计划睡觉时间" value={plannedBedtime} onChange={setPlannedBedtime} />
        <Text style={styles.copy}>可以现实一点，也可以比默认目标早一点。重点是你愿意承认这个边界。</Text>
      </AppCard>

      <AppButton title="确认今晚挑战" onPress={save} disabled={!isValidTime(plannedBedtime)} />
      <AppButton title="回到首页" variant="ghost" onPress={() => router.push("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25
  }
});
