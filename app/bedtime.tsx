import { Asset } from "expo-asset";
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { ReadyToSleepDialog } from "@/components/common/ReadyToSleepDialog";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { completeReadyToSleepAfterRescue } from "@/features/rescue/readyToSleepUseCase";
import { markSleepGeneratorUsed } from "@/storage/rescueSessionStorage";
import { markSleepAidStarted } from "@/storage/dailyExecutionStorage";

type SoundOption = {
  id: string;
  label: string;
  body: string;
  source: number;
};

const soundOptions: SoundOption[] = [
  {
    id: "rain",
    label: "夜雨",
    body: "细碎、稳定，适合把外界声音盖住。",
    source: require("../assets/audio/night-rain.wav")
  },
  {
    id: "waves",
    label: "海浪",
    body: "慢慢起伏，适合把呼吸放缓。",
    source: require("../assets/audio/soft-waves.wav")
  },
  {
    id: "wind",
    label: "风声",
    body: "低而松，适合焦躁但不想听人声的时候。",
    source: require("../assets/audio/slow-wind.wav")
  },
  {
    id: "low-noise",
    label: "低频白噪音",
    body: "更厚一点，适合脑子停不下来时垫住背景。",
    source: require("../assets/audio/low-noise.wav")
  }
];

export default function BedtimeScreen() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedId, setSelectedId] = useState(soundOptions[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showReadyToSleepDialog, setShowReadyToSleepDialog] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const stopCurrentPlayer = useCallback(() => {
    webAudioRef.current?.pause();
    if (webAudioRef.current) {
      webAudioRef.current.currentTime = 0;
    }
    webAudioRef.current = null;
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;
    setIsPlaying(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopCurrentPlayer();
      };
    }, [stopCurrentPlayer])
  );

  const preparePlaybackAudioSession = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }

    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false
    });
  }, []);

  const playOption = useCallback(
    async (option: SoundOption): Promise<boolean> => {
      try {
        if (Platform.OS === "web") {
          const asset = Asset.fromModule(option.source);
          const audio = new Audio(asset.uri);
          audio.loop = true;
          audio.muted = false;
          audio.volume = 1;
          webAudioRef.current = audio;
          await audio.play();
          setIsPlaying(true);
          return true;
        }

        await preparePlaybackAudioSession();
        const player = createAudioPlayer(option.source);
        player.loop = true;
        player.volume = 1;
        playerRef.current = player;
        player.play();
        setIsPlaying(true);
        return true;
      } catch (error) {
        console.warn("[bedtime] Failed to play sleep sound", error);
        setIsPlaying(false);
        setPlaybackError("声音暂时没有播放出来，请确认手机媒体音量已打开后再试。");
        return false;
      }
    },
    [preparePlaybackAudioSession]
  );

  const chooseSound = async (option: SoundOption) => {
    stopCurrentPlayer();
    setSelectedId(option.id);
    setPlaybackError(null);
    const started = await playOption(option);
    if (!started) {
      return;
    }

    Promise.all([
      markSleepGeneratorUsed(option.label),
      markSleepAidStarted({ aid: "sound_spa" })
    ]).catch(() => undefined);
  };

  const togglePlayback = async () => {
    const selected = soundOptions.find((option) => option.id === selectedId) ?? soundOptions[0];
    const hasPlayer = Platform.OS === "web" ? Boolean(webAudioRef.current) : Boolean(playerRef.current);
    if (!hasPlayer) {
      await chooseSound(selected);
      return;
    }

    if (isPlaying) {
      webAudioRef.current?.pause();
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(null);
      try {
        if (Platform.OS === "web") {
          await webAudioRef.current?.play();
        } else {
          await preparePlaybackAudioSession();
          playerRef.current?.play();
        }
        setIsPlaying(true);
      } catch (error) {
        console.warn("[bedtime] Failed to resume sleep sound", error);
        setPlaybackError("声音暂时没有播放出来，请确认手机媒体音量已打开后再试。");
        setIsPlaying(false);
      }
    }
  };

  const confirmReadyToSleep = async () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    try {
      stopCurrentPlayer();
      const completed = await completeReadyToSleepAfterRescue();
      setShowReadyToSleepDialog(false);
      if (!completed) {
        router.replace("/rescue");
        return;
      }
      router.replace("/rescue");
    } finally {
      setIsClosing(false);
    }
  };

  const selectedOption = soundOptions.find((option) => option.id === selectedId) ?? soundOptions[0];

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/sleep-generator")}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.statusPill}>{isPlaying ? "播放中" : "声音 Spa"}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>声音 Spa</Text>
        <Text style={styles.title}>给今晚铺一层安静的底色</Text>
        <Text style={styles.subtitle}>先选一段背景声，让脑子不再追着外界跑。声音只在本机播放。</Text>
      </View>

      <AppCard tone="cool" style={styles.playerCard}>
        <Text style={styles.label}>当前声音</Text>
        <Text style={styles.currentTitle}>{selectedOption.label}</Text>
        <Text style={styles.body}>{selectedOption.body}</Text>
        <AppButton title={isPlaying ? "暂停" : "播放"} variant="gradient" onPress={togglePlayback} disabled={isClosing} />
        {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
      </AppCard>

      <View style={styles.soundGrid}>
        {soundOptions.map((option) => {
          const active = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              onPress={() => chooseSound(option)}
              style={({ pressed }) => [styles.soundOption, active && styles.soundOptionActive, pressed && styles.pressed]}
            >
              <Text style={[styles.soundTitle, active && styles.soundTitleActive]}>{option.label}</Text>
              <Text style={styles.soundBody}>{option.body}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <AppButton
          title={isClosing ? "正在收尾..." : "我准备睡了"}
          variant="secondary"
          onPress={() => setShowReadyToSleepDialog(true)}
          disabled={isClosing}
        />
        <AppButton title="回到自救流程" variant="ghost" onPress={() => router.replace("/rescue")} disabled={isClosing} />
      </View>

      <ReadyToSleepDialog
        visible={showReadyToSleepDialog}
        confirming={isClosing}
        onCancel={() => setShowReadyToSleepDialog(false)}
        onConfirm={confirmReadyToSleep}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
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
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  playerCard: {
    minHeight: 230
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  currentTitle: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  soundGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  soundOption: {
    width: "48%",
    minHeight: 132,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8
  },
  soundOptionActive: {
    backgroundColor: colors.surfaceWarm,
    borderColor: "rgba(230, 213, 184, 0.42)"
  },
  soundTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  soundTitleActive: {
    color: colors.accent
  },
  soundBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  actions: {
    gap: 12
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
