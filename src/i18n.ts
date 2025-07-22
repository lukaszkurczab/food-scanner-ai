import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en_common from "./locales/en/common.json";
import en_login from "./locales/en/login.json";
import en_terms from "./locales/en/terms.json";
import en_privacy from "./locales/en/privacy.json";
import en_resetPassword from "./locales/en/resetPassword.json";
import en_onboarding from "./locales/en/onboarding.json";
import pl_common from "./locales/pl/common.json";
import pl_login from "./locales/pl/login.json";
import pl_terms from "./locales/pl/terms.json";
import pl_privacy from "./locales/pl/privacy.json";
import pl_resetPassword from "./locales/pl/resetPassword.json";

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
    ns: ["common", "login", "terms", "privacy", "resetPassword", "onboarding"],
    defaultNS: "common",
    resources: {
      en: {
        common: en_common,
        login: en_login,
        terms: en_terms,
        privacy: en_privacy,
        resetPassword: en_resetPassword,
        onboarding: en_onboarding,
      },
      pl: {
        common: pl_common,
        login: pl_login,
        terms: pl_terms,
        privacy: pl_privacy,
        resetPassword: pl_resetPassword,
      },
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
