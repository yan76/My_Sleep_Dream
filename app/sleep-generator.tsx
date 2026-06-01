import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { SleepAidOption } from "@/constants/sleepAidPreferences";
import { getUserConfig, markSleepGeneratorUsed, markTreeHoleUsed } from "@/storage/rescueSessionStorage";
import { UserConfig } from "@/types/app";
import { getRecommendedSleepAids } from "@/utils/sleepPreferences";

export default function SleepGeneratorScreen() {
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);

  const loadConfig = useCallback(async () => {
    setUserConfig(await getUserConfig());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  const recommendedAids = useMemo(
    () => getRecommendedSleepAids(userConfig?.lateNightReasons ?? [], userConfig?.sleepAidPreferences ?? []),
    [userConfig?.lateNightReasons, userConfig?.sleepAidPreferences]
  );
  const primaryAid = recommendedAids[0];

  const chooseAid = async (aid: SleepAidOption) => {
    if (isChoosing) {
      return;
    }

    setIsChoosing(true);
    try {
      if (aid.route === "/tree-hole") {
        await markTreeHoleUsed();
      } else {
        await markSleepGeneratorUsed(aid.label);
      }
      router.push(aid.route);
    } finally {
      setIsChoosing(false);
    }
  };

  const prepareToSleep = async () => {
    if (isChoosing) {
      return;
    }

    setIsChoosing(true);
    try {
      await markSleepGeneratorUsed(primaryAid?.label ?? "睡意生成器");
      router.replace("/rescue");
    } finally {
      setIsChoosing(false);
    }
  };

  if (!userConfig) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>正在挑一条适合今晚的路...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.backButton} onPress={() => router.push("/rescue")}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.statusPill}>进入睡意</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>睡意生成器</Text>
        <Text style={styles.title}>选一种方式，把注意力慢慢带回来</Text>
        <Text style={styles.subtitle}>推荐顺序会根据你的晚睡原因和助眠偏好变化。今晚不需要用力睡着，只要让身体开始降速。</Text>
      </View>

      <AppCard tone="warm" style={styles.recommendCard}>
        <Text style={styles.label}>今晚优先推荐</Text>
        <Text style={styles.primaryTitle}>{primaryAid.label}</Text>
        <Text style={styles.body}>{primaryAid.description}</Text>
        <AppButton
          title={`使用${primaryAid.label}`}
          variant="gradient"
          onPress={() => chooseAid(primaryAid)}
          disabled={isChoosing}
        />
      </AppCard>

      <View style={styles.optionList}>
        {recommendedAids.map((aid, index) => (
          <Pressable
            key={aid.id}
            onPress={() => chooseAid(aid)}
            style={({ pressed }) => [styles.aidCard, index === 0 && styles.aidCardPrimary, pressed && styles.pressed]}
          >
            <View style={styles.aidRank}>
              <Text style={styles.aidRankText}>{index + 1}</Text>
            </View>
            <View style={styles.aidCopy}>
              <Text style={styles.aidTitle}>{aid.label}</Text>
              <Text style={styles.aidBody}>{aid.description}</Text>
            </View>
            <Text style={styles.aidAction}>进入</Text>
          </Pressable>
        ))}
      </View>

      <AppButton title="谢谢，我准备睡了" variant="ghost" onPress={prepareToSleep} disabled={isChoosing} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  top: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  backText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  statusPill: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#39313A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden"
  },
  header: {
    gap: 10
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  recommendCard: {
    borderColor: "#5B5147",
    backgroundColor: "#2A2834"
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  primaryTitle: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  optionList: {
    gap: 12
  },
  aidCard: {
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  aidCardPrimary: {
    backgroundColor: colors.surfaceCool,
    borderColor: colors.primaryDark
  },
  aidRank: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  aidRankText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: "900"
  },
  aidCopy: {
    flex: 1,
    gap: 5
  },
  aidTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  aidBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  aidAction: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900"
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
