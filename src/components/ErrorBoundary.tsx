import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Sentry from "@sentry/react-native";
import { baseColors } from "@theme/colors";
import AppIcon from "@/components/AppIcon";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const Colors = {
  text: {
    primary: baseColors.ink900,
  },
  bg: {
    primary: baseColors.cream0,
  },
  accent: {
    error: baseColors.error,
  },
};

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error): void {
    Sentry.captureException(error);
  }

  private handleRestart = () => {
    this.setState({ hasError: false });
  };

  public render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <View style={styles.container}>
        <AppIcon name="info" size={48} color={Colors.accent.error} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.description}>
          The app encountered an unexpected error.
        </Text>
        <Pressable onPress={this.handleRestart} style={styles.button}>
          <Text style={styles.buttonText}>Restart</Text>
        </Pressable>
      </View>
    );
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? "Component"})`;

  return WrappedComponent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: Colors.bg.primary,
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
    textAlign: "center",
  },
  description: {
    marginTop: 8,
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: "center",
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.accent.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.bg.primary,
  },
});

export default ErrorBoundary;
