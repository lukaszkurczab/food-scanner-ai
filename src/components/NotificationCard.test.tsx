import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import type { UserNotification } from "@/types/notification";
import { NotificationCard } from "@/components/NotificationCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? `translated:${key}`,
  }),
}));

const mockButtonToggle = jest.fn(
  ({
    value,
    onToggle,
  }: {
    value: boolean;
    onToggle: (enabled: boolean) => void;
  }) => (
    <Pressable accessibilityRole="switch" onPress={() => onToggle(!value)}>
      <Text>toggle</Text>
    </Pressable>
  ),
);

jest.mock("@/components/ButtonToggle", () => ({
  ButtonToggle: (props: { value: boolean; onToggle: (enabled: boolean) => void }) =>
    mockButtonToggle(props),
}));

const baseNotification: UserNotification = {
  id: "n1",
  type: "meal_reminder",
  name: "Lunch reminder",
  time: { hour: 7, minute: 5 },
  days: [1, 2],
  enabled: true,
  createdAt: 1,
  updatedAt: 2,
};

describe("NotificationCard", () => {
  it("renders details and triggers all actions", () => {
    const onPress = jest.fn();
    const onToggle = jest.fn();
    const onRemove = jest.fn();
    const { getByText, getByRole } = renderWithTheme(
      <NotificationCard
        item={baseNotification}
        onPress={onPress}
        onToggle={onToggle}
        onRemove={onRemove}
      />,
    );

    expect(getByText("Lunch reminder")).toBeTruthy();
    expect(getByText("translated:type.meal_reminder")).toBeTruthy();
    expect(getByText("07:05")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();

    fireEvent.press(getByText("Lunch reminder"));
    fireEvent.press(getByRole("switch"));
    fireEvent.press(getByText("Delete"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
