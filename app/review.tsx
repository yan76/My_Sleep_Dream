import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppTextInput } from "@/components/common/AppTextInput";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { todayKey } from "@/utils/date";

const moods = [
  { label: "紧绷", color: colors.danger },
  { label: "焦虑", color: colors.warning },
  { label: "平静", color: colors.primary },
  { label: "释怀", color: colors.success }
] as const;

export default function ReviewScreen() {
  const existing = useAppStore((state) => state.dailyRecords[todayKey()]?.review);
  const saveReview = useAppStore((state) => state.saveReview);
  const [events, setEvents] = useState(existing?.events ?? "");
  const [gains, setGains] = useState(existing?.gains ?? "");
  const [tomorrowWishlist, setTomorrowWishlist] = useState(existing?.tomorrowWishlist ?? "");
  const [selectedMood, setSelectedMood] = useState(1);

  const save = () => {
    saveReview({ events, gains, tomorrowWishlist });
    router.push("/rescue");
  };

  return (
    <Screen>
      <PageHeader title="今日清空仪式" subtitle="把白天的情绪留在这里，大脑才能安心下线" />

      {/* Mood selector */}
      <AppCard style={styles.moodCard}>
        <Text style={styles.cardTitle}>今天的心情</Text>
        <View style={styles.moodRow}>
          {moods.map((mood, index) => (
            <Pressable
              key={mood.label}
              onPress={() => setSelectedMood(index)}
              style={[
                styles.moodChip,
                selectedMood === index && { borderColor: mood.color, backgroundColor: mood.color + "20" }
              ]}
            >
              <Text style={[
                styles.moodText,
                selectedMood === index && { color: mood.color }
              ]}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </AppCard>

      {/* Input sections */}
      <AppCard>
        <Text style={styles.cardTitle}>今天最放不下的事</Text>
        <AppTextInput
          value={events}
          onChangeText={setEvents}
          placeholder="写下今天最让你放不下的事..."
          multiline
          style={styles.largeInput}
        />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>今天的小收获</Text>
        <AppTextInput
          value={gains}
          onChangeText={setGains}
          placeholder="哪怕很小，也值得记一笔..."
          multiline
          style={styles.input}
        />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>明天再处理</Text>
        <AppTextInput
          value={tomorrowWishlist}
          onChangeText={setTomorrowWishlist}
          placeholder="移到明天，今天不加班..."
          multiline
          style={styles.input}
        />
      </AppCard>

      {/* Quick action tags */}
      <View style={styles.quickTags}>
        {["工作压力", "社交消耗", "刷手机", "什么都没做"].map((tag) => (
          <Pressable
            key={tag}
            onPress={() => setEvents((prev) => (prev ? `${prev}\n${tag}` : tag))}
            style={styles.tag}
          >
            <Text style={styles.tagText}>+ {tag}</Text>
          </Pressable>
        ))}
      </View>

      <AppButton title="封存今日，进入自救" variant="gradient" onPress={save} />
      <BottomNav active="review" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  moodCard: {
    minHeight: 120
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  moodRow: {
    flexDirection: "row",
    gap: 10
  },
  moodChip: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  moodText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800"
  },
  largeInput: {
    minHeight: 120,
    fontSize: 17,
    lineHeight: 26,
    padding: 18,
    marginTop: 8
  },
  input: {
    minHeight: 80,
    fontSize: 17,
    lineHeight: 24,
    padding: 16,
    marginTop: 8
  },
  quickTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tag: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  tagText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  }
});