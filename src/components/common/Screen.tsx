import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.orbitOne} />
      <View pointerEvents="none" style={styles.orbitTwo} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden"
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 18
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 26,
    paddingBottom: 24,
    gap: 22
  },
  orbitOne: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 88,
    borderColor: "rgba(120,132,205,0.1)",
    right: -210,
    top: -70
  },
  orbitTwo: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 72,
    borderColor: "rgba(120,132,205,0.08)",
    right: -118,
    top: 10
  }
});
