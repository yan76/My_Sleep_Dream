import { SleepAidPreference } from "@/types/app";

export type SleepAidOption = {
  id: SleepAidPreference;
  label: string;
  description: string;
  route: "/bedtime" | "/tree-hole";
};

export const defaultSleepAidPreferences: SleepAidPreference[] = ["sound_spa", "suggestion", "white_noise"];

export const sleepAidOptions: SleepAidOption[] = [
  {
    id: "sound_spa",
    label: "声音 Spa",
    description: "用稳定的声音慢慢降速。",
    route: "/bedtime"
  },
  {
    id: "suggestion",
    label: "心理暗示",
    description: "给自己一句柔和的收束语。",
    route: "/bedtime"
  },
  {
    id: "tree_hole",
    label: "AI 树洞",
    description: "把脑子里的话先放出来。",
    route: "/tree-hole"
  },
  {
    id: "white_noise",
    label: "白噪音",
    description: "让夜晚有一个安静底色。",
    route: "/bedtime"
  },
  {
    id: "asmr",
    label: "ASMR 助眠",
    description: "预留更沉浸的助眠内容。",
    route: "/bedtime"
  }
];
