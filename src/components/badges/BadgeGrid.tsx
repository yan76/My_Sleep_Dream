import { View, StyleSheet } from "react-native";
import { BadgeCard } from "@/components/badges/BadgeCard";
import { Badge, BadgeId } from "@/types/app";

export function BadgeGrid({ badges }: { badges: Record<BadgeId, Badge> }) {
  return (
    <View style={styles.wrap}>
      {Object.values(badges).map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12
  }
});
