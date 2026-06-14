import { StyleSheet, Text, View } from "react-native";
import { BadgeCard } from "@/components/badges/BadgeCard";
import {
  AchievementBadge,
  badgeCategoryLabels,
  badgeCategoryOrder
} from "@/features/badges/badgeData";
import { colors } from "@/constants/colors";

export function BadgeGrid({ badges }: { badges: AchievementBadge[] }) {
  return (
    <View style={styles.wrap}>
      {badgeCategoryOrder.map((category) => {
        const categoryBadges = badges.filter((badge) => badge.category === category);

        if (categoryBadges.length === 0) {
          return null;
        }

        return (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{badgeCategoryLabels[category]}</Text>
            <View style={styles.sectionList}>
              {categoryBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 18
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
    paddingHorizontal: 4
  },
  sectionList: {
    gap: 12
  }
});
