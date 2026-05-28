import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppTextInput } from "@/components/common/AppTextInput";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { getTodayReview, saveTodayReview } from "@/storage/rescueSessionStorage";

const closingNote = "今天已经结束，剩下的交给明天。";

export default function TodayReviewScreen() {
  const { from, completedSteps } = useLocalSearchParams<{ from?: string; completedSteps?: string }>();
  const [happenedToday, setHappenedToday] = useState("");
  const [completedToday, setCompletedToday] = useState("");
  const [unfinishedToday, setUnfinishedToday] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadReview() {
        const review = await getTodayReview();
        if (active && review) {
          setHappenedToday(review.happenedToday);
          setCompletedToday(review.completedToday);
          setUnfinishedToday(review.unfinishedToday);
          setTomorrowPlan(review.tomorrowPlan);
        }
      }

      loadReview();

      return () => {
        active = false;
      };
    }, [])
  );

  const save = async () => {
    setSaving(true);
    try {
      await saveTodayReview({
        happenedToday,
        completedToday,
        unfinishedToday,
        tomorrowPlan
      });
      const rescueParams = completedSteps
        ? `/rescue?todayReviewCompleted=1&completedSteps=${completedSteps}`
        : "/rescue?todayReviewCompleted=1";

      router.replace((from === "rescue" ? rescueParams : "/rescue") as never);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="今日复盘" subtitle="把今天收好，再把明天放回明天。" />

      <AppCard topAccent>
        <AppTextInput
          label="今天发生了什么"
          value={happenedToday}
          onChangeText={setHappenedToday}
          placeholder="简单写几件还在脑子里转的事"
          multiline
        />
      </AppCard>

      <AppCard>
        <AppTextInput
          label="今天完成了什么"
          value={completedToday}
          onChangeText={setCompletedToday}
          placeholder="哪怕很小，也算完成"
          multiline
        />
      </AppCard>

      <AppCard>
        <AppTextInput
          label="今天还有什么遗憾或没做完"
          value={unfinishedToday}
          onChangeText={setUnfinishedToday}
          placeholder="先放在这里，不用带上床"
          multiline
        />
      </AppCard>

      <AppCard>
        <AppTextInput
          label="明天想做什么"
          value={tomorrowPlan}
          onChangeText={setTomorrowPlan}
          placeholder="写一两件明天再处理的事"
          multiline
        />
      </AppCard>

      <AppCard tone="cool">
        <Text style={styles.closing}>{closingNote}</Text>
      </AppCard>

      <AppButton title={saving ? "正在保存..." : "保存并回到自救流程"} variant="gradient" disabled={saving} onPress={save} />
      <BottomNav active="review" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  closing: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28
  }
});
