import { router } from "expo-router";
import { AppButton } from "@/components/common/AppButton";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { useAppStore } from "@/store/useAppStore";

export default function BadgesScreen() {
  const badges = useAppStore((state) => state.badges);

  return (
    <Screen>
      <PageHeader title="这些小进展都算数" subtitle="不用攒成很大的改变，能在某个晚上拉回来一点，也值得被记下。" />
      <BadgeGrid badges={badges} />
      <AppButton title="回到首页" variant="ghost" onPress={() => router.push("/")} />
    </Screen>
  );
}
