import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import type {
  NavigationAction,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

type GuardNavigation = Pick<
  NavigationProp<ParamListBase>,
  "addListener" | "dispatch" | "goBack" | "canGoBack"
>;

type UseUnsavedChangesGuardParams = {
  navigation: GuardNavigation;
  hasUnsavedChanges: boolean;
  enabled?: boolean;
  onExit?: () => void;
  onDiscard?: () => void;
  onBeforeExitAttempt?: () => boolean;
  interceptHardwareBack?: boolean;
  shouldGuardAction?: (action: NavigationAction) => boolean;
};

type UseUnsavedChangesGuardResult = {
  confirmVisible: boolean;
  requestExit: () => void;
  confirmExit: () => void;
  cancelExit: () => void;
};

const DEFAULT_BACK_ACTIONS = new Set(["GO_BACK", "POP", "POP_TO_TOP"]);

function isDefaultGuardedAction(action: NavigationAction): boolean {
  return DEFAULT_BACK_ACTIONS.has(action.type);
}

export function useUnsavedChangesGuard({
  navigation,
  hasUnsavedChanges,
  enabled = true,
  onExit,
  onDiscard,
  onBeforeExitAttempt,
  interceptHardwareBack = true,
  shouldGuardAction,
}: UseUnsavedChangesGuardParams): UseUnsavedChangesGuardResult {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const pendingActionRef = useRef<NavigationAction | null>(null);
  const allowNextNavigationActionRef = useRef(false);

  const performExit = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onExit]);

  const runPreExitHandler = useCallback(() => {
    if (!onBeforeExitAttempt) return false;
    return onBeforeExitAttempt();
  }, [onBeforeExitAttempt]);

  const requestExit = useCallback(() => {
    if (runPreExitHandler()) {
      return;
    }

    if (!enabled || !hasUnsavedChanges) {
      performExit();
      return;
    }

    pendingActionRef.current = null;
    setConfirmVisible(true);
  }, [enabled, hasUnsavedChanges, performExit, runPreExitHandler]);

  const cancelExit = useCallback(() => {
    pendingActionRef.current = null;
    setConfirmVisible(false);
  }, []);

  const confirmExit = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setConfirmVisible(false);
    onDiscard?.();
    allowNextNavigationActionRef.current = true;

    if (action) {
      navigation.dispatch(action);
      return;
    }

    performExit();
  }, [navigation, onDiscard, performExit]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowNextNavigationActionRef.current) {
        allowNextNavigationActionRef.current = false;
        return;
      }

      if (runPreExitHandler()) {
        event.preventDefault();
        return;
      }

      if (!enabled || !hasUnsavedChanges) {
        return;
      }

      const action = event.data.action as NavigationAction;
      const guardAction = shouldGuardAction ?? isDefaultGuardedAction;
      if (!guardAction(action)) {
        return;
      }

      event.preventDefault();
      pendingActionRef.current = action;
      setConfirmVisible(true);
    });

    return unsubscribe;
  }, [
    enabled,
    hasUnsavedChanges,
    navigation,
    runPreExitHandler,
    shouldGuardAction,
  ]);

  useEffect(() => {
    if (!interceptHardwareBack) {
      return;
    }

    const onBackPress = () => {
      if (runPreExitHandler()) {
        return true;
      }

      if (confirmVisible) {
        cancelExit();
        return true;
      }

      if (hasUnsavedChanges && enabled) {
        pendingActionRef.current = null;
        setConfirmVisible(true);
        return true;
      }

      if (onExit) {
        onExit();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [
    cancelExit,
    confirmVisible,
    enabled,
    hasUnsavedChanges,
    interceptHardwareBack,
    onExit,
    runPreExitHandler,
  ]);

  return {
    confirmVisible,
    requestExit,
    confirmExit,
    cancelExit,
  };
}

export default useUnsavedChangesGuard;
