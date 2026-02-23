import { useEffect } from "react";
import { on } from "@/services/events";
import { Toast, ToastContainer } from "./Toast";
import i18n from "@/i18n";

type ToastPayload = {
  text?: unknown;
  key?: unknown;
  ns?: unknown;
  options?: unknown;
};

export function ToastBridge() {
  useEffect(() => {
    const unsub = on<ToastPayload>("ui:toast", (payload) => {
      const directText =
        typeof payload?.text === "string" ? payload.text.trim() : "";
      if (directText) {
        Toast.show(directText);
        return;
      }

      const key = typeof payload?.key === "string" ? payload.key : "";
      if (!key) return;
      const ns = typeof payload?.ns === "string" ? payload.ns : undefined;
      const options =
        payload?.options && typeof payload.options === "object"
          ? (payload.options as Record<string, unknown>)
          : undefined;
      const translated = i18n.t(key, { ns, ...(options || {}) }).trim();
      if (translated) Toast.show(translated);
    });
    return () => {
      unsub();
    };
  }, []);

  return <ToastContainer />;
}
