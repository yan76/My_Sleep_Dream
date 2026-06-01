import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "@/constants/colors";

type SoftInputPanelProps = TextInputProps & {
  label?: string;
  hasError?: boolean;
};

const webInputFocusReset =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as TextInputProps["style"]) : undefined;

export function SoftInputPanel({ label, hasError, style, ...props }: SoftInputPanelProps) {
  return (
    <View style={[styles.panel, hasError && styles.panelError]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        multiline
        placeholderTextColor={colors.muted}
        style={[styles.input, webInputFocusReset, style]}
        textAlignVertical="top"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    minHeight: 148,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10
  },
  panelError: {
    borderColor: colors.danger
  },
  label: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800"
  },
  input: {
    flex: 1,
    minHeight: 94,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 26,
    padding: 0
  }
});
