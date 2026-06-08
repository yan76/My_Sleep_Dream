export type SafetyLabel = "normal" | "sensitive" | "crisis" | "medical_boundary";

const crisisPatterns = [
  /自杀|轻生|不想活|活不下去|结束生命|伤害自己|自残/,
  /suicide|kill myself|end my life|self[-\s]?harm/i
];

const medicalBoundaryPatterns = [
  /诊断|治疗|疗法|药物|药量|安眠药|处方|抑郁症|焦虑症|双相|创伤后应激/,
  /diagnos|therapy|therapist|medicine|medication|dosage|prescription|depression|anxiety|ptsd|bipolar/i
];

const sensitivePatterns = [
  /崩溃|绝望|撑不住|恐慌|惊恐|失控|痛苦/,
  /panic|despair|breakdown|hopeless|out of control/i
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function getSafetyLabel(text: string): SafetyLabel {
  if (matchesAny(text, crisisPatterns)) {
    return "crisis";
  }

  if (matchesAny(text, medicalBoundaryPatterns)) {
    return "medical_boundary";
  }

  if (matchesAny(text, sensitivePatterns)) {
    return "sensitive";
  }

  return "normal";
}

export function createCrisisSafetyReply(): string {
  return "我听见你现在真的很难受。这个时刻请先不要一个人扛着，尽快联系身边可信任的人，或拨打当地紧急求助电话。先让自己去到有人的地方，把手机放在手边，好吗？";
}

export function createMedicalBoundaryNote(): string {
  return "我可以陪你做睡前收束和情绪安放，但不能提供医疗诊断、药物剂量或心理治疗建议。如果你正在经历持续失眠、强烈焦虑或身体不适，请联系专业医生或心理健康服务。";
}

export function applySafetyBoundary(text: string, safetyLabel: SafetyLabel): string {
  if (safetyLabel === "crisis") {
    return createCrisisSafetyReply();
  }

  if (safetyLabel === "medical_boundary") {
    return `${createMedicalBoundaryNote()}\n\n今晚我们先只做一件温和的小事：把灯调暗，放下屏幕，给身体一个不用继续解决问题的信号。`;
  }

  return text;
}
