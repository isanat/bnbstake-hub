'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/hooks/useTranslation'
import { Locale } from '@/store/useI18nStore'

const languages: { code: Locale; flag: string; label: string; nativeLabel: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English', nativeLabel: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'Español', nativeLabel: 'ES' },
  { code: 'pt', flag: '🇧🇷', label: 'Português', nativeLabel: 'PT' },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()
  const currentLanguage = languages.find((l) => l.code === locale) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-gray-400 hover:text-[#F0B90B] hover:bg-[#F0B90B]/10 h-8 px-2.5 rounded-lg border border-white/5 hover:border-[#F0B90B]/20 transition-all"
        >
          <span className="text-sm leading-none">{currentLanguage.flag}</span>
          <span className="text-xs font-medium hidden sm:inline">{currentLanguage.nativeLabel}</span>
          <Globe className="h-3.5 w-3.5 hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#13131a] border-[#F0B90B]/15 shadow-xl shadow-black/40 min-w-[160px] rounded-xl p-1.5"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-all text-sm ${
              locale === lang.code
                ? 'bg-[#F0B90B]/10 text-[#F0B90B] focus:bg-[#F0B90B]/15 focus:text-[#F0B90B]'
                : 'text-gray-400 focus:bg-white/5 focus:text-gray-200'
            }`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="font-medium">{lang.label}</span>
            {locale === lang.code && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F0B90B]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
