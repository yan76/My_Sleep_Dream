import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { RescueSession } from "@/types/app";
import {
  getTodaySession,
  markShutdownChallengeCompleted,
  startTodaySession
} from "@/storage/rescueSessionStorage";

const challenges = [
  "放下手机 2 分钟",
  "做 5 次深呼吸",
  "关闭当前刷屏应用",
  "把手机放到床外"
];

export default function ShutdownChallengeScreen() {
  const [session, setSession] = useState<RescueSession | null>(null);
  const [selectedChallenge] = useState(() => challenges[new Date().getMinutes() % challenges.length]);
  const [saving, setSaving] = useState(false);
  const [reminder, setReminder] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSession() {
        const current = (await getTodaySession()) ?? (await startTodaySession());
        if (active) {
          setSession(current);
        }
      }

      loadSession();

      return () => {
        active = false;
      };
    }, [])
  );

  const completeChallenge = async () => {
    setSaving(true);
    try {
      const next = await markShutdownChallengeCompleted();
      setSession(next);
      router.replace("/rescue");
    } finally {
      setSaving(false);
    }
  };

  const keepScrolling = () => {
    setReminder("可以继续留在这里，但先不要把“继续刷”变成自动驾驶。再给自己 2 分钟，结束后再做决定。");
  };

  return (
    <Screen>
      <PageHeader title="下线挑战" subtitle="给自己最后一个轻一点、但有边界的收尾动作。" />

      <AppCard topAccent>
        <Text style={styles.label}>当前挑战</Text>
        <Text style={styles.title}>{selectedChallenge}</Text>
        <Text style={styles.body}>
          不需要证明自己很自律，只要让下一次拿起手机稍微麻烦一点。完成后会回到自救流程。
        </Text>
        <View style={styles.sessionBox}>
          <Text style={styles.sessionText}>Session：{session?.status ?? "读取中"}</Text>
        </View>
      </AppCard>

      {reminder ? (
        <Pressable onPress={() => setReminder("")} style={styles.reminder}>
          <Text style={styles.reminderText}>{reminder}</Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <AppButton title="我完成了" variant="gradient" disabled={saving} onPress={completeChallenge} />
        <AppButton title="我还是想继续刷" variant="secondary" disabled={saving} onPress={keepScrolling} />
      </View>

      <BottomNav active="rescue" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  sessionBox: {
    borderRadius: 18,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  sessionText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  reminder: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceWarm,
    padding: 16
  },
  reminderText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  actions: {
    gap: 10
  }
});
