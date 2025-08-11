// src/context/InactivityContext.tsx
import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
} from "react";
import { AppState, TouchableWithoutFeedback } from "react-native";

const ALLOWED_SCREENS = [
  "MealCamera",
  "AddMealManual",
  "AddMealFromList",
  "MealAddMethod",
  "IngredientsNotRecognized",
  "ReviewIngredients",
  "Result",
];

const TIMEOUT_MS = 10 * 60 * 1000;

type InactivityContextType = {
  isModalVisible: boolean;
  resetTimer: () => void;
  onTimeout: (() => void) | null;
  setOnTimeout: (fn: (() => void) | null) => void;
  dismissModal: () => void;
  setScreenName: (screen: string) => void;
};

const InactivityContext = createContext<InactivityContextType>({
  isModalVisible: false,
  resetTimer: () => {},
  onTimeout: null,
  setOnTimeout: () => {},
  dismissModal: () => {},
  setScreenName: () => {},
});

export const InactivityProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [onTimeout, setOnTimeout] = useState<(() => void) | null>(null);
  const [screenName, setScreenNameState] = useState("");

  const isTimerEnabled = ALLOWED_SCREENS.includes(screenName);

  const resetTimer = () => {
    if (!isTimerEnabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIsModalVisible(true);
      if (onTimeout) onTimeout();
    }, TIMEOUT_MS);
  };

  const dismissModal = () => setIsModalVisible(false);

  const setScreenName = (screen: string) => setScreenNameState(screen);

  useEffect(() => {
    if (!isTimerEnabled) return;
    resetTimer();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") resetTimer();
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      subscription.remove();
    };
  }, [onTimeout, isTimerEnabled]);

  return (
    <InactivityContext.Provider
      value={{
        isModalVisible,
        resetTimer,
        onTimeout,
        setOnTimeout,
        dismissModal,
        setScreenName,
      }}
    >
      <TouchableWithoutFeedback onPress={resetTimer}>
        {children}
      </TouchableWithoutFeedback>
    </InactivityContext.Provider>
  );
};

export const useInactivity = () => useContext(InactivityContext);
