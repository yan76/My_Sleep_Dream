import { requireSupabaseClient, getSupabaseClient } from "@/api/supabase";
import {
  getDailyCyclesFromSQLite,
  getDailyCycleFromSQLiteByDate,
  replaceDailyCyclesInSQLite
} from "@/storage/sqlite/dailyCycleRepository";
import {
  getSleepRecordsFromSQLite,
  replaceSleepRecordsInSQLite
} from "@/storage/sqlite/sleepRecordRepository";
import {
  getTodayReviewsFromSQLite,
  replaceTodayReviewsInSQLite
} from "@/storage/sqlite/todayReviewRepository";
import { DailyExecutionRecord, SleepRecord, TodayReview } from "@/types/app";
import { trackAppEvent } from "@/services/analyticsService";
import {
  getPendingSyncItems,
  markSyncAttempt,
  removeSyncItem,
  SyncQueueItem
} from "@/storage/sqlite/syncQueueRepository";

export type CloudSyncResult = {
  status: "unconfigured" | "signed_out" | "synced" | "failed";
  pushed: number;
  pulled: number;
  message?: string;
};

type RemoteDailyCycleRow = {
  id?: string;
  date: string;
  status: DailyExecutionRecord["status"];
  planned_sleep_time: string;
  wake_up_time: string;
  ritual_started_at?: string | null;
  external_closed_at?: string | null;
  review_completed_at?: string | null;
  sleep_aid_started_at?: string | null;
  ready_to_sleep_at?: string | null;
  checkin_completed_at?: string | null;
  feedback_viewed_at?: string | null;
  used_sound_spa?: boolean | null;
  used_tree_hole?: boolean | null;
  used_sleep_generator?: boolean | null;
  shutdown_challenge_count?: number | null;
  rescue_pause_count?: number | null;
  actual_sleep_time?: string | null;
  sleep_result?: DailyExecutionRecord["sleepResult"] | null;
  morning_mood?: DailyExecutionRecord["morningMood"] | null;
  late_reason?: DailyExecutionRecord["lateReason"] | null;
  sleep_audio_enabled?: boolean | null;
  sleep_audio_session_id?: string | null;
  created_at: string;
  updated_at: string;
};

type RemoteTodayReviewRow = {
  id?: string;
  date: string;
  mood?: string | null;
  happened_today: string;
  completed_today: string;
  unfinished_today: string;
  tomorrow_plan: string;
  closing_note: string;
  affirmation?: string | null;
  minimal_mode?: boolean | null;
  created_at: string;
  updated_at: string;
};

type RemoteSleepRecordRow = {
  id?: string;
  date: string;
  planned_sleep_time: string;
  actual_sleep_time?: string | null;
  sleep_result?: "near_target" | "slightly_late" | "very_late" | null;
  morning_mood?: "good" | "okay" | "tired" | null;
  late_reason?: string | null;
  reflection?: string | null;
  created_at: string;
  updated_at: string;
};

const optional = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function dailyCycleToRemote(record: DailyExecutionRecord, userId: string) {
  return {
    user_id: userId,
    date: record.date,
    status: record.status,
    planned_sleep_time: record.plannedSleepTime,
    wake_up_time: record.wakeUpTime,
    ritual_started_at: record.ritualStartedAt ?? null,
    external_closed_at: record.externalClosedAt ?? null,
    review_completed_at: record.reviewCompletedAt ?? null,
    sleep_aid_started_at: record.sleepAidStartedAt ?? null,
    ready_to_sleep_at: record.readyToSleepAt ?? null,
    checkin_completed_at: record.checkinCompletedAt ?? null,
    feedback_viewed_at: record.feedbackViewedAt ?? null,
    used_sound_spa: record.usedSoundSpa,
    used_tree_hole: record.usedTreeHole,
    used_sleep_generator: record.usedSleepGenerator,
    shutdown_challenge_count: record.shutdownChallengeCount,
    rescue_pause_count: record.rescuePauseCount,
    actual_sleep_time: record.actualSleepTime ?? null,
    sleep_result: record.sleepResult ?? null,
    morning_mood: record.morningMood ?? null,
    late_reason: record.lateReason ?? null,
    sleep_audio_enabled: record.sleepAudioEnabled ?? false,
    sleep_audio_session_id: record.sleepAudioSessionId ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt
  };
}

function remoteToDailyCycle(row: RemoteDailyCycleRow): DailyExecutionRecord {
  return {
    date: row.date,
    status: row.status,
    plannedSleepTime: row.planned_sleep_time,
    wakeUpTime: row.wake_up_time,
    ritualStartedAt: optional(row.ritual_started_at),
    externalClosedAt: optional(row.external_closed_at),
    reviewCompletedAt: optional(row.review_completed_at),
    sleepAidStartedAt: optional(row.sleep_aid_started_at),
    readyToSleepAt: optional(row.ready_to_sleep_at),
    checkinCompletedAt: optional(row.checkin_completed_at),
    feedbackViewedAt: optional(row.feedback_viewed_at),
    usedSoundSpa: Boolean(row.used_sound_spa),
    usedTreeHole: Boolean(row.used_tree_hole),
    usedSleepGenerator: Boolean(row.used_sleep_generator),
    shutdownChallengeCount: row.shutdown_challenge_count ?? 0,
    rescuePauseCount: row.rescue_pause_count ?? 0,
    actualSleepTime: optional(row.actual_sleep_time),
    sleepResult: optional(row.sleep_result),
    morningMood: optional(row.morning_mood),
    lateReason: optional(row.late_reason),
    sleepAudioEnabled: Boolean(row.sleep_audio_enabled),
    sleepAudioSessionId: optional(row.sleep_audio_session_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function todayReviewToRemote(review: TodayReview, userId: string, dailyCycleId: string) {
  return {
    user_id: userId,
    daily_cycle_id: dailyCycleId,
    date: review.date,
    mood: review.mood ?? null,
    happened_today: review.happenedToday,
    completed_today: review.completedToday,
    unfinished_today: review.unfinishedToday,
    tomorrow_plan: review.tomorrowPlan,
    closing_note: review.closingNote,
    affirmation: review.affirmation ?? null,
    minimal_mode: Boolean(review.minimalMode),
    created_at: review.createdAt,
    updated_at: review.updatedAt
  };
}

function remoteToTodayReview(row: RemoteTodayReviewRow): TodayReview {
  return {
    id: row.id ?? `today-review:${row.date}`,
    date: row.date,
    sessionId: `daily-cycle:${row.date}`,
    mood: optional(row.mood),
    happenedToday: row.happened_today,
    completedToday: row.completed_today,
    unfinishedToday: row.unfinished_today,
    tomorrowPlan: row.tomorrow_plan,
    closingNote: row.closing_note,
    affirmation: optional(row.affirmation),
    minimalMode: Boolean(row.minimal_mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sleepRecordToRemote(record: SleepRecord, userId: string, dailyCycleId: string) {
  return {
    user_id: userId,
    daily_cycle_id: dailyCycleId,
    date: record.date,
    planned_sleep_time: record.plannedSleepTime,
    actual_sleep_time: record.actualSleepTime ?? null,
    sleep_result: record.success ? "near_target" : "very_late",
    morning_mood: record.moodNextMorning === "精神不错" ? "good" : record.moodNextMorning === "还可以" ? "okay" : null,
    late_reason: record.reasonIfFailed ?? null,
    reflection: record.reasonIfFailed ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt
  };
}

function remoteToSleepRecord(row: RemoteSleepRecordRow): SleepRecord {
  return {
    id: row.id ?? `sleep-record:${row.date}`,
    date: row.date,
    sessionId: `daily-cycle:${row.date}`,
    plannedSleepTime: row.planned_sleep_time,
    actualSleepTime: optional(row.actual_sleep_time),
    success: row.sleep_result === "near_target",
    reasonIfFailed: optional(row.late_reason ?? row.reflection),
    moodNextMorning: row.morning_mood === "good" ? "精神不错" : row.morning_mood === "okay" ? "还可以" : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseQueuePayload<T>(item: SyncQueueItem): T {
  try {
    return JSON.parse(item.payloadJson) as T;
  } catch {
    throw new Error(`同步队列数据无法解析：${item.entityType}/${item.entityId}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 160) : "unknown";
}

async function fetchDailyCycleIdMap(supabase: ReturnType<typeof requireSupabaseClient>): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("daily_cycles")
    .select("id,date")
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [String(row.date), String(row.id)]));
}

async function ensureRemoteDailyCycleId(
  supabase: ReturnType<typeof requireSupabaseClient>,
  userId: string,
  date: string,
  dailyCycleIdByDate: Map<string, string>
): Promise<string> {
  const existing = dailyCycleIdByDate.get(date);
  if (existing) {
    return existing;
  }

  const localDailyCycle = await getDailyCycleFromSQLiteByDate(date);
  if (!localDailyCycle) {
    throw new Error(`找不到 ${date} 对应的每日闭环记录，无法同步关联数据。`);
  }

  const { error: upsertError } = await supabase
    .from("daily_cycles")
    .upsert([dailyCycleToRemote(localDailyCycle, userId)], {
      onConflict: "user_id,date"
    });

  if (upsertError) {
    throw upsertError;
  }

  const { data, error } = await supabase
    .from("daily_cycles")
    .select("id,date")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const id = data?.id ? String(data.id) : "";
  if (!id) {
    throw new Error(`无法确认 ${date} 的云端每日闭环记录。`);
  }

  dailyCycleIdByDate.set(date, id);
  return id;
}

async function pushQueuedItem(
  supabase: ReturnType<typeof requireSupabaseClient>,
  userId: string,
  item: SyncQueueItem,
  dailyCycleIdByDate: Map<string, string>
): Promise<void> {
  if (item.entityType === "daily_cycle") {
    const record = parseQueuePayload<DailyExecutionRecord>(item);
    const query = supabase.from("daily_cycles");

    if (item.operation === "delete") {
      const { error } = await query.delete().eq("user_id", userId).eq("date", item.entityId);
      if (error) throw error;
      dailyCycleIdByDate.delete(item.entityId);
      return;
    }

    const { error } = await query.upsert([dailyCycleToRemote(record, userId)], {
      onConflict: "user_id,date"
    });
    if (error) throw error;
    return;
  }

  if (item.entityType === "today_review") {
    const review = parseQueuePayload<TodayReview>(item);
    const dailyCycleId = await ensureRemoteDailyCycleId(supabase, userId, review.date, dailyCycleIdByDate);
    const query = supabase.from("today_reviews");

    if (item.operation === "delete") {
      const { error } = await query.delete().eq("user_id", userId).eq("date", review.date);
      if (error) throw error;
      return;
    }

    const { error } = await query.upsert([todayReviewToRemote(review, userId, dailyCycleId)], {
      onConflict: "user_id,date"
    });
    if (error) throw error;
    return;
  }

  if (item.entityType === "sleep_record") {
    const record = parseQueuePayload<SleepRecord>(item);
    const dailyCycleId = await ensureRemoteDailyCycleId(supabase, userId, record.date, dailyCycleIdByDate);
    const query = supabase.from("sleep_records");

    if (item.operation === "delete") {
      const { error } = await query.delete().eq("user_id", userId).eq("date", record.date);
      if (error) throw error;
      return;
    }

    const { error } = await query.upsert([sleepRecordToRemote(record, userId, dailyCycleId)], {
      onConflict: "user_id,date"
    });
    if (error) throw error;
    return;
  }

  throw new Error(`未知同步实体：${item.entityType}`);
}

async function pushQueuedItems(
  supabase: ReturnType<typeof requireSupabaseClient>,
  userId: string,
  items: SyncQueueItem[]
): Promise<{ pushed: number; failed: number }> {
  if (items.length === 0) {
    return { pushed: 0, failed: 0 };
  }

  const dailyCycleIdByDate = await fetchDailyCycleIdMap(supabase);
  let pushed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await pushQueuedItem(supabase, userId, item, dailyCycleIdByDate);
      await removeSyncItem(item.id);
      pushed += 1;
    } catch (error) {
      failed += 1;
      await markSyncAttempt(item.id, errorMessage(error));
      trackAppEvent("sync_failed", {
        entityType: item.entityType,
        entityId: item.entityId,
        message: errorMessage(error)
      }).catch(() => undefined);
    }
  }

  return { pushed, failed };
}

export async function syncLocalDataWithCloud(): Promise<CloudSyncResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      status: getSupabaseClient() ? "signed_out" : "unconfigured",
      pushed: 0,
      pulled: 0,
      message: "Supabase 未配置或尚未登录。"
    };
  }

  try {
    const supabase = requireSupabaseClient();
    const [dailyCycles, todayReviews, sleepRecords, queueItems] = await Promise.all([
      getDailyCyclesFromSQLite(),
      getTodayReviewsFromSQLite(),
      getSleepRecordsFromSQLite(),
      getPendingSyncItems()
    ]);

    let pushed = 0;
    let failedQueueItems = 0;

    if (queueItems.length > 0) {
      const queueResult = await pushQueuedItems(supabase, userId, queueItems);
      pushed += queueResult.pushed;
      failedQueueItems = queueResult.failed;

      if (failedQueueItems > 0) {
        return {
          status: "failed",
          pushed,
          pulled: 0,
          message: `${failedQueueItems} 条本地同步任务仍需重试。`
        };
      }
    } else {
      if (dailyCycles.length > 0) {
        const { error } = await supabase
          .from("daily_cycles")
          .upsert(dailyCycles.map((record) => dailyCycleToRemote(record, userId)), {
            onConflict: "user_id,date"
          });
        if (error) throw error;
        pushed += dailyCycles.length;
      }

      const { data: cycleRefs, error: cycleRefError } = await supabase
        .from("daily_cycles")
        .select("id,date")
        .order("date", { ascending: true });
      if (cycleRefError) throw cycleRefError;

      const dailyCycleIdByDate = new Map(
        (cycleRefs ?? []).map((row) => [String(row.date), String(row.id)])
      );

      const syncedTodayReviews = todayReviews.filter((review) => dailyCycleIdByDate.has(review.date));
      const syncedSleepRecords = sleepRecords.filter((record) => dailyCycleIdByDate.has(record.date));

      if (syncedTodayReviews.length > 0) {
        const { error } = await supabase
          .from("today_reviews")
          .upsert(syncedTodayReviews.map((review) =>
            todayReviewToRemote(review, userId, dailyCycleIdByDate.get(review.date)!)
          ), {
            onConflict: "user_id,date"
          });
        if (error) throw error;
        pushed += syncedTodayReviews.length;
      }

      if (syncedSleepRecords.length > 0) {
        const { error } = await supabase
          .from("sleep_records")
          .upsert(syncedSleepRecords.map((record) =>
            sleepRecordToRemote(record, userId, dailyCycleIdByDate.get(record.date)!)
          ), {
            onConflict: "user_id,date"
          });
        if (error) throw error;
        pushed += syncedSleepRecords.length;
      }
    }

    const [remoteDailyCycles, remoteTodayReviews, remoteSleepRecords] = await Promise.all([
      supabase.from("daily_cycles").select("*").order("date", { ascending: true }),
      supabase.from("today_reviews").select("*").order("date", { ascending: true }),
      supabase.from("sleep_records").select("*").order("date", { ascending: true })
    ]);

    if (remoteDailyCycles.error) throw remoteDailyCycles.error;
    if (remoteTodayReviews.error) throw remoteTodayReviews.error;
    if (remoteSleepRecords.error) throw remoteSleepRecords.error;

    const pulledDailyCycles = (remoteDailyCycles.data ?? []).map((row) =>
      remoteToDailyCycle(row as RemoteDailyCycleRow)
    );
    const pulledTodayReviews = (remoteTodayReviews.data ?? []).map((row) =>
      remoteToTodayReview(row as RemoteTodayReviewRow)
    );
    const pulledSleepRecords = (remoteSleepRecords.data ?? []).map((row) =>
      remoteToSleepRecord(row as RemoteSleepRecordRow)
    );

    await Promise.all([
      replaceDailyCyclesInSQLite(pulledDailyCycles, { syncStatus: "synced" }),
      replaceTodayReviewsInSQLite(pulledTodayReviews, { syncStatus: "synced" }),
      replaceSleepRecordsInSQLite(pulledSleepRecords, { syncStatus: "synced" })
    ]);

    return {
      status: "synced",
      pushed,
      pulled: pulledDailyCycles.length + pulledTodayReviews.length + pulledSleepRecords.length
    };
  } catch (error) {
    trackAppEvent("sync_failed", {
      message: error instanceof Error ? error.message.slice(0, 120) : "unknown"
    }).catch(() => undefined);
    return {
      status: "failed",
      pushed: 0,
      pulled: 0,
      message: error instanceof Error ? error.message : "同步失败。"
    };
  }
}
