import { DailyExecutionRecord, RescueSession, UserConfig } from "@/types/app";
import { dailyCycleAtLeast } from "@/utils/dailyCycle";
import { getReasonBasedRescueHint } from "@/utils/sleepPreferences";

export type RescueData = {
  session: RescueSession | null;
  executionRecord: DailyExecutionRecord | null;
  userConfig: UserConfig;
};

export type FlowStepId = "external" | "review" | "sleep";
export type StepState = "done" | "active" | "locked";

export type FlowStep = {
  id: FlowStepId;
  title: string;
  body: string;
  state: StepState;
};

export type RescueViewModel = {
  title: string;
  subtitle: string;
  statusLabel: string;
  primaryTitle: string;
  primaryBody: string;
  primaryButton: string;
  completed: boolean;
  steps: FlowStep[];
};

function getStepState(
  id: FlowStepId,
  session: RescueSession | null,
  executionRecord: DailyExecutionRecord | null
): StepState {
  const externalDone = dailyCycleAtLeast(executionRecord, "external_closed") || (session?.ritualStep ?? 0) >= 1;
  const reviewDone = dailyCycleAtLeast(executionRecord, "review_completed") || Boolean(session?.todayReviewCompleted);
  const sleepDone =
    dailyCycleAtLeast(executionRecord, "sleep_aid_started") ||
    Boolean(session?.sleepGeneratorUsed || session?.relaxModeUsed || session?.treeHoleUsed);
  const readyToSleep = dailyCycleAtLeast(executionRecord, "ready_to_sleep") || session?.status === "ready_to_sleep";

  if (id === "external") {
    return externalDone || reviewDone || sleepDone || readyToSleep ? "done" : "active";
  }

  if (id === "review") {
    if (reviewDone || sleepDone || readyToSleep) {
      return "done";
    }
    return externalDone ? "active" : "locked";
  }

  if (sleepDone || readyToSleep) {
    return "done";
  }

  return reviewDone ? "active" : "locked";
}

export function buildRescueViewModel(
  session: RescueSession | null,
  executionRecord: DailyExecutionRecord | null,
  userConfig?: UserConfig
): RescueViewModel {
  const rescueHint = getReasonBasedRescueHint(userConfig?.lateNightReasons ?? []);
  const steps: FlowStep[] = [
    {
      id: "external",
      title: "收住外界",
      body: rescueHint,
      state: getStepState("external", session, executionRecord)
    },
    {
      id: "review",
      title: "把今天放下",
      body: "写一句也可以，把占脑子的事先放到这里。",
      state: getStepState("review", session, executionRecord)
    },
    {
      id: "sleep",
      title: "进入睡意",
      body: "选一种声音、暗示或树洞，让身体慢慢松下来。",
      state: getStepState("sleep", session, executionRecord)
    }
  ];

  if (dailyCycleAtLeast(executionRecord, "ready_to_sleep") || session?.status === "ready_to_sleep") {
    return {
      title: "今晚已经可以停在这里",
      subtitle: "今天已经收好了，接下来不用继续证明什么。",
      statusLabel: "准备睡觉",
      primaryTitle: "今晚闭环完成",
      primaryBody: "明早醒来后，再轻轻补一笔昨晚结果就好。",
      primaryButton: "回到首页",
      completed: true,
      steps
    };
  }

  if (
    dailyCycleAtLeast(executionRecord, "sleep_aid_started") ||
    session?.sleepGeneratorUsed ||
    session?.relaxModeUsed ||
    session?.treeHoleUsed
  ) {
    return {
      title: "睡意已经被请进来了",
      subtitle: "现在不用努力睡着，只要别再把脑子重新点亮。",
      statusLabel: "进入睡意",
      primaryTitle: "把今晚收住",
      primaryBody: "如果身体已经松下来，就把今晚停在这里。",
      primaryButton: "我准备睡了",
      completed: false,
      steps
    };
  }

  if (dailyCycleAtLeast(executionRecord, "review_completed") || session?.todayReviewCompleted) {
    return {
      title: "今天已经被放下了一点",
      subtitle: "做完的、没做完的，都先放在这里。现在换一种方式进入睡意。",
      statusLabel: "把今天放下",
      primaryTitle: "进入睡意",
      primaryBody: "选择声音 Spa、心理暗示或树洞，把注意力从脑子里带出来。",
      primaryButton: "进入睡意生成器",
      completed: false,
      steps
    };
  }

  if (
    dailyCycleAtLeast(executionRecord, "external_closed") ||
    (session?.ritualStep ?? 0) >= 1 ||
    session?.status === "in_rescue_flow"
  ) {
    return {
      title: "外界先收住了",
      subtitle: "下一步不用写很多，只要把今天从脑子里挪出来一点。",
      statusLabel: "收住外界",
      primaryTitle: "把今天放下",
      primaryBody: "今天的故事、遗憾和明天一件小事，都可以先放在这里。",
      primaryButton: "去把今天放下",
      completed: false,
      steps
    };
  }

  return {
    title: "先把今晚往回带一点",
    subtitle: "不用立刻睡，也不用立刻变自律。先别再开新的内容。",
    statusLabel: session ? "今晚自救" : "还没开始",
    primaryTitle: "收住外界",
    primaryBody: rescueHint,
    primaryButton: "先把外界收住",
    completed: false,
    steps
  };
}
