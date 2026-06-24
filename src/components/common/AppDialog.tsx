import { Modal, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { colors } from "@/constants/colors";

type AppDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmTitle?: string;
  cancelTitle?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function AppDialog({
  visible,
  title,
  body,
  confirmTitle = "确定",
  cancelTitle,
  onConfirm,
  onCancel
}: AppDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {onCancel ? (
            <View style={styles.actions}>
              <AppButton title={cancelTitle ?? "取消"} variant="ghost" onPress={onCancel} size="md" style={styles.actionButton} />
              <AppButton title={confirmTitle} variant="gradient" onPress={onConfirm} size="md" style={styles.actionButton} />
            </View>
          ) : (
            <AppButton title={confirmTitle} variant="gradient" onPress={onConfirm} size="md" />
          )}
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
  actions: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1
  }
});
