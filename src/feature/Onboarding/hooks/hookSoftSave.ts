import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export function useSoftSave<T>(
  key: string,
  value: T,
  setValue: (v: T) => void
) {
  useEffect(() => {
    SecureStore.setItemAsync(key, JSON.stringify(value));
  }, [key, value]);

  useEffect(() => {
    SecureStore.getItemAsync(key).then((data) => {
      if (data) setValue(JSON.parse(data));
    });
  }, [key]);
}
