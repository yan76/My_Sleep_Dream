import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { GradientLayer } from "@/components/common/GradientLayer";
import type { GrowthDimension } from "@/utils/growth";

const ARTBOARD_WIDTH = 750;
const CONTENT_HEIGHT = 1541;

const galaxyCard = require("../../../assets/generated/yueban-all-growth-ui/assets/charts/chart-all-growth-galaxy-01.png");
const compareCard = require("../../../assets/generated/yueban-all-growth-ui/assets/images/image-all-growth-compare-card-01.png");
const quoteMoon = require("../../../assets/generated/yueban-all-growth-ui/assets/illustrations/illustration-all-growth-quote-moon-01.png");
const backIcon = require("../../../assets/generated/yueban-all-growth-ui/assets/icons/icon-all-growth-back-01.png");
const testPlusIcon = require("../../../assets/generated/yueban-all-growth-ui/assets/icons/icon-all-growth-test-plus-01.png");
const firstReviewIcon = require("../../../assets/generated/yueban-all-growth-ui/assets/icons/icon-all-growth-first-review-01.png");
const sevenNightIcon = require("../../../assets/generated/yueban-all-growth-ui/assets/icons/icon-all-growth-seven-night-01.png");
const hundredNightIcon = require("../../../assets/generated/yueban-all-growth-ui/assets/icons/icon-all-growth-hundred-night-01.png");
const saveIcon = require("../../../assets/generated/yueban-all-growth-ui/assets/icons/icon-all-growth-save-01.png");

type AllGrowthCanvasProps = {
  viewportWidth: number;
  seeding: boolean;
  showTestData: boolean;
  onBack: () => void;
  onChangePeriod: (period: GrowthDimension) => void;
  onAddTestData: () => void;
  onOpenJournal: () => void;
  onOpenBadges: () => void;
  onSave: () => void;
};

const periodItems: { key: GrowthDimension; label: string }[] = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "all", label: "全部" }
];

const moments = [
  {
    key: "first-review",
    image: firstReviewIcon,
    title: "第一次复盘",
    body: "你开始愿意看看那晚的自己",
    date: "2025.10.03"
  },
  {
    key: "seven-night",
    image: sevenNightIcon,
    title: "连续 7 晚",
    body: "节奏开始建立，你看见了变化",
    date: "2025.11.02 - 11.08"
  },
  {
    key: "hundred-night",
    image: hundredNightIcon,
    title: "第 100 个夜晚",
    body: "坚持照顾自己，你为自己感到骄傲",
    date: "2025.12.27"
  }
];

export function AllGrowthCanvas({
  viewportWidth,
  seeding,
  showTestData,
  onBack,
  onChangePeriod,
  onAddTestData,
  onOpenJournal,
  onOpenBadges,
  onSave
}: AllGrowthCanvasProps) {
  const scale = Math.min(1, viewportWidth / ARTBOARD_WIDTH);
  const canvasTransform = {
    transform: [{ scale }],
    transformOrigin: "top left"
  } as ViewStyle;

  return (
    <View style={[styles.scaledFrame, { width: ARTBOARD_WIDTH * scale, height: CONTENT_HEIGHT * scale }]}>
      <View style={[styles.canvas, canvasTransform]}>
        <View pointerEvents="none" style={styles.backgroundGlowTop} />
        <View pointerEvents="none" style={styles.backgroundGlowRight} />
        <View pointerEvents="none" style={styles.heroPlanet}>
          <View style={styles.heroPlanetRingOuter} />
          <View style={styles.heroPlanetRingInner} />
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={onBack} style={styles.backButton}>
          <Image source={backIcon} style={styles.backIcon} resizeMode="contain" />
          <Text style={styles.backText}>返回</Text>
        </Pressable>

        <View style={styles.periodControl}>
          <View pointerEvents="none" style={styles.periodSelected} />
          <View pointerEvents="none" style={styles.periodDividerOne} />
          <View pointerEvents="none" style={styles.periodDividerTwo} />
          {periodItems.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: item.key === "all" }}
              onPress={() => onChangePeriod(item.key)}
              style={[styles.periodButton, { left: index * 108 }]}
            >
              <Text style={[styles.periodText, item.key === "all" && styles.periodTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {showTestData ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={seeding ? "测试数据生成中" : "新增测试数据"}
            disabled={seeding}
            onPress={onAddTestData}
            style={[styles.testButton, seeding && styles.testButtonDisabled]}
          >
            <Image source={testPlusIcon} style={styles.testPlusIcon} resizeMode="contain" />
            <Text style={styles.testButtonText}>{seeding ? "生成中..." : "新增测试数据"}</Text>
          </Pressable>
        ) : null}

        <View style={styles.eyebrowDot} />
        <Text style={styles.eyebrowText}>全部成长</Text>
        <Text style={styles.heroTitle}>这一整片星河，{"\n"}都是你认真生活过的夜晚</Text>
        <Text style={styles.heroSubtitle}>从第一次记录到今天，每个月都留下了不同的光。</Text>

        <Image source={galaxyCard} style={styles.galaxyCard} resizeMode="stretch" />
        <Image source={compareCard} style={styles.compareCard} resizeMode="stretch" />

        <Text style={styles.momentsHeading}>最亮的三个时刻</Text>
        <View style={styles.momentsCard}>
          <View pointerEvents="none" style={styles.momentDividerOne} />
          <View pointerEvents="none" style={styles.momentDividerTwo} />
          {moments.map((moment, index) => (
            <Pressable
              key={moment.key}
              accessibilityRole="button"
              accessibilityLabel={`${moment.title}，${moment.body}，${moment.date}`}
              onPress={index === 0 ? onOpenJournal : onOpenBadges}
              style={[
                styles.momentRow,
                index === 0 ? styles.momentRowFirst : index === 1 ? styles.momentRowSecond : styles.momentRowThird
              ]}
            >
              <Image
                source={moment.image}
                style={index === 0 ? styles.firstMomentIcon : index === 1 ? styles.secondMomentIcon : styles.thirdMomentIcon}
                resizeMode="contain"
              />
              <View style={styles.momentCopy}>
                <Text style={styles.momentTitle}>{moment.title}</Text>
                <Text style={styles.momentBody}>{moment.body}</Text>
              </View>
              <Text style={styles.momentDate}>{moment.date}</Text>
              <Text style={styles.momentChevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.quoteCard}>
          <Image source={quoteMoon} style={styles.quoteMoon} resizeMode="stretch" />
          <View pointerEvents="none" style={styles.quoteMoonFade} />
          <Text style={styles.quoteTitle}>你是值得骄傲的，{"\n"}不是从未失控，{"\n"}而是一次次重新把自己带回来。</Text>
          <Text style={styles.quoteBody}>每一次重新开始，都是在为明天的自己铺路。</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="保存我的全部成长" onPress={onSave} style={styles.saveButton}>
          <GradientLayer
            stops={[
              { color: "#FFE1A9", location: 0 },
              { color: "#F2E5D5", location: 0.34 },
              { color: "#C8C7FF", location: 0.7 },
              { color: "#7E8BFF", location: 1 }
            ]}
          />
          <Image source={saveIcon} style={styles.saveIcon} resizeMode="contain" />
          <Text style={styles.saveText}>保存我的全部成长</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaledFrame: {
    alignSelf: "center",
    overflow: "hidden"
  },
  canvas: {
    width: ARTBOARD_WIDTH,
    height: CONTENT_HEIGHT,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#030919"
  },
  backgroundGlowTop: {
    position: "absolute",
    left: -150,
    top: -180,
    width: 510,
    height: 510,
    borderRadius: 255,
    backgroundColor: "#0A1737",
    opacity: 0.5
  },
  backgroundGlowRight: {
    position: "absolute",
    right: -250,
    top: 160,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "#20125F",
    opacity: 0.22
  },
  heroPlanet: {
    position: "absolute",
    left: 599,
    top: 200,
    width: 151,
    height: 92,
    overflow: "hidden",
    opacity: 0.7
  },
  heroPlanetRingOuter: {
    position: "absolute",
    left: 4,
    top: 2,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "rgba(105,83,255,0.5)",
    backgroundColor: "rgba(75,42,190,0.1)"
  },
  heroPlanetRingInner: {
    position: "absolute",
    left: 20,
    top: 18,
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(70,42,170,0.2)"
  },
  backButton: {
    position: "absolute",
    left: 29,
    top: 21,
    width: 111,
    height: 53,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(224,226,246,0.28)",
    backgroundColor: "rgba(18,24,44,0.6)"
  },
  backIcon: {
    position: "absolute",
    left: 17,
    top: 12,
    width: 22,
    height: 28
  },
  backText: {
    position: "absolute",
    left: 42,
    top: 13,
    color: "#F5F5FF",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800"
  },
  periodControl: {
    position: "absolute",
    left: 392,
    top: 21,
    width: 324,
    height: 55,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(231,220,206,0.34)",
    backgroundColor: "rgba(13,18,36,0.74)",
    overflow: "hidden"
  },
  periodSelected: {
    position: "absolute",
    left: 223,
    top: 6,
    width: 91,
    height: 44,
    borderRadius: 23,
    backgroundColor: "#F5DDAF"
  },
  periodDividerOne: {
    position: "absolute",
    left: 108,
    top: 15,
    width: 1,
    height: 25,
    backgroundColor: "rgba(183,185,205,0.2)"
  },
  periodDividerTwo: {
    position: "absolute",
    left: 216,
    top: 15,
    width: 1,
    height: 25,
    backgroundColor: "rgba(183,185,205,0.2)"
  },
  periodButton: {
    position: "absolute",
    top: 0,
    width: 108,
    height: 55,
    alignItems: "center",
    justifyContent: "center"
  },
  periodText: {
    color: "#959AB2",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800"
  },
  periodTextActive: {
    color: "#10101B"
  },
  testButton: {
    position: "absolute",
    left: 557,
    top: 94,
    width: 153,
    height: 40,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(230,197,145,0.43)",
    backgroundColor: "rgba(21,23,39,0.8)"
  },
  testButtonDisabled: {
    opacity: 0.55
  },
  testPlusIcon: {
    position: "absolute",
    left: 13,
    top: 5,
    width: 27,
    height: 27
  },
  testButtonText: {
    position: "absolute",
    left: 43,
    top: 8,
    color: "#E8C790",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  eyebrowDot: {
    position: "absolute",
    left: 39,
    top: 106,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#F1D29B"
  },
  eyebrowText: {
    position: "absolute",
    left: 61,
    top: 101,
    color: "#F2D5A2",
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "800"
  },
  heroTitle: {
    position: "absolute",
    left: 39,
    top: 141,
    width: 520,
    color: "#F8F7FF",
    fontSize: 35,
    lineHeight: 49,
    fontWeight: "900",
    letterSpacing: 0
  },
  heroSubtitle: {
    position: "absolute",
    left: 39,
    top: 247,
    width: 500,
    color: "#999EB5",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600"
  },
  galaxyCard: {
    position: "absolute",
    left: 29,
    top: 284,
    width: 686,
    height: 534
  },
  compareCard: {
    position: "absolute",
    left: 29,
    top: 829,
    width: 686,
    height: 258
  },
  momentsHeading: {
    position: "absolute",
    left: 39,
    top: 1103,
    color: "#F4F4FF",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900"
  },
  momentsCard: {
    position: "absolute",
    left: 29,
    top: 1135,
    width: 686,
    height: 191,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(225,211,193,0.28)",
    backgroundColor: "rgba(17,23,42,0.78)",
    overflow: "hidden"
  },
  momentDividerOne: {
    position: "absolute",
    left: 86,
    right: 25,
    top: 63,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  momentDividerTwo: {
    position: "absolute",
    left: 86,
    right: 25,
    top: 127,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  momentRow: {
    position: "absolute",
    left: 0,
    width: 686,
    height: 64
  },
  momentRowFirst: {
    top: 0
  },
  momentRowSecond: {
    top: 64
  },
  momentRowThird: {
    top: 128
  },
  firstMomentIcon: {
    position: "absolute",
    left: 21,
    top: 5,
    width: 63,
    height: 63
  },
  secondMomentIcon: {
    position: "absolute",
    left: 21,
    top: 4,
    width: 63,
    height: 63
  },
  thirdMomentIcon: {
    position: "absolute",
    left: 17,
    top: -2,
    width: 72,
    height: 69
  },
  momentCopy: {
    position: "absolute",
    left: 94,
    top: 8,
    width: 345,
    height: 50
  },
  momentTitle: {
    color: "#F3F3FF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  momentBody: {
    color: "#9298B1",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600"
  },
  momentDate: {
    position: "absolute",
    right: 60,
    top: 20,
    color: "#9CA1B9",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "right"
  },
  momentChevron: {
    position: "absolute",
    right: 26,
    top: 13,
    color: "#A4A9C0",
    fontSize: 31,
    lineHeight: 35,
    fontWeight: "300"
  },
  quoteCard: {
    position: "absolute",
    left: 29,
    top: 1337,
    width: 686,
    height: 131,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(225,211,193,0.28)",
    backgroundColor: "#101528",
    overflow: "hidden"
  },
  quoteMoon: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 254,
    height: 129
  },
  quoteMoonFade: {
    position: "absolute",
    left: 205,
    top: 0,
    width: 95,
    height: 131,
    backgroundColor: "rgba(16,21,40,0.7)"
  },
  quoteTitle: {
    position: "absolute",
    left: 261,
    top: 11,
    width: 385,
    color: "#F2D59E",
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: 1
  },
  quoteBody: {
    position: "absolute",
    left: 261,
    top: 100,
    width: 370,
    color: "#9298B0",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  },
  saveButton: {
    position: "absolute",
    left: 36,
    top: 1480,
    width: 676,
    height: 56,
    borderRadius: 29,
    overflow: "hidden",
    backgroundColor: "#C7C5F1"
  },
  saveIcon: {
    position: "absolute",
    left: 196,
    top: 7,
    width: 43,
    height: 43
  },
  saveText: {
    position: "absolute",
    left: 253,
    top: 12,
    color: "#10101B",
    fontSize: 23,
    lineHeight: 32,
    fontWeight: "900"
  }
});
