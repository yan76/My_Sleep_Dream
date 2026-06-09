import { Modal, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { colors } from "@/constants/colors";

type ReadyToSleepDialogProps = {
  visible: boolean;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReadyToSleepDialog({ visible, confirming, onCancel, onConfirm }: ReadyToSleepDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>真的准备把手机放下了吗？</Text>
          <Text style={styles.body}>
            如果今晚已经收好了，就别再给自己加一轮新内容。按下确认后，我们会把今晚记为准备睡觉。
          </Text>
          <Text style={styles.hint}>接下来只需要关掉 App，灯暗一点，去睡。</Text>
          <View style={styles.actions}>
            <AppButton
              title="我再缓一下"
              variant="ghost"
              onPress={onCancel}
              size="md"
              style={styles.button}
              disabled={confirming}
            />
            <AppButton
              title={confirming ? "正在收尾..." : "放下手机，去睡了"}
              variant="gradient"
              onPress={onConfirm}
              size="md"
              style={styles.button}
              disabled={confirming}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7, 8, 23, 0.74)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  dialog: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceStrong,
    padding: 22,
    gap: 16
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  hint: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  button: {
    flex: 1
  }
});
