import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Platform,
  ScrollView,
  findNodeHandle,
  type ScrollViewProps,
  type TextInput as RNTextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type KeyboardAwareFocusHandler = (input: RNTextInput | null) => void;

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  children?: ReactNode;
  extraScrollOffset?: number;
};

type KeyboardScrollResponder = ScrollView & {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean,
  ) => void;
};

const KeyboardAwareContext = createContext<KeyboardAwareFocusHandler | null>(
  null,
);

const DEFAULT_EXTRA_SCROLL_OFFSET = 24;

export function useKeyboardAwareInputFocus() {
  return useContext(KeyboardAwareContext);
}

export function KeyboardAwareScrollView({
  children,
  extraScrollOffset = DEFAULT_EXTRA_SCROLL_OFFSET,
  keyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag",
  keyboardShouldPersistTaps = "handled",
  automaticallyAdjustKeyboardInsets = Platform.OS === "ios",
  ...rest
}: KeyboardAwareScrollViewProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);

  const handleInputFocus = useCallback<KeyboardAwareFocusHandler>(
    (input) => {
      if (!input) return;
      const nodeHandle = findNodeHandle(input);
      if (!nodeHandle) return;

      // Wait one frame so layout settles before requesting focused-input scroll.
      requestAnimationFrame(() => {
        const responder = scrollRef.current as KeyboardScrollResponder | null;
        responder?.scrollResponderScrollNativeHandleToKeyboard?.(
          nodeHandle,
          extraScrollOffset + Math.max(insets.bottom, 8),
          true,
        );
      });
    },
    [extraScrollOffset, insets.bottom],
  );

  const contextValue = useMemo(() => handleInputFocus, [handleInputFocus]);

  return (
    <KeyboardAwareContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAwareContext.Provider>
  );
}

export default KeyboardAwareScrollView;
