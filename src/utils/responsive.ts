import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ResponsiveMetrics = {
  width: number;
  height: number;
  safeAreaBottom: number;
  shortestSide: number;
  isCompactWidth: boolean;
  isNarrowPhone: boolean;
  isShortHeight: boolean;
  isLandscape: boolean;
  isTablet: boolean;
  contentMaxWidth: number;
  contentHorizontalPadding: number;
  contentTopPadding: number;
  contentBottomPadding: number;
  contentGap: number;
  contentWidth: number;
  cardPadding: number;
  cardGap: number;
  bottomNavHeight: number;
  bottomNavHorizontalPadding: number;
  bottomNavTopPadding: number;
  bottomNavBottomPadding: number;
  bottomNavReservedSpace: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createResponsiveMetrics(width: number, height: number, safeAreaBottom = 0): ResponsiveMetrics {
  const shortestSide = Math.min(width, height);
  const isLandscape = width > height;
  const isTablet = shortestSide >= 600;
  const isCompactWidth = width < 360;
  const isNarrowPhone = width < 390;
  const isShortHeight = height < 720;
  const contentMaxWidth = isTablet ? 560 : 430;
  const contentHorizontalPadding = isCompactWidth ? 16 : isNarrowPhone ? 20 : isTablet ? 28 : 24;
  const contentTopPadding = isShortHeight ? 18 : isTablet ? 30 : 26;
  const contentBottomPadding = isShortHeight ? 16 : 20;
  const contentGap = isCompactWidth || isShortHeight ? 16 : 20;
  const boundedContentWidth = Math.min(width, contentMaxWidth);
  const contentWidth = Math.max(0, boundedContentWidth - contentHorizontalPadding * 2);
  const bottomNavHeight = isCompactWidth ? 92 : isTablet ? 108 : 104;
  const bottomNavHorizontalPadding = isCompactWidth ? 20 : isNarrowPhone ? 28 : isTablet ? 58 : 42;
  const bottomNavTopPadding = isCompactWidth || isShortHeight ? 12 : 16;
  const bottomNavBottomPadding = Math.max(isCompactWidth ? 12 : 14, safeAreaBottom + 10);
  const bottomNavReservedSpace = bottomNavHeight + safeAreaBottom + (isShortHeight ? 12 : 20);

  return {
    width,
    height,
    safeAreaBottom,
    shortestSide,
    isCompactWidth,
    isNarrowPhone,
    isShortHeight,
    isLandscape,
    isTablet,
    contentMaxWidth,
    contentHorizontalPadding,
    contentTopPadding,
    contentBottomPadding,
    contentGap,
    contentWidth,
    cardPadding: isCompactWidth ? 18 : isShortHeight ? 20 : 22,
    cardGap: isCompactWidth || isShortHeight ? 12 : 14,
    bottomNavHeight,
    bottomNavHorizontalPadding,
    bottomNavTopPadding,
    bottomNavBottomPadding,
    bottomNavReservedSpace: clamp(bottomNavReservedSpace, 108, 150)
  };
}

export function useResponsiveMetrics() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(
    () => createResponsiveMetrics(width, height, insets.bottom),
    [height, insets.bottom, width]
  );
}
