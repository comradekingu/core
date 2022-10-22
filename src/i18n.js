import { createI18n } from "vue-i18n";

import en from "../translations/messages.en.json";

const fallbackLocale = "fr";
let locale = localStorage.getItem("locale");
if (!locale) {
  locale = fallbackLocale;
  localStorage.setItem("locale", fallbackLocale);
}
export const i18n = createI18n({
  locale,
  fallbackLocale,
  formatFallbackMessages: true,
  silentTranslationWarn: true,
  messages: {
    en,
    fr: Object.keys(en).reduce((acc, value) => ({ ...acc, [value]: value })),
  },
  globalInjection: true,
});
