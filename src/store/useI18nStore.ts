'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultTranslations } from '@/lib/defaultTranslations'

export type Locale = 'en' | 'es' | 'pt'

interface I18nState {
  locale: Locale
  translations: Record<string, string>
  isLoaded: boolean
  setLocale: (locale: Locale) => void
  setTranslations: (translations: Record<string, string>) => void
  t: (key: string, params?: Record<string, string | number>) => string
  loadTranslations: (locale: Locale) => Promise<void>
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      translations: {},
      isLoaded: false,

      setLocale: (locale: Locale) => {
        set({ locale })
        get().loadTranslations(locale)
      },

      setTranslations: (translations: Record<string, string>) => {
        set({ translations, isLoaded: true })
      },

      t: (key: string, params?: Record<string, string | number>) => {
        const { translations } = get()
        let value = translations[key] || defaultTranslations[key] || key
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            value = value.replace(`{${k}}`, String(v))
          })
        }
        return value
      },

      loadTranslations: async (locale: Locale) => {
        try {
          const res = await fetch(`/api/translations?locale=${locale}`)
          if (res.ok) {
            const data = await res.json()
            set({ translations: data.translations, isLoaded: true, locale })
          }
        } catch (err) {
          console.error('Failed to load translations:', err)
        }
      },
    }),
    {
      name: 'polystake-i18n',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
)
