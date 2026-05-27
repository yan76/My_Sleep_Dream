import { LateNightReason } from "@/types/app";

export const lateNightReasons: { id: LateNightReason; label: string }[] = [
  { id: "short_video", label: "短视频" },
  { id: "social_media", label: "社交软件" },
  { id: "gaming", label: "游戏" },
  { id: "drama", label: "追剧 / 小说" },
  { id: "work_study", label: "工作 / 学习" },
  { id: "revenge_bedtime", label: "报复性熬夜" },
  { id: "anxiety", label: "焦虑停不下来" },
  { id: "other", label: "其他" }
];
