import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import {
  markReadyToSleep,
  markTreeHoleUsed
} from "@/storage/rescueSessionStorage";
import {
  markReadyToSleep as markExecutionReadyToSleep,
  markSleepAidStarted
} from "@/storage/dailyExecutionStorage";
import {
  sendTreeHoleMessage,
  TreeHoleMessage
} from "@/services/aiChatService";

type DisplayMessage = TreeHoleMessage & {
  id: string;
  source?: "cloud" | "fallback";
};

const openingMessage: DisplayMessage = {
  id: "opening",
  role: "assistant",
  content: "我在。你不用把事情讲完整，先把最占脑子的那一句放在这里就好。"
};

function createMessage(role: TreeHoleMessage["role"], content: string, source?: DisplayMessage["source"]): DisplayMessage {
  return {
    id: `${role}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    role,
    content,
    source
  };
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.content}</Text>
        {!isUser && message.source === "fallback" ? (
          <Text style={styles.fallbackTag}>本地安抚</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function TreeHoleScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([openingMessage]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const scrollToLatest = () => {
    window.setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const markTreeHoleStarted = async () => {
    await Promise.all([
      markTreeHoleUsed(),
      markSleepAidStarted({ aid: "tree_hole" })
    ]);
  };

  const sendMessage = async () => {
    const trimmed = draft.trim();

    if (!trimmed || isSending) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    const context = messages.map(({ role, content }) => ({ role, content }));

    setDraft("");
    setMessages((current) => [...current, userMessage]);
    setIsSending(true);
    scrollToLatest();

    try {
      await markTreeHoleStarted();
      const result = await sendTreeHoleMessage({
        conversationId,
        message: trimmed,
        context
      });

      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        createMessage("assistant", result.message, result.source)
      ]);
    } finally {
      setIsSending(false);
      scrollToLatest();
    }
  };

  const readyToSleep = async () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    try {
      await markTreeHoleStarted();
      await markReadyToSleep();
      await markExecutionReadyToSleep();
      router.replace("/rescue");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={20}
        style={styles.keyboard}
      >
        <View style={styles.top}>
          <Pressable style={styles.backButton} onPress={() => router.push("/sleep-generator")}>
            <Text style={styles.backText}>返回</Text>
          </Pressable>
          <Text style={styles.statusPill}>AI 树洞</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>睡前树洞</Text>
          <Text style={styles.title}>把脑子里的声音先放下来</Text>
          <Text style={styles.subtitle}>这里不做评判，也不急着解决人生。今晚只先让情绪有个落点。</Text>
        </View>

        <View style={styles.chatPanel}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToLatest}
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending ? (
              <MessageBubble
                message={{
                  id: "typing",
                  role: "assistant",
                  content: "我正在慢慢接住这一句..."
                }}
              />
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.composer}>
          <TextInput
            multiline
            maxLength={500}
            placeholder="写一句最占脑子的事..."
            placeholderTextColor="rgba(166, 171, 191, 0.72)"
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            textAlignVertical="top"
          />
          <AppButton
            title={isSending ? "发送中..." : "放在这里"}
            variant="gradient"
            size="md"
            onPress={sendMessage}
            disabled={!draft.trim() || isSending || isClosing}
          />
        </View>

        <AppButton
          title={isClosing ? "正在收尾..." : "谢谢，我准备睡了"}
          variant="ghost"
          onPress={readyToSleep}
          disabled={isSending || isClosing}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    gap: 18
  },
  top: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  backText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  statusPill: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#39313A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden"
  },
  header: {
    gap: 10
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  chatPanel: {
    flex: 1,
    minHeight: 180,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  messages: {
    padding: 16,
    gap: 12
  },
  messageRow: {
    width: "100%",
    alignItems: "flex-start"
  },
  messageRowUser: {
    alignItems: "flex-end"
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8
  },
  assistantBubble: {
    backgroundColor: "#242839",
    borderTopLeftRadius: 8
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderTopRightRadius: 8
  },
  messageText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700"
  },
  userMessageText: {
    color: colors.buttonText
  },
  fallbackTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(230, 213, 184, 0.12)",
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden"
  },
  composer: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12
  },
  input: {
    minHeight: 92,
    maxHeight: 140,
    borderRadius: 20,
    backgroundColor: "#111323",
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    paddingHorizontal: 15,
    paddingVertical: 13
  }
});
