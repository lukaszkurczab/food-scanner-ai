import { Image } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { FallbackImage } from "@/feature/History/components/FallbackImage";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("FallbackImage", () => {
  it("renders nothing when uri is missing", () => {
    const { toJSON } = renderWithTheme(
      <FallbackImage uri={null} width={100} height={80} />,
    );

    expect(toJSON()).toBeNull();
  });

  it("renders image when uri exists", () => {
    const { UNSAFE_getByType } = renderWithTheme(
      <FallbackImage uri="https://example.com/photo.jpg" width={100} height={80} />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: "https://example.com/photo.jpg" });
  });

  it("calls onError and hides image after load error", () => {
    const onError = jest.fn();
    const { UNSAFE_getByType } = renderWithTheme(
      <FallbackImage
        uri="https://example.com/photo.jpg"
        width={100}
        height={80}
        onError={onError}
      />,
    );

    const image = UNSAFE_getByType(Image);
    fireEvent(image, "error");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(() => UNSAFE_getByType(Image)).toThrow();
  });
});
