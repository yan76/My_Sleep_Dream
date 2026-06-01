import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "@/constants/colors";

type AppTextInputProps = TextInputProps & {
  label?: string;
};

export function AppTextInput({ label, style, ...props }: AppTextInputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8
  },
  label: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700"
  },
  input: {
    minHeight: 48,
    borderRadius: 22,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: 14,
    fontSize: 16
  },
  multiline: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: "top"
  }
});
