import { act, fireEvent } from "@testing-library/react-native";
import { render } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { SearchBox } from "@/components/SearchBox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { ThemeProvider } from "@/theme/ThemeProvider";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("SearchBox", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces onChange when typing", () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBox value="" onChange={onChange} debounceMs={200} />,
    );

    const input = getByPlaceholderText("translated:input.search");
    fireEvent.changeText(input, "abc");

    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("clears input and emits empty value", () => {
    const onChange = jest.fn();
    const { getByLabelText, getByDisplayValue } = renderWithTheme(
      <SearchBox value="" onChange={onChange} />,
    );

    fireEvent.changeText(getByDisplayValue(""), "meal");
    fireEvent.press(getByLabelText("translated:input.clear_search_accessibility"));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("keeps only the latest debounced value", () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBox value="" onChange={onChange} debounceMs={200} />,
    );

    const input = getByPlaceholderText("translated:input.search");
    fireEvent.changeText(input, "a");
    act(() => {
      jest.advanceTimersByTime(150);
    });
    fireEvent.changeText(input, "ab");
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("ab");
  });

  it("syncs local state from prop updates and hides clear button for empty value", () => {
    const { queryByLabelText, getByDisplayValue, rerender } = renderWithTheme(
      <SearchBox value="meal" onChange={() => undefined} />,
    );

    expect(getByDisplayValue("meal")).toBeTruthy();
    expect(
      queryByLabelText("translated:input.clear_search_accessibility"),
    ).toBeTruthy();

    rerender(<SearchBox value="" onChange={() => undefined} />);

    expect(getByDisplayValue("")).toBeTruthy();
    expect(
      queryByLabelText("translated:input.clear_search_accessibility"),
    ).toBeNull();
  });

  it("clears pending debounce on unmount", () => {
    const onChange = jest.fn();
    const { getByPlaceholderText, unmount } = renderWithTheme(
      <SearchBox value="" onChange={onChange} debounceMs={200} />,
    );

    fireEvent.changeText(getByPlaceholderText("translated:input.search"), "meal");
    unmount();
    act(() => {
      jest.runAllTimers();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders custom placeholder in dark mode", () => {
    const { getByPlaceholderText } = render(
      <ThemeProvider mode="dark" followSystem={false}>
        <SearchBox
          value=""
          onChange={() => undefined}
          placeholder="Search meals"
        />
      </ThemeProvider>,
    );

    expect(getByPlaceholderText("Search meals")).toBeTruthy();
  });
});
