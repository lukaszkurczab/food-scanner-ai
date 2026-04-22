import { useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UseKeyboardInsetOptions = {
  enabled?: boolean;
  includeSafeArea?: boolean;
  minInset?: number;
};

export function useKeyboardInset({
  enabled = true,
  includeSafeArea = false,
  minInset = 0,
}: UseKeyboardInsetOptions = {}): number {
  const insets = useSafeAreaInsets();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setKeyboardInset(0);
      return;
    }

    const showEventName =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleShow = (event: KeyboardEvent) => {
      const rawKeyboardHeight = event.endCoordinates?.height ?? 0;
      const adjustedHeight = includeSafeArea
        ? rawKeyboardHeight
        : Math.max(0, rawKeyboardHeight - insets.bottom);

      setKeyboardInset(adjustedHeight);
    };

    const handleHide = () => {
      setKeyboardInset(0);
    };

    const showSubscription = Keyboard.addListener(showEventName, handleShow);
    const hideSubscription = Keyboard.addListener(hideEventName, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [enabled, includeSafeArea, insets.bottom]);

  return useMemo(
    () => Math.max(minInset, keyboardInset),
    [keyboardInset, minInset],
  );
}

export default useKeyboardInset;
