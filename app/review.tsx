import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppTextInput } from "@/components/common/AppTextInput";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { todayKey } from "@/utils/date";

export default function ReviewScreen() {
  const existing = useAppStore((state) => state.dailyRecords[todayKey()]?.review);
  const saveReview = useAppStore((state) => state.saveReview);
  const [events, setEvents] = useState(existing?.events ?? "");
  const [gains, setGains] = useState(existing?.gains ?? "");
  const [tomorrowWishlist, setTomorrowWishlist] = useState(existing?.tomorrowWishlist ?? "");

  const save = () => {
    saveReview({ events, gains, tomorrowWishlist });
    router.push("/rescue");
  };

  return (
    <Screen>
      <PageHeader title="今日清空仪式" subtitle="把白天的情绪留在这里，大脑才能安心下线" />

      <AppCard>
        <Text style={styles.cardTitle}>今天的心情</Text>
        <View style={styles.moodLabels}>
          <Text style={styles.muted}>紧绷</Text>
          <Text style={styles.muted}>机械</Text>
          <Text style={styles.muted}>释怀</Text>
        </View>
        <View style={styles.slider}>
          <View style={styles.sliderFill} />
          <View style={styles.knob} />
        </View>
      </AppCard>

      <AppTextInput
        label=""
        value={events}
        onChangeText={setEvents}
        placeholder="写下今天最让你放不下的事（工作、某句话、某个焦虑）..."
        multiline
        style={styles.largeInput}
      />

      <AppTextInput label="今天的小收获" value={gains} onChangeText={setGains} multiline />
      <AppTextInput label="明天再处理" value={tomorrowWishlist} onChangeText={setTomorrowWishlist} multiline />

      <AppButton title="封存今日，进入自救" onPress={save} />
      <BottomNav active="review" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  moodLabels: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  muted: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: "700"
  },
  slider: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "visible"
  },
  sliderFill: {
    width: "70%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.danger
  },
  knob: {
    position: "absolute",
    left: "68%",
    top: -11,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent
  },
  largeInput: {
    minHeight: 180,
    fontSize: 19,
    lineHeight: 28,
    padding: 24
  }
});
