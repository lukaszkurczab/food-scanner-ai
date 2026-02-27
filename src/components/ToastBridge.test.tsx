import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { ToastBridge } from "@/components/ToastBridge";

type ToastPayload = {
  text?: unknown;
  key?: unknown;
  ns?: unknown;
  options?: unknown;
};

const mockToastShow = jest.fn<(msg: string) => void>();
const mockI18nT = jest.fn<
  (key: string, options?: Record<string, unknown>) => string
>(() => " translated ");
const mockUnsub = jest.fn();
const mockOn = jest.fn<
  (event: string, handler: (payload?: ToastPayload) => void) => void
>();

let mockHandler: ((payload?: ToastPayload) => void) | undefined;

jest.mock("@/services/events", () => ({
  on: (event: string, handler: (payload?: ToastPayload) => void) => {
    mockOn(event, handler);
    mockHandler = handler;
    return mockUnsub;
  },
}));

jest.mock("./Toast", () => ({
  Toast: {
    show: (msg: string) => mockToastShow(msg),
  },
  ToastContainer: () => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "toast-container");
  },
}));

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    t: (...args: unknown[]) =>
      mockI18nT(args[0] as string, args[1] as Record<string, unknown>),
  },
}));

describe("ToastBridge", () => {
  beforeEach(() => {
    mockToastShow.mockClear();
    mockI18nT.mockClear();
    mockUnsub.mockClear();
    mockOn.mockClear();
    mockHandler = undefined;
  });

  it("subscribes to toast events and renders container", () => {
    const { getByText } = renderWithTheme(<ToastBridge />);

    expect(getByText("toast-container")).toBeTruthy();
    expect(mockOn).toHaveBeenCalledWith("ui:toast", expect.any(Function));
  });

  it("shows direct text payload after trimming", () => {
    renderWithTheme(<ToastBridge />);
    expect(mockHandler).toBeDefined();

    mockHandler?.({ text: "  Saved  " });
    expect(mockToastShow).toHaveBeenCalledWith("Saved");
    expect(mockI18nT).not.toHaveBeenCalled();
  });

  it("translates key payload and shows translated text", () => {
    renderWithTheme(<ToastBridge />);
    expect(mockHandler).toBeDefined();

    mockHandler?.({ key: "toasts.saved", ns: "common", options: { count: 2 } });

    expect(mockI18nT).toHaveBeenCalledWith("toasts.saved", {
      ns: "common",
      count: 2,
    });
    expect(mockToastShow).toHaveBeenCalledWith("translated");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderWithTheme(<ToastBridge />);
    unmount();

    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });
});
