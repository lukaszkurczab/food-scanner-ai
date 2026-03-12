import React from "react";
import { View } from "react-native";
import { act, fireEvent } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { ChatHistorySheet } from "@/feature/AI/components/ChatHistorySheet";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { ChatThread } from "@/types";

const mockSubscribeToChatThreads = jest.fn();
const mockUuid = jest.fn<() => string>();
const mockUseNetInfo = jest.fn<() => { isConnected: boolean | null }>();
const mockDrawerContainer = View;
const mockCreateElement = React.createElement;

let onThreads: ((items: ChatThread[]) => void) | null = null;
let onError: (() => void) | null = null;

jest.mock("@/services/ai/chatThreadRepository", () => ({
  subscribeToChatThreads: (params: {
    onThreads: (items: ChatThread[]) => void;
    onError?: () => void;
  }) => {
    mockSubscribeToChatThreads(params);
    onThreads = params.onThreads;
    onError = params.onError || null;
    return jest.fn();
  },
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("@/components/Drawer", () => ({
  Drawer: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) =>
    open ? mockCreateElement(mockDrawerContainer, null, children) : null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("ChatHistorySheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onThreads = null;
    onError = null;
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUuid.mockReturnValue("thread-uuid");
  });

  it("creates a new local thread and closes sheet", () => {
    const onClose = jest.fn();
    const onSelectThread = jest.fn();
    const { getByText } = renderWithTheme(
      <ChatHistorySheet
        open
        onClose={onClose}
        userUid="user-1"
        activeThreadId=""
        onSelectThread={onSelectThread}
      />,
    );

    fireEvent.press(getByText("translated:new"));
    expect(onSelectThread).toHaveBeenCalledWith("local-thread-uuid");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders thread rows from repository subscription and selects one", () => {
    const onClose = jest.fn();
    const onSelectThread = jest.fn();
    const { getByText } = renderWithTheme(
      <ChatHistorySheet
        open
        onClose={onClose}
        userUid="user-1"
        activeThreadId="thread-2"
        onSelectThread={onSelectThread}
      />,
    );

    expect(mockSubscribeToChatThreads).toHaveBeenCalledTimes(1);

    act(() => {
      onThreads?.([
        {
          id: "thread-2",
          userUid: "user-1",
          title: "My Thread",
          createdAt: 1,
          updatedAt: 2,
          lastMessage: "Last AI answer",
          lastMessageAt: 2,
        },
      ]);
    });

    const threadTitle = getByText("My Thread");
    expect(threadTitle).toBeTruthy();
    expect(getByText("Last AI answer")).toBeTruthy();

    fireEvent.press(threadTitle);
    expect(onSelectThread).toHaveBeenCalledWith("thread-2");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows offline-empty copy when there are no local threads and device is offline", () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    const { getByText } = renderWithTheme(
      <ChatHistorySheet
        open
        onClose={jest.fn()}
        userUid="user-1"
        activeThreadId=""
        onSelectThread={jest.fn()}
      />,
    );

    act(() => {
      onThreads?.([]);
    });

    expect(getByText("translated:offline.title")).toBeTruthy();
    expect(getByText("translated:history.offlineEmpty")).toBeTruthy();
  });

  it("shows refresh error copy when threads subscription fails", () => {
    const { getByText } = renderWithTheme(
      <ChatHistorySheet
        open
        onClose={jest.fn()}
        userUid="user-1"
        activeThreadId=""
        onSelectThread={jest.fn()}
      />,
    );

    act(() => {
      onError?.();
    });

    expect(getByText("translated:history.errorTitle")).toBeTruthy();
    expect(getByText("translated:history.refreshError")).toBeTruthy();
  });
});
