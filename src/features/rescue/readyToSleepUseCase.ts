import { markReadyToSleep as markExecutionReadyToSleep } from "@/storage/dailyExecutionStorage";
import {
  canMarkReadyToSleep,
  markReadyToSleep as markSessionReadyToSleep
} from "@/storage/rescueSessionStorage";

export async function completeReadyToSleepAfterRescue(): Promise<boolean> {
  if (!(await canMarkReadyToSleep())) {
    return false;
  }

  try {
    await markExecutionReadyToSleep();
    await markSessionReadyToSleep();
    return true;
  } catch (error) {
    console.warn("[rescue] Failed to complete ready-to-sleep flow", error);
    return false;
  }
}
