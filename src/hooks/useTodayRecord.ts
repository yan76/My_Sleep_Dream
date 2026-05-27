import { useAppStore } from "@/store/useAppStore";
import { todayKey } from "@/utils/date";

export function useTodayRecord() {
  const record = useAppStore((state) => state.dailyRecords[todayKey()]);
  const ensureTodayRecord = useAppStore((state) => state.ensureTodayRecord);
  return record ?? ensureTodayRecord();
}
