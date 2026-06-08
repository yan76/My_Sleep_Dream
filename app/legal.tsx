import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import {
  complianceLastUpdated,
  complianceSections,
  permissionDisclosures,
  storeListingCopy
} from "@/constants/compliance";
import { colors } from "@/constants/colors";

export default function LegalScreen() {
  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.ghost} onPress={() => router.replace("/settings")}>
          <Text style={styles.ghostText}>返回设置</Text>
        </Pressable>
      </View>

      <PageHeader
        eyebrow="合规与安全"
        title="把边界讲清楚"
        subtitle={`最后更新：${complianceLastUpdated}。这些说明用于上线审核，也用于让你知道数据和权限会怎样被使用。`}
      />

      {complianceSections.map((section) => (
        <AppCard key={section.id} tone={section.id === "sleep-audio" ? "cool" : "plain"}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
          <View style={styles.bulletList}>
            {section.bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={styles.bullet}>{bullet}</Text>
              </View>
            ))}
          </View>
        </AppCard>
      ))}

      <AppCard tone="lavender">
        <Text style={styles.cardTitle}>权限说明</Text>
        {permissionDisclosures.map((permission) => (
          <View key={permission.title} style={styles.permissionItem}>
            <Text style={styles.permissionTitle}>{permission.title}</Text>
            <Text style={styles.body}>{permission.usage}</Text>
            <Text style={styles.muted}>{permission.boundary}</Text>
          </View>
        ))}
      </AppCard>

      <AppCard tone="warm">
        <Text style={styles.cardTitle}>商店展示文案</Text>
        <Text style={styles.permissionTitle}>{storeListingCopy.appName}</Text>
        <Text style={styles.body}>{storeListingCopy.shortDescription}</Text>
        <Text style={styles.muted}>{storeListingCopy.permissionSummary}</Text>
      </AppCard>

      <View style={styles.actionStack}>
        <AppButton title="回到设置" variant="gradient" onPress={() => router.replace("/settings")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 42,
    alignItems: "flex-start"
  },
  ghost: {
    minHeight: 34,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15
  },
  ghostText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  bulletList: {
    gap: 10
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 8
  },
  bullet: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800"
  },
  permissionItem: {
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 13
  },
  permissionTitle: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  actionStack: {
    gap: 12
  }
});
