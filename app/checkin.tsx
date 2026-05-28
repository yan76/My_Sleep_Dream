import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppTextInput } from "@/components/common/AppTextInput";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { useAppStore } from "@/store/useAppStore";
import { nowTime } from "@/utils/date";

const moods = [
  { label: "精力充沛", emoji: "⚡", color: colors.success },
  { label: "还不错", emoji: "🙂", color: colors.primary },
  { label: "有点困", emoji: "😴", color: colors.warning },
  { label: "很疲惫", emoji: "😩", color: colors.danger }
] as const;

export default function CheckinScreen() {
  const saveCheckin = useAppStore((state) => state.saveCheckin);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [selectedMood, setSelectedMood] = useState(1);
  const [reflection, setReflection] = useState("");
  const [wakeTime] = useState(nowTime());

  const save = () => {
    saveCheckin({
      sleepQuality,
      morningMood: moods[selectedMood].label,
      reflection,
      actualWakeTime: wakeTime
    });
    router.push("/");
  };

  return (
    <Screen>
      <PageHeader
        title="早上好 ☀️"
        subtitle="花几秒回顾一下昨晚，给新的一天一个清醒的开头"
      />

      {/* Sleep quality rating */}
      <AppCard topAccent>
        <Text style={styles.cardTitle}>昨晚睡得怎么样？</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setSleepQuality(star)}
              style={styles.starBtn}
            >
              <Text style={[
                styles.star,
                star <= sleepQuality && styles.starActive
              ]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.qualityLabel}>
          {["很差", "不太好", "一般", "不错", "非常好"][sleepQuality - 1]}
        </Text>
      </AppCard>

      {/* Sleep stats */}
      <AppCard tone="cool">
        <Text style={styles.cardTitle}>昨晚睡眠概览</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{wakeTime}</Text>
            <Text style={styles.statLabel}>起床时间</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sleepQuality}/5</Text>
            <Text style={styles.statLabel}>睡眠质量</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~7h</Text>
            <Text style={styles.statLabel}>睡眠时长</Text>
          </View>
        </View>
      </AppCard>

      {/* Morning mood */}
      <AppCard>
        <Text style={styles.cardTitle}>现在的状态</Text>
        <View style={styles.moodRow}>
          {moods.map((mood, index) => (
            <Pressable
              key={mood.label}
              onPress={() => setSelectedMood(index)}
              style={[
                styles.moodChip,
                selectedMood === index && {
                  borderColor: mood.color,
                  backgroundColor: mood.color + "20"
                }
              ]}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[
                styles.moodText,
                selectedMood === index && { color: mood.color }
              ]}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </AppCard>

      {/* Quick reflection */}
      <AppCard>
        <Text style={styles.cardTitle}>一句话回顾</Text>
        <AppTextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder="昨晚有什么想记下的？比如：'比平时早睡了30分钟'"
          multiline
          style={styles.input}
        />
      </AppCard>

      {/* Quick tags */}
      <View style={styles.quickTags}>
        {["早睡了", "睡得踏实", "做了好梦", "半夜醒了"].map((tag) => (
          <Pressable
            key={tag}
            onPress={() => setReflection((prev) => (prev ? `${prev} · ${tag}` : tag))}
            style={styles.tag}
          >
            <Text style={styles.tagText}>+ {tag}</Text>
          </Pressable>
        ))}
      </View>

      <AppButton title="打卡完成，开始新的一天" variant="gradient" onPress={save} />
      <AppButton title="跳过" variant="ghost" onPress={() => router.push("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12
  },
  starBtn: {
    padding: 4
  },
  star: {
    fontSize: 40,
    color: colors.muted,
    opacity: 0.3
  },
  starActive: {
    color: colors.warning,
    opacity: 1
  },
  qualityLabel: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center" as const
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8
  },
  statItem: {
    alignItems: "center",
    gap: 6
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.line
  },
  moodRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8
  },
  moodChip: {
    flex: 1,
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  moodEmoji: {
    fontSize: 22
  },
  moodText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
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