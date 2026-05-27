import { Badge } from "@/types/app";

export const badgeDefinitions: Badge[] = [
  {
    id: "first_contract",
    title: "第一次立约",
    description: "给今晚定下一个能做到的边界。",
    unlocked: false
  },
  {
    id: "first_on_time_sleep",
    title: "第一次按时睡",
    description: "你把今晚稳稳收住了一次。",
    unlocked: false
  },
  {
    id: "three_day_streak",
    title: "连续 3 天",
    description: "连续三天按计划结束夜晚。",
    unlocked: false
  },
  {
    id: "seven_day_streak",
    title: "连续 7 天",
    description: "一周的节奏开始站住了。",
    unlocked: false
  },
  {
    id: "first_rescue",
    title: "第一次拉回",
    description: "有冲动时，你没有让它一路滑到底。",
    unlocked: false
  },
  {
    id: "less_late_week",
    title: "少晚一点",
    description: "最近一周，晚睡天数控制在 2 天以内。",
    unlocked: false
  }
];
