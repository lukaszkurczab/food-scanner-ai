import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { ChatMessage } from "@/types";
import type { ReactNode } from "react";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import ChatScreen from "@/feature/AI/screens/ChatScreen";

const mockNavigate = jest.fn();
const mockUseNetInfo = jest.fn<() => { isConnected: boolean | null }>();
const mockPullChatChanges = jest.fn();
const mockAsyncStorageGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockAsyncStorageSetItem = jest.fn<(key: string, value: string) => Promise<void>>();

const baseMessages: ChatMessage[] = [
  {
    id: "m-1",
    userUid: "user-1",
    role: "assistant",
    content: "How can I help?",
    createdAt: 100,
    lastSyncedAt: 100,
    syncState: "synced",
    deleted: false,
  },
];

let mockChatHistoryState: {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  typing: boolean;
  sendErrorType: null | "offline" | "timeout" | "unavailable" | "auth" | "unknown";
  failedSyncCount: number;
  retryingFailedSync: boolean;
  canSend: boolean;
  creditAllocation: number;
  send: (value: string) => Promise<string | null>;
  retryLastSend: () => Promise<string | null>;
  cancelInFlightSend: () => void;
  loadMore: () => void;
  retryFailedSyncOps: () => Promise<void>;
};

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: () => undefined,
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockAsyncStorageGetItem(key),
    setItem: (key: string, value: string) => mockAsyncStorageSetItem(key, value),
  },
}));

jest.mock("@/components/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => {
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <View>{children}</View>;
  },
}));

jest.mock("@/components", () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
  Modal: ({
    visible,
    title,
    children,
    primaryAction,
    secondaryAction,
  }: {
    visible: boolean;
    title?: string;
    children?: ReactNode;
    primaryAction?: { label: string; onPress?: () => void };
    secondaryAction?: { label: string; onPress?: () => void };
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    if (!visible) return null;
    return (
      <View>
        {title ? <Text>{title}</Text> : null}
        {children}
        {primaryAction ? (
          <Pressable onPress={primaryAction.onPress}>
            <Text>{primaryAction.label}</Text>
          </Pressable>
        ) : null}
        {secondaryAction ? (
          <Pressable onPress={secondaryAction.onPress}>
            <Text>{secondaryAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => ({ firebaseUser: { uid: "user-1" } }),
}));

jest.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({ userData: null, loadingUser: false }),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => ({
    credits: {
      balance: 18,
      allocation: 100,
      periodEndAt: "2026-05-01T00:00:00.000Z",
    },
  }),
}));

jest.mock("@hooks/useMeals", () => ({
  useMeals: () => ({ meals: [] }),
}));

jest.mock("@/hooks/useChatHistory", () => ({
  useChatHistory: () => mockChatHistoryState,
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pullChatChanges: (...args: unknown[]) => mockPullChatChanges(...args),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/feature/AI/components/ChatHistorySheet", () => ({
  ChatHistorySheet: () => null,
}));

describe("ChatScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockAsyncStorageGetItem.mockResolvedValue("accepted");
    mockAsyncStorageSetItem.mockResolvedValue();
    mockChatHistoryState = {
      messages: [],
      loading: false,
      sending: false,
      typing: false,
      sendErrorType: null,
      failedSyncCount: 0,
      retryingFailedSync: false,
      canSend: true,
      creditAllocation: 100,
      send: jest.fn(async () => null),
      retryLastSend: jest.fn(async () => null),
      cancelInFlightSend: () => undefined,
      loadMore: () => undefined,
      retryFailedSyncOps: async () => undefined,
    };
  });

  it("renders empty online state with intro and suggested starters", async () => {
    const screen = renderWithTheme(<ChatScreen />);

    expect(screen.getByText("empty.title")).toBeTruthy();
    expect(screen.getByText("empty.subtitle")).toBeTruthy();
    expect(screen.getByText("empty.suggestedLabel")).toBeTruthy();
    expect(screen.getByText("empty.starters.week")).toBeTruthy();
    expect(await screen.findByPlaceholderText("composer.placeholder")).toBeTruthy();
  });

  it("shows a blocking legal modal until the user accepts it", async () => {
    mockAsyncStorageGetItem.mockResolvedValue(null);

    const screen = renderWithTheme(<ChatScreen />);

    expect(await screen.findByText("legal.title")).toBeTruthy();
    expect(screen.getByText("legal.informational")).toBeTruthy();
    expect(screen.getByPlaceholderText("legal.composerLocked")).toBeTruthy();

    fireEvent.press(screen.getByText("legal.accept"));

    expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
      "chat_legal_ack:user-1",
      "accepted",
    );
  });

  it("hides legal modal before navigating to data & ai clarity details", async () => {
    mockAsyncStorageGetItem.mockResolvedValue(null);

    const screen = renderWithTheme(<ChatScreen />);

    expect(await screen.findByText("legal.title")).toBeTruthy();

    fireEvent.press(screen.getByText("legal.learnMore"));

    expect(mockNavigate).toHaveBeenCalledWith("DataAiClarity");
    await waitFor(() => {
      expect(screen.queryByText("legal.title")).toBeNull();
    });
  });

  it("renders normal conversation state", () => {
    mockChatHistoryState.messages = baseMessages;

    const screen = renderWithTheme(<ChatScreen />);
    expect(screen.getByText("How can I help?")).toBeTruthy();
    expect(screen.queryByText("lock.creditsTitle")).toBeNull();
    expect(screen.queryByText("lock.offlineTitle")).toBeNull();
  });

  it("renders no-credits lock state for existing conversation and navigates on upgrade", async () => {
    mockChatHistoryState.messages = baseMessages;
    mockChatHistoryState.canSend = false;

    const screen = renderWithTheme(<ChatScreen />);
    expect(screen.getByText("lock.creditsTitle")).toBeTruthy();
    expect(screen.getByText("limit.body")).toBeTruthy();
    expect(await screen.findByPlaceholderText("composer.lockedCredits")).toBeTruthy();
    expect(screen.getByTestId("chat-input").props.editable).toBe(false);

    fireEvent.press(screen.getByText("lock.creditsAction"));
    expect(mockNavigate).toHaveBeenCalledWith("ManageSubscription");
  });

  it("renders offline lock state for existing conversation", async () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    mockChatHistoryState.messages = baseMessages;

    const screen = renderWithTheme(<ChatScreen />);
    expect(screen.getByTestId("offline-banner")).toBeTruthy();
    expect(screen.getByText("lock.offlineTitle")).toBeTruthy();
    expect(screen.getByText("lock.offlineBody")).toBeTruthy();
    expect(await screen.findByPlaceholderText("composer.lockedOffline")).toBeTruthy();
    expect(screen.getByTestId("chat-input").props.editable).toBe(false);
  });

  it("retries the failed assistant reply without reusing composer text flow", async () => {
    mockChatHistoryState.messages = baseMessages;
    mockChatHistoryState.sendErrorType = "timeout";

    const screen = renderWithTheme(<ChatScreen />);

    await screen.findByPlaceholderText("composer.placeholder");
    fireEvent.changeText(screen.getByTestId("chat-input"), "new question");
    fireEvent.press(screen.getByText("retryLast"));

    expect(mockChatHistoryState.retryLastSend).toHaveBeenCalledTimes(1);
    expect(mockChatHistoryState.send).not.toHaveBeenCalled();
  });
});
