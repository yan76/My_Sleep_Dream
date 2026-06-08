export type ComplianceSection = {
  id: string;
  title: string;
  body: string;
  bullets: string[];
};

export type PermissionDisclosure = {
  title: string;
  usage: string;
  boundary: string;
};

export const complianceLastUpdated = "2026-06-05";

export const complianceSections: ComplianceSection[] = [
  {
    id: "privacy",
    title: "隐私政策摘要",
    body: "早睡自救局优先在本机保存你的睡前计划、复盘、打卡、提醒和睡眠监听记录。云端同步和 AI 能力只有在服务已配置时才会使用，并且必须保留本地兜底。",
    bullets: [
      "原始睡眠监听音频默认只保存在本机，不上传云端。",
      "云端只同步每日闭环、复盘、打卡、AI 记录和睡眠监听摘要元数据。",
      "你可以在设置页清空本机数据，也可以发起云端账号数据删除。"
    ]
  },
  {
    id: "terms",
    title: "用户协议摘要",
    body: "本产品用于睡前收尾、提醒和自我记录，不替代医生、心理咨询师或其他专业人员的建议。",
    bullets: [
      "请只把它当作生活方式辅助工具，而不是诊断或治疗工具。",
      "AI 输出可能不完整或不准确，重要决定应由你自己或专业人士判断。",
      "如果你遇到紧急风险，请立即联系当地紧急服务或可信任的人。"
    ]
  },
  {
    id: "ai",
    title: "AI 免责声明",
    body: "AI 树洞、睡意生成和周总结会尽量保持温和、非评判、非医疗化。系统会对危机表达和医疗边界内容进行兜底。",
    bullets: [
      "AI 不提供医疗诊断、治疗方案、用药建议或危机干预承诺。",
      "发送到 AI 服务端的上下文会做最小化裁剪，只保留生成所需内容。",
      "本地埋点只记录功能事件，不保存完整私密文本。"
    ]
  },
  {
    id: "sleep-audio",
    title: "睡眠监听说明",
    body: "睡眠监听必须由你主动开启麦克风权限。第一版只做本机录音和安静摘要，不做医学判断。",
    bullets: [
      "你可以随时停止监听，并删除今晚的本机音频文件。",
      "拒绝麦克风权限不会影响其他睡前流程。",
      "睡眠监听结果只作为次日自我回顾线索，不用于判断疾病。"
    ]
  }
];

export const permissionDisclosures: PermissionDisclosure[] = [
  {
    title: "通知权限",
    usage: "用于按你设置的时间发送睡前提醒。",
    boundary: "关闭通知后，App 不会主动推送；你仍可手动开始自救流程。"
  },
  {
    title: "麦克风权限",
    usage: "仅在你主动点击开始监听后，用于本机睡眠监听录音。",
    boundary: "原始音频默认不上云，可在睡眠监听页删除。"
  },
  {
    title: "文件存储",
    usage: "用于保存 App 私有目录内的音频、设置和本地数据。",
    boundary: "当前版本不申请外部文件访问权限。"
  }
];

export const storeListingCopy = {
  appName: "早睡自救局",
  shortDescription: "一个帮你在夜里及时收尾、放下手机、回到睡眠节奏的自救工具。",
  fullDescription:
    "早睡自救局把睡前提醒、晚间复盘、下线挑战、声音 Spa、AI 树洞、睡意生成、次日打卡和成长记录放进一个温和闭环。它适合想减少报复性熬夜、刷屏停不下来、睡前脑子过载的人。产品不提供医疗诊断或治疗建议，睡眠监听音频默认只保存在本机。",
  permissionSummary: "通知用于睡前提醒；麦克风仅用于主动开启的本机睡眠监听；原始音频默认不上云。"
};
