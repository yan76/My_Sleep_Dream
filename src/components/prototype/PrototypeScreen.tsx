import { router } from "expo-router";
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

const ARTBOARD_WIDTH = 780;
const ARTBOARD_HEIGHT = 1690;
const MAX_CANVAS_WIDTH = 430;
const bottomNavReservedSpace = 124;

type Hotspot = {
  x: number;
  y: number;
  width: number;
  height: number;
  href?: string;
  onPress?: () => void;
};

type PrototypeScreenProps = {
  source: ImageSourcePropType;
  hotspots?: Hotspot[];
};

export function PrototypeScreen({ source, hotspots = [] }: PrototypeScreenProps) {
  const { width } = useWindowDimensions();
  const canvasWidth = Math.min(width, MAX_CANVAS_WIDTH);
  const scale = canvasWidth / ARTBOARD_WIDTH;
  const canvasHeight = ARTBOARD_HEIGHT * scale;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
        <Image source={source} style={styles.image} resizeMode="stretch" />
        {hotspots.map((hotspot, index) => (
          <Pressable
            key={`${hotspot.href ?? "action"}-${index}`}
            accessibilityRole="button"
            onPress={() => {
              if (hotspot.onPress) {
                hotspot.onPress();
                return;
              }

              if (hotspot.href) {
                router.push(hotspot.href as never);
              }
            }}
            style={[
              styles.hotspot,
              {
                left: hotspot.x * scale,
                top: hotspot.y * scale,
                width: hotspot.width * scale,
                height: hotspot.height * scale
              }
            ]}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050610"
  },
  content: {
    alignItems: "center",
    backgroundColor: "#050610",
    paddingBottom: bottomNavReservedSpace
  },
  canvas: {
    position: "relative",
    backgroundColor: "#050610",
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  hotspot: {
    position: "absolute"
  }
});
