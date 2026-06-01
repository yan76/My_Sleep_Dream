import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { Badge } from "@/types/app";

type BadgePreviewProps = {
  badges: Badge[];
};

export function BadgePreview({ badges }: BadgePreviewProps) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const sorted = [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return 0;
  });

  return (
    <AppCard>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>成就徽章</Text>
          <Text style={styles.count}>
            {unlockedCount}/{badges.length}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/badges")}>
          <Text style={styles.viewAll}>查看全部 ›</Text>
        </Pressable>
      </View>

      {/* Badge Row */}
      {badges.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {sorted.slice(0, 5).map((badge) => (
            <View key={badge.id} style={styles.badgeItem}>
              <View
                style={[
                  styles.badgeIcon,
                  badge.unlocked && styles.badgeIconActive
                ]}
              >
                <Text style={styles.badgeStar}>
                  {badge.unlocked ? "✦" : "☆"}
                </Text>
              </View>
              <Text
                style={[
                  styles.badgeName,
                  badge.unlocked && styles.badgeNameActive
                ]}
                numberOfLines={1}
              >
                {badge.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>还没有获得徽章，完成自救后会陆续解锁。</Text>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  count: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden"
  },
  viewAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700"
  },
  badgeRow: {
    gap: 16,
    paddingVertical: 8
  },
  badgeItem: {
    alignItems: "center",
    gap: 8,
    width: 72
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeIconActive: {
    backgroundColor: colors.accent + "30"
  },
  badgeStar: {
    fontSize: 22,
    color: colors.accent
  },
  badgeName: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center" as const
  },
  badgeNameActive: {
    color: colors.ink
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
