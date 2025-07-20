import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en_common from "./locales/en/common.json";
import en_login from "./locales/en/login.json";
import pl_common from "./locales/pl/common.json";
import pl_login from "./locales/pl/login.json";

const languageDetector = {
  type: "languageDetector",
  async: true,
  detect: (cb: (lang: string) => void) => {
    const locales = Localization.getLocales();
    cb(locales[0]?.languageCode || "pl");
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector as any)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    ns: ["common", "login"],
    defaultNS: "common",
    resources: {
      en: { common: en_common, login: en_login },
      pl: { common: pl_common, login: pl_login },
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
