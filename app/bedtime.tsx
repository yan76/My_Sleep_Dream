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
import { DailyRecord } from "@/types/app";
import { todayKey } from "@/utils/date";

type Checklist = NonNullable<DailyRecord["bedtimeChecklist"]>;

const sounds = [
  { id: "ocean", label: "海浪夜声", icon: "🌊" },
  { id: "rain", label: "雨声", icon: "🌧️" },
  { id: "wind", label: "风声", icon: "🌬️" },
  { id: "campfire", label: "篝火", icon: "🔥" }
] as const;

const emptyChecklist: Checklist = {
  putPhoneDown: false,
  washedUp: false,
  lightsDimmed: false,
  tomorrowParked: false
};

export default function BedtimeScreen() {
  const record = useAppStore((state) => state.dailyRecords[todayKey()]);
  const saveBedtimeChecklist = useAppStore((state) => state.saveBedtimeChecklist);
  const checklist = record?.bedtimeChecklist ?? emptyChecklist;
  const [selectedSound, setSelectedSound] = useState("ocean");

  const markReady = () => {
    saveBedtimeChecklist(checklist, true);
    Alert.alert("已经记下", "很好，今晚到这里就可以了。", [
      { text: "晚安", onPress: () => router.push("/") }
    ]);
  };

  const currentSound = sounds.find((s) => s.id === selectedSound)!;

  return (
    <Screen>
      <PageHeader title="白噪音 · 放松" subtitle="让大脑慢慢退出今天..." />

      {/* Player card with animated rings */}
      <AppCard tone="cool" style={styles.player}>
        <View style={styles.rings}>
          <View style={styles.ringOuter} />
          <View style={styles.ringMiddle} />
          <View style={styles.ringInner}>
            <Text style={styles.soundIcon}>{currentSound.icon}</Text>
          </View>
        </View>
        <Text style={styles.soundTitle}>{currentSound.label}</Text>
      </AppCard>

      {/* Sound selection grid */}
      <View style={styles.soundRow}>
        {sounds.map((sound) => (
          <Pressable
            key={sound.id}
            onPress={() => setSelectedSound(sound.id)}
            style={[styles.soundChip, selectedSound === sound.id && styles.soundChipActive]}
          >
            <Text style={styles.soundIconSmall}>{sound.icon}</Text>
            <Text style={[styles.soundText, selectedSound === sound.id && styles.soundTextActive]}>
              {sound.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Player controls */}
      <AppCard>
        <View style={styles.controls}>
          <Pressable style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏮</Text>
          </Pressable>
          <Pressable style={[styles.controlBtn, styles.playBtn]}>
            <Text style={styles.playIcon}>▶</Text>
          </Pressable>
          <Pressable style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏭</Text>
          </Pressable>
        </View>
        <View style={styles.audioTrack}>
          <View style={styles.audioFill} />
        </View>
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>30:00</Text>
          <Text style={styles.timerText}>00:00</Text>
        </View>
      </AppCard>

      <Text style={styles.note}>30分钟后将自动关闭，安心入睡吧</Text>
      <AppButton title="我准备睡了" variant="gradient" onPress={markReady} />
      <BottomNav active="audio" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  player: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    gap: 24
  },
  rings: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const
  },
  ringOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    opacity: 0.6
  },
  ringMiddle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: "rgba(255,255,255,0.03)",
    opacity: 0.8
  },
  ringInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(135,150,255,0.20)",
    alignItems: "center",
    justifyContent: "center"
  },
  soundIcon: {
    fontSize: 36
  },
  soundTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800"
  },
  soundRow: {
    flexDirection: "row",
    gap: 10
  },
  soundChip: {
    flex: 1,
    minHeight: 100,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 8
  },
  soundChipActive: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceCool
  },
  soundIconSmall: {
    fontSize: 24
  },
  soundText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center" as const
  },
  soundTextActive: {
    color: colors.primary
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + "40"
  },
  controlIcon: {
    color: colors.accent,
    fontSize: 22
  },
  playIcon: {
    color: colors.accent,
    fontSize: 28
  },
  audioTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden"
  },
  audioFill: {
    width: "42%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  timerText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  note: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center" as const
  }
});