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

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
};
type Snapshot = { docs: SnapshotDoc[] };

const mockCollection = jest.fn();
const mockGetFirestore = jest.fn();
const mockOrderBy = jest.fn();
const mockQuery = jest.fn();
const mockOnSnapshot = jest.fn<
  (q: unknown, onNext: (snap: Snapshot) => void) => () => void
>();
const mockGetApp = jest.fn();
const mockUuid = jest.fn<() => string>();
const mockDrawerContainer = View;
const mockCreateElement = React.createElement;

let mockSnapshotNext: ((snap: Snapshot) => void) | null = null;

jest.mock("@react-native-firebase/app", () => ({
  getApp: () => mockGetApp(),
}));

jest.mock("@react-native-firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  onSnapshot: (q: unknown, onNext: (snap: Snapshot) => void) =>
    mockOnSnapshot(q, onNext),
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
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
    mockSnapshotNext = null;
    mockUuid.mockReturnValue("thread-uuid");
    mockGetApp.mockReturnValue({ app: "test-app" });
    mockGetFirestore.mockReturnValue({ db: "test-db" });
    mockCollection.mockReturnValue({ kind: "collection" });
    mockOrderBy.mockReturnValue({ kind: "orderBy" });
    mockQuery.mockReturnValue({ kind: "query" });
    mockOnSnapshot.mockImplementation((_q, onNext) => {
      mockSnapshotNext = onNext;
      return jest.fn();
    });
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

  it("maps snapshot rows and selects existing thread", () => {
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

    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    act(() => {
      mockSnapshotNext?.({
        docs: [
          {
            id: "thread-2",
            data: () => ({
              title: "My Thread",
              createdAt: 1,
              updatedAt: 2,
              lastMessage: "Last AI answer",
            }),
          },
        ],
      });
    });

    const threadTitle = getByText("My Thread");
    expect(threadTitle).toBeTruthy();
    expect(getByText("Last AI answer")).toBeTruthy();

    fireEvent.press(threadTitle);
    expect(onSelectThread).toHaveBeenCalledWith("thread-2");
    expect(onClose).toHaveBeenCalled();
  });
});
