import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { Screen } from "@/components/common/Screen";
import { SoftInputPanel } from "@/components/common/SoftInputPanel";
import { colors } from "@/constants/colors";
import { getTodayReview, saveTodayReview } from "@/storage/rescueSessionStorage";

type Draft = {
  happenedToday: string;
  completedToday: string;
  unfinishedToday: string;
  tomorrowPlan: string;
  minimalAnswer: string;
};

type ReviewStep = {
  key: keyof Omit<Draft, "minimalAnswer">;
  eyebrow: string;
  title: string;
  subtitle: string;
  placeholder: string;
  reminderTitle: string;
  reminderBody: string;
  buttonTitle: string;
};

const steps: ReviewStep[] = [
  {
    key: "happenedToday",
    eyebrow: "和今天道个晚安",
    title: "今天最占脑子的事是什么？",
    subtitle: "不用分析得很清楚，先把它从脑子里挪出来。",
    placeholder: "例如：今天一直惦记着那条消息，或者那个没收尾的工作。",
    reminderTitle: "给你的提醒",
    reminderBody: "写下来不是为了复盘得多好，而是让它不用继续在脑子里转。",
    buttonTitle: "下一步"
  },
  {
    key: "completedToday",
    eyebrow: "给自己一点确认",
    title: "有没有一件值得肯定自己的小事？",
    subtitle: "哪怕只是撑过来了，也算。写一句就好，不用漂亮。",
    placeholder: "例如：今天虽然很累，但还是把重要的消息回完了。",
    reminderTitle: "这也算数",
    reminderBody: "你不需要表现得很厉害，能看见自己已经做过的一点点，就够了。",
    buttonTitle: "继续放下今天"
  },
  {
    key: "unfinishedToday",
    eyebrow: "把没收完的先放下",
    title: "今天有什么遗憾、委屈，或者没做完的事？",
    subtitle: "不是要今晚解决它，只是给它一个暂时停靠的地方。",
    placeholder: "例如：有点后悔没有早点停下，或者还有一件事没处理完。",
    reminderTitle: "今晚先不加码",
    reminderBody: "没完成的事不会因为你多熬一会儿就都变轻。先把它放在这里。",
    buttonTitle: "写给明天"
  },
  {
    key: "tomorrowPlan",
    eyebrow: "留给明天一件小事",
    title: "明天先做哪一件小事？",
    subtitle: "只写一件最小的，不用把明天也排满。",
    placeholder: "例如：明天先回那条消息，或者先把桌面收一下。",
    reminderTitle: "明天会接住它",
    reminderBody: "不是不做，是不用今晚硬撑着做。今天可以先到这里。",
    buttonTitle: "封存今日，进入下一步"
  }
];

const emptyDraft: Draft = {
  happenedToday: "",
  completedToday: "",
  unfinishedToday: "",
  tomorrowPlan: "",
  minimalAnswer: ""
};

const requiredMessage = "请先填写内容";

export default function TodayReviewScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [minimalMode, setMinimalMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [validationError, setValidationError] = useState<keyof Draft | null>(null);

  const currentStep = steps[stepIndex];
  const currentValue = useMemo(() => draft[currentStep.key], [currentStep.key, draft]);
  const currentHasError = validationError === currentStep.key;
  const minimalHasError = validationError === "minimalAnswer";
  const returnPath = from === "home" ? "/" : "/rescue";

  const loadReview = useCallback(async () => {
    const review = await getTodayReview();

    if (review) {
      setDraft({
        happenedToday: review.happenedToday,
        completedToday: review.completedToday,
        unfinishedToday: review.unfinishedToday,
        tomorrowPlan: review.tomorrowPlan,
        minimalAnswer: review.minimalMode ? review.happenedToday : ""
      });
      setMinimalMode(Boolean(review.minimalMode));
    }

    setHasLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReview();
    }, [loadReview])
  );

  const updateDraft = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (validationError === key && value.trim()) {
      setValidationError(null);
    }
  };

  const goBack = () => {
    if (minimalMode) {
      setMinimalMode(false);
      setValidationError(null);
      return;
    }

    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      setValidationError(null);
      return;
    }

    router.replace(returnPath);
  };

  const completeReview = async (useMinimalMode: boolean) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await saveTodayReview(
        useMinimalMode
          ? {
              happenedToday: draft.minimalAnswer.trim(),
              completedToday: "",
              unfinishedToday: "",
              tomorrowPlan: "",
              minimalMode: true
            }
          : {
              happenedToday: draft.happenedToday.trim(),
              completedToday: draft.completedToday.trim(),
              unfinishedToday: draft.unfinishedToday.trim(),
              tomorrowPlan: draft.tomorrowPlan.trim(),
              minimalMode: false
            }
      );
      router.replace(returnPath);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrimary = () => {
    if (minimalMode) {
      if (!draft.minimalAnswer.trim()) {
        setValidationError("minimalAnswer");
        return;
      }

      setValidationError(null);
      completeReview(true);
      return;
    }

    if (!currentValue.trim()) {
      setValidationError(currentStep.key);
      return;
    }

    setValidationError(null);
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    completeReview(false);
  };

  const enterMinimalMode = () => {
    setMinimalMode(true);
    setValidationError(null);
  };

  if (!hasLoaded) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>正在把今天轻轻打开...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>{minimalMode || stepIndex > 0 ? "上一步" : "返回"}</Text>
          </Pressable>
          <Text style={styles.progress}>{minimalMode ? "极简" : `${stepIndex + 1} / ${steps.length}`}</Text>
        </View>

        {minimalMode ? (
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>今天太累了也可以</Text>
              <Text style={styles.title}>此刻你最想放下什么？</Text>
              <Text style={styles.subtitle}>只写一句，甚至几个字。今晚不用把所有事讲清楚。</Text>
            </View>

            <SoftInputPanel
              accessibilityLabel="极简复盘输入"
              hasError={minimalHasError}
              placeholder="例如：先放下那个没回完的消息。"
              value={draft.minimalAnswer}
              onChangeText={(value) => updateDraft("minimalAnswer", value)}
              style={styles.input}
            />
            {minimalHasError ? <Text style={styles.requiredText}>{requiredMessage}</Text> : null}

            <View style={styles.reminder}>
              <Text style={styles.reminderTitle}>给你的提醒</Text>
              <Text style={styles.reminderBody}>极简记录不是偷懒，是在很累的时候还给今天一个出口。</Text>
            </View>

            <View style={styles.actions}>
              <AppButton title="封存今日，进入下一步" onPress={handlePrimary} disabled={isSaving} variant="gradient" />
              <AppButton title="回到完整复盘" onPress={() => setMinimalMode(false)} disabled={isSaving} variant="ghost" size="md" />
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>{currentStep.eyebrow}</Text>
              <Text style={styles.title}>{currentStep.title}</Text>
              <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
            </View>

            <SoftInputPanel
              accessibilityLabel={currentStep.title}
              hasError={currentHasError}
              placeholder={currentStep.placeholder}
              value={currentValue}
              onChangeText={(value) => updateDraft(currentStep.key, value)}
              style={styles.input}
            />
            {currentHasError ? <Text style={styles.requiredText}>{requiredMessage}</Text> : null}

            <View style={styles.reminder}>
              <Text style={styles.reminderTitle}>{currentStep.reminderTitle}</Text>
              <Text style={styles.reminderBody}>{currentStep.reminderBody}</Text>
            </View>

            <View style={styles.actions}>
              <AppButton title={currentStep.buttonTitle} onPress={handlePrimary} disabled={isSaving} variant="gradient" />
              <AppButton title="今天太累了，极简记录" onPress={enterMinimalMode} disabled={isSaving} variant="ghost" size="md" />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    gap: 28
  },
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
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    justifyContent: "center",
    paddingHorizontal: 17
  },
  backText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  progress: {
    minWidth: 68,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  content: {
    flex: 1,
    gap: 18
  },
  header: {
    gap: 13
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "700"
  },
  input: {
    minHeight: 188
  },
  requiredText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
    marginTop: -8,
    paddingHorizontal: 6
  },
  reminder: {
    minHeight: 124,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#3A4B51",
    backgroundColor: colors.surfaceMint,
    padding: 20,
    justifyContent: "center",
    gap: 12
  },
  reminderTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  reminderBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700"
  },
  actions: {
    marginTop: "auto",
    gap: 14,
    paddingTop: 20
  }
});
