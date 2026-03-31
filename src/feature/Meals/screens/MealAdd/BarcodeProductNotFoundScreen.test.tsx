import type { ReactNode } from "react";
import { BackHandler } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import BarcodeProductNotFoundScreen from "@/feature/Meals/screens/MealAdd/BarcodeProductNotFoundScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Ingredient } from "@/types";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children?: ReactNode;
};

type TextInputProps = {
  testID?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
};

type BuildBarcodeDraftPayload = {
  uid: string;
  mealId?: string;
  code: string;
  ingredient: Ingredient;
  productName: string;
};

const mockLookupBarcodeProduct = jest.fn<
  (barcode: string) => Promise<
    | { kind: "found"; name: string; ingredient: Ingredient }
    | { kind: "not_found" }
    | { kind: "error" }
  >
>();
const mockSetMeal = jest.fn();
const mockSaveDraft = jest.fn<(uid: string, meal: unknown) => Promise<void>>();
const mockBuildBarcodeDraft = jest.fn<(payload: BuildBarcodeDraftPayload) => unknown>();
const mockUseAuthContext = jest.fn();
let backHandlerListener: (() => boolean) | undefined;
let beforeRemoveListener:
  | ((event: { data: { action: { type: string } }; preventDefault: () => void }) => void)
  | undefined;

jest.mock("react-i18next", () => ({
  useTranslation: (ns: string) => ({
    t: (key: string, options?: { defaultValue?: string } | string) =>
      typeof options === "string"
        ? options
        : options?.defaultValue ?? `${ns}:${key}`,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 4, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => ({
    meal: null,
    saveDraft: (uid: string, meal: unknown) => mockSaveDraft(uid, meal),
    setMeal: mockSetMeal,
  }),
}));

jest.mock("@/services/barcode/barcodeService", () => ({
  extractBarcodeFromPayload: (payload: string) => {
    const digits = String(payload).replace(/\D+/g, "");
    return digits.length === 8 || digits.length === 12 || digits.length === 13
      ? digits
      : null;
  },
  lookupBarcodeProduct: (barcode: string) => mockLookupBarcodeProduct(barcode),
}));

jest.mock("@/feature/Meals/utils/buildBarcodeDraft", () => ({
  buildBarcodeDraft: (payload: unknown) =>
    mockBuildBarcodeDraft(payload as BuildBarcodeDraftPayload),
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const { TextInput } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) =>
      createElement(View, null, children),
    Button: ({ label, onPress, disabled }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    ScreenCornerNavButton: ({
      icon,
      onPress,
      accessibilityLabel,
    }: {
      icon: string;
      onPress: () => void;
      accessibilityLabel: string;
    }) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, `${icon}:${accessibilityLabel}`),
      ),
    TextButton: ({ label, onPress, disabled }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    ErrorBox: ({ message }: { message: string }) =>
      message ? createElement(Text, null, message) : null,
    TextInput: ({
      testID,
      value,
      onChangeText,
      placeholder,
      error,
    }: TextInputProps) =>
      createElement(
        View,
        null,
        createElement(TextInput, {
          testID,
          value,
          onChangeText,
          placeholder,
        }),
        error ? createElement(Text, null, error) : null,
      ),
  };
});

const buildProps = (
  params: MealAddScreenProps<"BarcodeProductNotFound">["params"],
) =>
  ({
    navigation: {
      goBack: jest.fn(),
      navigate: jest.fn(),
      addListener: jest.fn(
        (_eventName: string, listener: typeof beforeRemoveListener) => {
          beforeRemoveListener = listener ?? undefined;
          return jest.fn();
        },
      ),
    } as unknown as MealAddScreenProps<"BarcodeProductNotFound">["navigation"],
    flow: {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => false),
    } as unknown as MealAddScreenProps<"BarcodeProductNotFound">["flow"],
    params,
  }) as MealAddScreenProps<"BarcodeProductNotFound">;

describe("BarcodeProductNotFoundScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    backHandlerListener = undefined;
    beforeRemoveListener = undefined;
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockSaveDraft.mockResolvedValue(undefined);
    mockBuildBarcodeDraft.mockImplementation(
      ({
        uid,
        mealId,
        ingredient,
        productName,
      }: BuildBarcodeDraftPayload) => ({
        mealId: mealId ?? "meal-1",
        userUid: uid,
        name: productName,
        photoUrl: null,
        ingredients: [ingredient],
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-01T10:00:00.000Z",
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: null,
        inputMethod: "barcode",
      }),
    );
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation(
        ((_eventName: string, listener: () => boolean) => {
          backHandlerListener = listener;
          return { remove: jest.fn() };
        }) as typeof BackHandler.addEventListener,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lets the new barcode flow edit the searched code in the manual sheet", () => {
    const props = buildProps({
      code: "5901234123457",
    });

    const { getAllByText, getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    expect(getAllByText("5901234123457").length).toBeGreaterThan(0);
    fireEvent.press(getByText("Edit code"));

    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {
      code: "5901234123457",
      codeSource: "manual",
      showManualEntry: true,
    });
  });

  it("renders a stack back button when the barcode flow can step back", () => {
    const props = buildProps({
      code: "5901234123457",
    });
    props.flow.canGoBack = jest.fn(() => true) as never;

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("back:Back"));

    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {
      code: undefined,
      codeSource: undefined,
    });
  });

  it("lets the user switch add method", () => {
    const props = buildProps({
      code: "5901234123457",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Try another method"));

    expect(props.navigation.navigate).toHaveBeenCalledWith("MealAddMethod", {
      selectionMode: "temporary",
    });
  });

  it("lets the new barcode flow restart scanning", () => {
    const props = buildProps({
      code: "5901234123457",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Back to scan"));

    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {
      code: undefined,
      codeSource: undefined,
    });
  });

  it("renders an editable code field for manually entered codes", async () => {
    mockLookupBarcodeProduct.mockResolvedValue({
      kind: "not_found",
    });
    const props = buildProps({
      code: "5901234123457",
      codeSource: "manual",
    });

    const { getByTestId, getByText, queryByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    expect(queryByText("Edit code")).toBeNull();
    fireEvent.changeText(getByTestId("barcode-not-found-input"), "12312312");
    fireEvent.press(getByText("Search product"));

    await waitFor(() => {
      expect(props.flow.replace).toHaveBeenCalledWith(
        "BarcodeProductNotFound",
        {
          code: "12312312",
          codeSource: "manual",
        },
      );
    });
  });

  it("shows a validation error for an invalid manual code", async () => {
    const props = buildProps({
      code: "5901234123457",
      codeSource: "manual",
    });

    const { getByTestId, getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.changeText(getByTestId("barcode-not-found-input"), "abc");
    fireEvent.press(getByText("Search product"));

    await waitFor(() => {
      expect(getByText("Enter a valid barcode to continue.")).toBeTruthy();
    });
    expect(mockLookupBarcodeProduct).not.toHaveBeenCalled();
  });

  it("shows a lookup error when barcode lookup fails", async () => {
    mockLookupBarcodeProduct.mockResolvedValue({ kind: "error" });
    const props = buildProps({
      code: "5901234123457",
      codeSource: "manual",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Search product"));

    await waitFor(() => {
      expect(
        getByText("We couldn't search this barcode right now. Try again."),
      ).toBeTruthy();
    });
  });

  it("persists the found barcode product and opens review", async () => {
    mockLookupBarcodeProduct.mockResolvedValue({
      kind: "found",
      name: "Greek Yogurt",
      ingredient: {
        id: "ingredient-1",
        name: "Greek Yogurt",
        amount: 150,
        unit: "g",
        protein: 15,
        fat: 4,
        carbs: 7,
        kcal: 120,
      },
    });
    const props = buildProps({
      code: "5901234123457",
      codeSource: "manual",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Search product"));

    await waitFor(() => {
      expect(mockBuildBarcodeDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "user-1",
          code: "5901234123457",
          productName: "Greek Yogurt",
        }),
      );
      expect(mockSetMeal).toHaveBeenCalledTimes(1);
      expect(mockSaveDraft).toHaveBeenCalledWith("user-1", expect.any(Object));
      expect(props.flow.replace).toHaveBeenCalledWith("ReviewMeal", {});
    });
  });

  it("does not try to save the draft when the user id is unavailable", async () => {
    mockUseAuthContext.mockReturnValue({ uid: null });
    mockLookupBarcodeProduct.mockResolvedValue({
      kind: "found",
      name: "Greek Yogurt",
      ingredient: {
        id: "ingredient-1",
        name: "Greek Yogurt",
        amount: 150,
        unit: "g",
        protein: 15,
        fat: 4,
        carbs: 7,
        kcal: 120,
      },
    });
    const props = buildProps({
      code: "5901234123457",
      codeSource: "manual",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Search product"));

    await waitFor(() => {
      expect(mockSetMeal).toHaveBeenCalledTimes(1);
      expect(mockSaveDraft).not.toHaveBeenCalled();
      expect(props.flow.replace).toHaveBeenCalledWith("ReviewMeal", {});
    });
  });

  it("routes hardware back and stack back gestures to barcode scan", () => {
    const props = buildProps({
      code: "5901234123457",
      codeSource: "manual",
    });

    renderWithTheme(<BarcodeProductNotFoundScreen {...props} />);

    expect(backHandlerListener?.()).toBe(true);
    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {
      code: undefined,
      codeSource: undefined,
    });

    const preventDefault = jest.fn();
    beforeRemoveListener?.({
      data: { action: { type: "GO_BACK" } },
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {
      code: undefined,
      codeSource: undefined,
    });
  });

  it("ignores non-back beforeRemove actions", () => {
    const props = buildProps({
      code: "5901234123457",
    });

    renderWithTheme(<BarcodeProductNotFoundScreen {...props} />);

    const preventDefault = jest.fn();
    beforeRemoveListener?.({
      data: { action: { type: "NAVIGATE" } },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(props.flow.replace).not.toHaveBeenCalled();
  });

  it("omits the sent-code card when no searched code is available", () => {
    const props = buildProps({});

    const { queryByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    expect(queryByText("Sent code")).toBeNull();
  });
});
