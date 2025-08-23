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

type HistoryContextValue = {
  query: string;
  setQuery: (v: string) => void;
  filters: Filters | null;
  applyFilters: (f: Filters) => void;
  clearFilters: () => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  toggleShowFilters: () => void;
  filterCount: number;
};

const HistoryContext = createContext<HistoryContextValue | undefined>(
  undefined
);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filterCount = useMemo(
    () => Object.values(filters || {}).filter(Boolean).length,
    [filters]
  );

  const applyFilters = useCallback((f: Filters) => {
    setFilters(f);
    setShowFilters(false);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(null);
    setShowFilters(false);
  }, []);

  const toggleShowFilters = useCallback(() => {
    setShowFilters((v) => !v);
  }, []);

  const value: HistoryContextValue = {
    query,
    setQuery,
    filters,
    applyFilters,
    clearFilters,
    showFilters,
    setShowFilters,
    toggleShowFilters,
    filterCount,
  };

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
};

export const useHistoryContext = (): HistoryContextValue => {
  const ctx = useContext(HistoryContext);
  if (!ctx)
    throw new Error("useHistoryContext must be used within HistoryProvider");
  return ctx;
};
