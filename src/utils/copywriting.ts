import { rescuePhrases } from "@/constants/rescuePhrases";

export function getRescuePhrase(): string {
  const index = new Date().getDate() % rescuePhrases.length;
  return rescuePhrases[index];
}
