import { Image, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import AvatarBadge from "@/components/AvatarBadge";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("AvatarBadge", () => {
  it("renders fallback content when uri is missing", () => {
    const { getByText } = renderWithTheme(
      <AvatarBadge badges={[]} fallbackIcon={<Text>fallback-icon</Text>} />,
    );

    expect(getByText("fallback-icon")).toBeTruthy();
  });

  it("renders local image and falls back after image error", () => {
    const { UNSAFE_getByType, getByText } = renderWithTheme(
      <AvatarBadge
        uri="file:///avatar.jpg"
        badges={[]}
        fallbackIcon={<Text>fallback-icon</Text>}
      />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe("file:///avatar.jpg");

    fireEvent(image, "error");
    expect(getByText("fallback-icon")).toBeTruthy();
  });

  it("shows emoji for the highest priority badge", () => {
    const { getByText } = renderWithTheme(
      <AvatarBadge
        badges={[
          {
            id: "streak_90",
            type: "streak",
            label: "Streak 90",
            milestone: 90,
            icon: "S",
            color: "#111",
            unlockedAt: 1,
          },
          {
            id: "premium_365d",
            type: "premium",
            label: "Premium 365",
            milestone: 365,
            icon: "P",
            color: "#222",
            unlockedAt: 2,
          },
        ]}
      />,
    );

    expect(getByText("P")).toBeTruthy();
  });
});
