import { appStorage } from "@/storage/appStorage";
import { storageKeys } from "@/storage/storageKeys";
import { SafetyLabel } from "@/services/aiSafety";

export type AiGeneratedOutputMode = "sleep_script" | "weekly_summary";
export type AiGeneratedOutputSource = "cloud" | "fallback";

export type AiGeneratedOutput = {
  id: string;
  mode: AiGeneratedOutputMode;
  date: string;
  title: string;
  content: string;
  source: AiGeneratedOutputSource;
  safetyLabel: SafetyLabel;
  remoteId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const MAX_OUTPUTS = 60;

async function readOutputs(): Promise<AiGeneratedOutput[]> {
  try {
    const value = await appStorage.getItem(storageKeys.aiGeneratedOutputs);
    return value ? (JSON.parse(value) as AiGeneratedOutput[]) : [];
  } catch (error) {
    console.warn("[storage] Failed to read AI generated outputs", error);
    return [];
  }
}

async function writeOutputs(outputs: AiGeneratedOutput[]): Promise<void> {
  try {
    await appStorage.setItem(storageKeys.aiGeneratedOutputs, JSON.stringify(outputs.slice(0, MAX_OUTPUTS)));
  } catch (error) {
    console.warn("[storage] Failed to write AI generated outputs", error);
  }
}

export async function saveAiGeneratedOutput(
  output: Omit<AiGeneratedOutput, "id" | "createdAt">
): Promise<AiGeneratedOutput> {
  const next: AiGeneratedOutput = {
    ...output,
    id: `${output.mode}:${output.date}:${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const current = await readOutputs();
  await writeOutputs([next, ...current]);
  return next;
}

export async function getAiGeneratedOutputs(mode?: AiGeneratedOutputMode): Promise<AiGeneratedOutput[]> {
  const outputs = await readOutputs();
  return mode ? outputs.filter((output) => output.mode === mode) : outputs;
}

export async function getLatestAiGeneratedOutput(mode: AiGeneratedOutputMode): Promise<AiGeneratedOutput | null> {
  const outputs = await getAiGeneratedOutputs(mode);
  return outputs[0] ?? null;
}
