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

const sounds = ["海浪", "雨声", "风声", "篝火"];

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
  const [selectedSound, setSelectedSound] = useState("海浪");

  const markReady = () => {
    saveBedtimeChecklist(checklist, true);
    Alert.alert("已经记下", "很好，今晚到这里就可以了。");
    router.push("/");
  };

  return (
    <Screen>
      <PageHeader title="白噪音 / 放松" />

      <AppCard style={styles.player}>
        <View style={styles.rings}>
          <View style={styles.ringOne} />
          <View style={styles.ringTwo} />
          <View style={styles.ringThree} />
        </View>
        <Text style={styles.soundTitle}>{selectedSound === "海浪" ? "海浪夜声" : selectedSound}</Text>
      </AppCard>

      <AppCard>
        <View style={styles.controls}>
          <Text style={styles.controlIcon}>◁</Text>
          <Text style={styles.controlIcon}>▣</Text>
          <Text style={styles.controlIcon}>▷</Text>
        </View>
        <View style={styles.audioTrack}>
          <View style={styles.audioFill} />
        </View>
      </AppCard>

      <View style={styles.soundRow}>
        {sounds.map((sound) => (
          <Pressable
            key={sound}
            onPress={() => setSelectedSound(sound)}
            style={[styles.soundChip, selectedSound === sound && styles.soundChipActive]}
          >
            <Text style={[styles.soundText, selectedSound === sound && styles.soundTextActive]}>{sound}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.note}>让大脑慢慢退出今天... 30分钟后将自动关闭</Text>
      <AppButton title="我准备睡了" onPress={markReady} />
      <BottomNav active="audio" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  player: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    gap: 28
  },
  rings: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center"
  },
  ringOne: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  ringTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  ringThree: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(227,212,181,0.62)"
  },
  soundTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800"
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 34
  },
  controlIcon: {
    color: colors.accent,
    fontSize: 34,
    fontWeight: "700"
  },
  audioTrack: {
    height: 8,
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
  soundRow: {
    flexDirection: "row",
    gap: 14
  },
  soundChip: {
    minWidth: 112,
    minHeight: 112,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  soundChipActive: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceCool
  },
  soundText: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "800"
  },
  soundTextActive: {
    color: colors.primary
  },
  note: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 26
  }
});
