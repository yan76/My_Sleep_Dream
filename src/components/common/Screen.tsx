import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

const bottomNavReservedSpace = 124;

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.orbLayer}>
        <View style={styles.orbitOne} />
        <View style={styles.orbitTwo} />
        <View style={styles.orbitThree} />
        <View style={styles.orbitFour} />
      </View>
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
  orbLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: "hidden"
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: bottomNavReservedSpace
  },
  content: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    gap: 20
  },
  orbitOne: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 88,
    borderColor: colors.glowBlue,
    right: -210,
    top: -70
  },
  orbitTwo: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 72,
    borderColor: colors.glowBlue,
    right: -118,
    top: 10
  },
  orbitThree: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 60,
    borderColor: colors.glowGold,
    left: -200,
    bottom: -80
  },
  orbitFour: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 50,
    borderColor: colors.glowGreen,
    left: -90,
    bottom: 40
    // 移除 View 级 opacity，glowGreen 已是纯色 hex
  }
});
