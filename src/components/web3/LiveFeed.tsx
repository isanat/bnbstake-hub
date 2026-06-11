'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from '@/hooks/useTranslation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Users,
  Coins,
  Activity,
} from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'

// ===== Types =====
interface LiveTransaction {
  id: string
  type: 'stake' | 'commission' | 'referral' | 'withdraw'
  wallet: string
  message: string
  amount?: number
  timestamp: string
}

interface LiveFeedResponse {
  transactions: LiveTransaction[]
  count: number
  generatedAt: string
}

interface LiveFeedProps {
  variant?: 'feed' | 'ticker'
}

// ===== Type Config =====
const typeConfig: Record<
  string,
  { icon: typeof ArrowUpRight; color: string; bgColor: string; label: string }
> = {
  stake: {
    icon: ArrowUpRight,
    color: 'text-[#8247E5]',
    bgColor: 'bg-[#8247E5]/10',
    label: 'Stake',
  },
  commission: {
    icon: Gift,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    label: 'Commission',
  },
  referral: {
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    label: 'Referral',
  },
  withdraw: {
    icon: ArrowDownRight,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Withdraw',
  },
}

// ===== Time Ago Helper =====
function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// ===== Format Amount =====
function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`
  }
  return `$${amount.toLocaleString()}`
}

// ===== Feed Variant =====
function FeedVariant({ transactions }: { transactions: LiveTransaction[] }) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new transactions arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [transactions])

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#8247E5]/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#8247E5]" />
          <span className="text-sm font-semibold text-white">{t('live_feed')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">{t('live_label')}</span>
        </div>
      </div>

      {/* Transaction List */}
      <div
        ref={scrollRef}
        className="max-h-80 overflow-y-auto custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {transactions.map((tx, index) => {
            const config = typeConfig[tx.type] || typeConfig.stake
            const Icon = config.icon
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.03,
                  ease: 'easeOut',
                }}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                {/* Type Icon */}
                <div
                  className={`h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{tx.message}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {timeAgo(tx.timestamp)}
                  </p>
                </div>

                {/* Amount */}
                {tx.amount !== undefined && tx.amount > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white">
                      {formatAmount(tx.amount)}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${config.color}`}
                    >
                      {config.label}
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#8247E5]/10">
        <p className="text-[10px] text-gray-600 text-center">
          {t('updates_every')} 15s &middot; {t('last_refresh')}: {' '}
          {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

// ===== Ticker Variant =====
function TickerVariant({ transactions }: { transactions: LiveTransaction[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextIndex = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % transactions.length)
  }, [transactions.length])

  useEffect(() => {
    if (transactions.length === 0) return
    const interval = setInterval(nextIndex, 3000)
    return () => clearInterval(interval)
  }, [transactions.length, nextIndex])

  if (transactions.length === 0) return null

  const tx = transactions[currentIndex]
  if (!tx) return null

  const config = typeConfig[tx.type] || typeConfig.stake
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2 h-8 overflow-hidden">
      {/* Live dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>

      {/* Cycling transaction */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tx.id + currentIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="flex items-center gap-2 min-w-0"
        >
          <div
            className={`h-5 w-5 rounded ${config.bgColor} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-3 w-3 ${config.color}`} />
          </div>
          <span className="text-xs text-gray-300 truncate max-w-[200px] sm:max-w-none">
            {tx.message}
          </span>
          {tx.amount !== undefined && tx.amount > 0 && (
            <span className="text-xs font-semibold text-[#8247E5] shrink-0">
              {formatAmount(tx.amount)}
            </span>
          )}
          <span className="text-[10px] text-gray-600 shrink-0">
            {timeAgo(tx.timestamp)}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ===== Main LiveFeed Component =====
export function LiveFeed({ variant = 'feed' }: LiveFeedProps) {
  const { t } = useTranslation()
  const { data, isLoading, error } = useQuery<LiveFeedResponse>({
    queryKey: ['notifications', 'live'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/live')
      if (!res.ok) throw new Error('Failed to fetch live feed')
      return res.json()
    },
    refetchInterval: 15000,
  })

  const transactions = data?.transactions ?? []

  // Loading state for feed variant
  if (isLoading && transactions.length === 0) {
    if (variant === 'ticker') {
      return (
        <div className="flex items-center gap-2 h-8">
          <Coins className="h-4 w-4 text-[#8247E5] animate-pulse" />
          <span className="text-xs text-gray-500">{t('loading')}...</span>
        </div>
      )
    }
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#8247E5]/10">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#8247E5]" />
            <span className="text-sm font-semibold text-white">{t('live_feed')}</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-2 w-1/4 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    if (variant === 'ticker') return null
    return (
      <div className="glass-card rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-500">{t('unable_load_feed')}</p>
      </div>
    )
  }

  if (variant === 'ticker') {
    return <TickerVariant transactions={transactions} />
  }

  return <FeedVariant transactions={transactions} />
}
