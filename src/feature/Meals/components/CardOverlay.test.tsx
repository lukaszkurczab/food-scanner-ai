import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import CardOverlay from "@/feature/Meals/components/CardOverlay";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockSummaryCard = jest.fn<(props: unknown) => null>(() => null);
const mockVerticalStackCard = jest.fn<(props: unknown) => null>(() => null);
const mockBadgeCard = jest.fn<(props: unknown) => null>(() => null);
const mockSplitCard = jest.fn<(props: unknown) => null>(() => null);
const mockTagStripCard = jest.fn<(props: unknown) => null>(() => null);

jest.mock("./cardLayouts/MacroSummaryCard", () => ({
  __esModule: true,
  default: (props: unknown) => mockSummaryCard(props),
}));
jest.mock("./cardLayouts/MacroVerticalStackCard", () => ({
  __esModule: true,
  default: (props: unknown) => mockVerticalStackCard(props),
}));
jest.mock("./cardLayouts/MacroBadgeCard", () => ({
  __esModule: true,
  default: (props: unknown) => mockBadgeCard(props),
}));
jest.mock("./cardLayouts/MacroSplitCard", () => ({
  __esModule: true,
  default: (props: unknown) => mockSplitCard(props),
}));
jest.mock("./cardLayouts/MacroTagStripCard", () => ({
  __esModule: true,
  default: (props: unknown) => mockTagStripCard(props),
}));

describe("CardOverlay", () => {
  beforeEach(() => {
    mockSummaryCard.mockClear();
    mockVerticalStackCard.mockClear();
    mockBadgeCard.mockClear();
    mockSplitCard.mockClear();
    mockTagStripCard.mockClear();
  });

  it("renders summary variant by default", () => {
    renderWithTheme(
      <CardOverlay protein={32} fat={11} carbs={45} kcal={520} />,
    );

    expect(mockSummaryCard).toHaveBeenCalledWith(
      expect.objectContaining({
        protein: 32,
        fat: 11,
        carbs: 45,
        kcal: 520,
        textColor: "#000000",
        bgColor: "rgba(0,0,0,0.35)",
        showKcal: true,
        showMacros: true,
      }),
    );
    expect(mockSplitCard).not.toHaveBeenCalled();
  });

  it("routes to selected card variant and passes style overrides", () => {
    renderWithTheme(
      <CardOverlay
        variant="macroSplitCard"
        protein={20}
        fat={9}
        carbs={31}
        kcal={321}
        color="#fff"
        backgroundColor="#123456"
        showKcal={false}
        showMacros={false}
        fontFamily="MockFont"
        fontWeight="500"
        macroColorsOverride={{
          protein: "#0f0",
          carbs: "#00f",
          fat: "#f00",
        }}
      />,
    );

    expect(mockSplitCard).toHaveBeenCalledWith(
      expect.objectContaining({
        protein: 20,
        fat: 9,
        carbs: 31,
        kcal: 321,
        textColor: "#fff",
        bgColor: "#123456",
        showKcal: false,
        showMacros: false,
        fontFamily: "MockFont",
        fontWeight: "500",
        macroColors: {
          protein: "#0f0",
          carbs: "#00f",
          fat: "#f00",
        },
      }),
    );
    expect(mockSummaryCard).not.toHaveBeenCalled();
  });
});
