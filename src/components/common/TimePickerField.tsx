import { StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "@/components/common/AppTextInput";
import { colors } from "@/constants/colors";
import { isValidTime } from "@/utils/date";

type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const invalid = value.length > 0 && !isValidTime(value);

  return (
    <View style={styles.wrap}>
      <AppTextInput
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder="23:30"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      {invalid ? <Text style={styles.error}>请输入 24 小时制时间，例如 23:30。</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  error: {
    color: colors.danger,
    fontSize: 13
  }
});
