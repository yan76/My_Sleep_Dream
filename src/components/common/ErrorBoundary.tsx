import { Component, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { trackAppEvent } from "@/services/analyticsService";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error) {
    trackAppEvent("app_error_boundary", {
      message: error.message.slice(0, 160)
    }).catch(() => undefined);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.root}>
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>页面出了点问题</Text>
          <Text style={styles.title}>先别急，记录还在本机</Text>
          <Text style={styles.body}>
            这里捕捉到了一次页面错误。你可以重试当前页面；如果仍然出现，再回到首页重新进入流程。
          </Text>
          {this.state.message ? <Text style={styles.detail}>{this.state.message}</Text> : null}
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>重试当前页面</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24
  },
  panel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceStrong,
    padding: 24,
    gap: 14
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  detail: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },
  button: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: "900"
  }
});
