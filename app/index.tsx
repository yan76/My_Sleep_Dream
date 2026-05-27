import { Link, Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { QuickActionGrid } from "@/components/home/QuickActionGrid";
import { TonightGoalCard } from "@/components/home/TonightGoalCard";
import { useAppStore } from "@/store/useAppStore";
import { todayKey } from "@/utils/date";

export default function HomeScreen() {
  const userConfig = useAppStore((state) => state.userConfig);
  const ensureTodayRecord = useAppStore((state) => state.ensureTodayRecord);
  const todayRecord = useAppStore((state) => state.dailyRecords[todayKey()]);

  if (!userConfig.hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  const record = todayRecord ?? ensureTodayRecord();

  return (
    <Screen>
      <View style={styles.topLine}>
        <Text style={styles.status}>21:42</Text>
        <Link href="/settings" asChild>
          <AppButton title="设置" variant="ghost" onPress={() => undefined} style={styles.settingsButton} />
        </Link>
      </View>

      <PageHeader title="晚上好，今天也辛苦了" subtitle="别急着责怪自己，今晚先试着早点停下来" />

      <TonightGoalCard bedtime={record.plannedBedtime} wakeUpTime={userConfig.wakeUpTime} />

      <Link href="/rescue" asChild>
        <AppButton title="开始今晚自救" onPress={() => undefined} />
      </Link>

      <QuickActionGrid />
      <BottomNav active="home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topLine: {
    minHeight: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -56
  },
  status: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800"
  },
  settingsButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 20
  }
});
