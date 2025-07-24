import { useEffect, useRef } from "react";
import * as SecureStore from "expo-secure-store";

export function useSoftSave<T>(
  key: string,
  value: T,
  setValue: (v: T) => void
) {
  const initialized = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await SecureStore.getItemAsync(key);
      if (data) {
        setValue(JSON.parse(data));
      }
      initialized.current = true;
    })();
  }, [key]);

  useEffect(() => {
    if (initialized.current) {
      SecureStore.setItemAsync(key, JSON.stringify(value));
    }
  }, [key, value]);
}
