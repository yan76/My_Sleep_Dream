import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

type GradientStop = {
  color: string;
  location?: number;
};

type GradientLayerProps = {
  direction?: "horizontal" | "vertical";
  stops: GradientStop[];
  style?: StyleProp<ViewStyle>;
};

export function GradientLayer({ direction = "horizontal", stops, style }: GradientLayerProps) {
  const normalizedStops = stops.length >= 2 ? stops : [...stops, ...stops];
  const colors = normalizedStops.map((stop) => stop.color) as [string, string, ...string[]];
  const locations = normalizedStops.every((stop) => stop.location !== undefined)
    ? (normalizedStops.map((stop) => stop.location ?? 0) as [number, number, ...number[]])
    : undefined;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      locations={locations}
      start={direction === "vertical" ? { x: 0.5, y: 0 } : { x: 0, y: 0.5 }}
      end={direction === "vertical" ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 }}
      style={[styles.base, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden"
  }
});
