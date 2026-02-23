export type DataViewState =
  | "loading"
  | "ready"
  | "empty"
  | "offline-empty"
  | "error";

export function resolveDataViewState(input: {
  isLoading: boolean;
  hasData: boolean;
  isOnline: boolean;
  hasError: boolean;
}): DataViewState {
  const { isLoading, hasData, isOnline, hasError } = input;
  if (isLoading && !hasData) return "loading";
  if (hasError && !hasData) return "error";
  if (!hasData && !isOnline) return "offline-empty";
  if (!hasData) return "empty";
  return "ready";
}
