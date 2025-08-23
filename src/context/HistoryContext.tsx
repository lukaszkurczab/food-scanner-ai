import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type Filters = {
  calories?: [number, number];
  protein?: [number, number];
  carbs?: [number, number];
  fat?: [number, number];
  dateRange?: { start: Date; end: Date };
};

export type FilterScope = "history" | "myMeals";

type Slice = {
  query: string;
  filters: Filters | null;
  showFilters: boolean;
};

type HistoryContextValue = {
  history: Slice;
  myMeals: Slice;
  setHistoryQuery: (v: string) => void;
  setMyMealsQuery: (v: string) => void;
  applyHistoryFilters: (f: Filters) => void;
  applyMyMealsFilters: (f: Filters) => void;
  clearHistoryFilters: () => void;
  clearMyMealsFilters: () => void;
  setHistoryShowFilters: (v: boolean) => void;
  setMyMealsShowFilters: (v: boolean) => void;
  toggleHistoryShowFilters: () => void;
  toggleMyMealsShowFilters: () => void;
  historyFilterCount: number;
  myMealsFilterCount: number;
};

const HistoryContext = createContext<HistoryContextValue | undefined>(
  undefined
);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [history, setHistory] = useState<Slice>({
    query: "",
    filters: null,
    showFilters: false,
  });
  const [myMeals, setMyMeals] = useState<Slice>({
    query: "",
    filters: null,
    showFilters: false,
  });

  const historyFilterCount = useMemo(
    () => Object.values(history.filters || {}).filter(Boolean).length,
    [history.filters]
  );
  const myMealsFilterCount = useMemo(
    () => Object.values(myMeals.filters || {}).filter(Boolean).length,
    [myMeals.filters]
  );

  const setHistoryQuery = useCallback(
    (v: string) => setHistory((s) => ({ ...s, query: v })),
    []
  );
  const setMyMealsQuery = useCallback(
    (v: string) => setMyMeals((s) => ({ ...s, query: v })),
    []
  );

  const applyHistoryFilters = useCallback(
    (f: Filters) =>
      setHistory((s) => ({ ...s, filters: f, showFilters: false })),
    []
  );
  const applyMyMealsFilters = useCallback(
    (f: Filters) =>
      setMyMeals((s) => ({ ...s, filters: f, showFilters: false })),
    []
  );

  const clearHistoryFilters = useCallback(
    () => setHistory((s) => ({ ...s, filters: null, showFilters: false })),
    []
  );
  const clearMyMealsFilters = useCallback(
    () => setMyMeals((s) => ({ ...s, filters: null, showFilters: false })),
    []
  );

  const setHistoryShowFilters = useCallback(
    (v: boolean) => setHistory((s) => ({ ...s, showFilters: v })),
    []
  );
  const setMyMealsShowFilters = useCallback(
    (v: boolean) => setMyMeals((s) => ({ ...s, showFilters: v })),
    []
  );

  const toggleHistoryShowFilters = useCallback(
    () => setHistory((s) => ({ ...s, showFilters: !s.showFilters })),
    []
  );
  const toggleMyMealsShowFilters = useCallback(
    () => setMyMeals((s) => ({ ...s, showFilters: !s.showFilters })),
    []
  );

  const value: HistoryContextValue = {
    history,
    myMeals,
    setHistoryQuery,
    setMyMealsQuery,
    applyHistoryFilters,
    applyMyMealsFilters,
    clearHistoryFilters,
    clearMyMealsFilters,
    setHistoryShowFilters,
    setMyMealsShowFilters,
    toggleHistoryShowFilters,
    toggleMyMealsShowFilters,
    historyFilterCount,
    myMealsFilterCount,
  };

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
};

export const useHistoryContextRaw = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx)
    throw new Error("useHistoryContextRaw must be used within HistoryProvider");
  return ctx;
};

export const useFilters = (scope: FilterScope) => {
  const ctx = useHistoryContextRaw();
  if (scope === "history") {
    return {
      query: ctx.history.query,
      setQuery: ctx.setHistoryQuery,
      filters: ctx.history.filters,
      applyFilters: ctx.applyHistoryFilters,
      clearFilters: ctx.clearHistoryFilters,
      showFilters: ctx.history.showFilters,
      setShowFilters: ctx.setHistoryShowFilters,
      toggleShowFilters: ctx.toggleHistoryShowFilters,
      filterCount: ctx.historyFilterCount,
    };
  }
  return {
    query: ctx.myMeals.query,
    setQuery: ctx.setMyMealsQuery,
    filters: ctx.myMeals.filters,
    applyFilters: ctx.applyMyMealsFilters,
    clearFilters: ctx.clearMyMealsFilters,
    showFilters: ctx.myMeals.showFilters,
    setShowFilters: ctx.setMyMealsShowFilters,
    toggleShowFilters: ctx.toggleMyMealsShowFilters,
    filterCount: ctx.myMealsFilterCount,
  };
};
