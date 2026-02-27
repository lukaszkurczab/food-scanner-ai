import { act, fireEvent } from "@testing-library/react-native";
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

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
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
});
