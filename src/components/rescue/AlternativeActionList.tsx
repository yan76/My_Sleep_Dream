import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type AlternativeActionListProps = {
  actions: string[];
  onChoose?: (action: string) => void;
};

export function AlternativeActionList({ actions, onChoose }: AlternativeActionListProps) {
  return (
    <View style={styles.wrap}>
      {actions.map((action, index) => (
        <Pressable key={action} onPress={() => onChoose?.(action)} style={styles.row}>
          <Text style={styles.index}>{index + 1}</Text>
          <Text style={styles.text}>{action}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10
  },
  row: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14
  },
  index: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: colors.surfaceCool,
    color: colors.primaryDark,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "800"
  },
  text: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700"
  }
});
