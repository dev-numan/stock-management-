import { useLanguageStore } from '../stores/languageStore';

/** @returns {{ t: (key: string, params?: object) => string, locale: string, isRtl: boolean }} */
export function useTranslation() {
  const locale = useLanguageStore((s) => s.locale);
  const t = useLanguageStore((s) => s.t);
  return { t, locale, isRtl: locale === 'ur' };
}
