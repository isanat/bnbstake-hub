'use client'

import { useEffect } from 'react'
import { useI18nStore, Locale } from '@/store/useI18nStore'

export function useTranslation() {
  const { locale, translations, isLoaded, setLocale, t, loadTranslations } = useI18nStore()

  useEffect(() => {
    if (!isLoaded || Object.keys(translations).length === 0) {
      loadTranslations(locale)
    }
  }, [])

  return {
    t,
    locale,
    setLocale,
    isLoaded,
  }
}
