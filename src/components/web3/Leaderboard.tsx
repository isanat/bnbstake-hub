'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Medal, Crown, Users, TrendingUp, Gift,
  ChevronUp, Star, Zap, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Types
type LeaderboardType = 'earners' | 'stakers' | 'referrers'
type PeriodType = 'week' | 'all'

interface LeaderboardEntry {
  rank: number
  walletAddress: string
  value: number
  level: number
  xp: number
  totalStaked?: number
}

interface LeaderboardResponse {
  type: string
  period: string
  leaderboard: LeaderboardEntry[]
  userRank: number | null
  total: number
}

// Tab config
const TYPE_TABS: { key: LeaderboardType; label: string; icon: typeof Trophy }[] = [
  { key: 'earners', label: 'Top Earners', icon: TrendingUp },
  { key: 'stakers', label: 'Top Stakers', icon: Zap },
  { key: 'referrers', label: 'Top Referrers', icon: Users },
]

const PERIOD_TABS: { key: PeriodType; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All Time' },
]

// Medal component for top 3
function MedalBadge({ rank }: { rank: number }) {
  const medals: Record<number, { emoji: string; bgClass: string; borderClass: string; glowClass: string }> = {
    1: {
      emoji: '🥇',
      bgClass: 'bg-[#F0B90B]/10',
      borderClass: 'border-[#F0B90B]/30',
      glowClass: 'shadow-[0_0_15px_rgba(240,185,11,0.2)]',
    },
    2: {
      emoji: '🥈',
      bgClass: 'bg-gray-400/10',
      borderClass: 'border-gray-400/30',
      glowClass: 'shadow-[0_0_12px_rgba(156,163,175,0.15)]',
    },
    3: {
      emoji: '🥉',
      bgClass: 'bg-amber-600/10',
      borderClass: 'border-amber-600/30',
      glowClass: 'shadow-[0_0_12px_rgba(217,119,6,0.15)]',
    },
  }

  const medal = medals[rank]
  if (!medal) return null

  return (
    <div className={`flex items-center justify-center h-9 w-9 rounded-xl border ${medal.bgClass} ${medal.borderClass} ${medal.glowClass}`}>
      <span className="text-lg">{medal.emoji}</span>
    </div>
  )
}

// Level badge
function LevelBadge({ level }: { level: number }) {
  const getLevelColor = (lvl: number) => {
    if (lvl >= 8) return 'text-[#F0B90B] bg-[#F0B90B]/10 border-[#F0B90B]/20'
    if (lvl >= 5) return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    if (lvl >= 3) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
  }

  return (
    <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 h-5 rounded-md ${getLevelColor(level)}`}>
      Lv.{level}
    </Badge>
  )
}

// Format value based on type
function formatValue(value: number, type: LeaderboardType): string {
  if (type === 'referrers') {
    return `${value} ${value === 1 ? 'ref' : 'refs'}`
  }
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

// Leaderboard row component
function LeaderboardRow({
  entry,
  type,
  index,
  isCurrentUser,
}: {
  entry: LeaderboardEntry
  type: LeaderboardType
  index: number
  isCurrentUser: boolean
}) {
  const isTop3 = entry.rank <= 3

  const rowStyles = isTop3
    ? entry.rank === 1
      ? 'bg-[#F0B90B]/5 border-[#F0B90B]/20 hover:bg-[#F0B90B]/10'
      : entry.rank === 2
      ? 'bg-gray-400/5 border-gray-400/15 hover:bg-gray-400/8'
      : 'bg-amber-600/5 border-amber-600/15 hover:bg-amber-600/8'
    : 'border-white/5 hover:border-[#F0B90B]/15 hover:bg-white/[0.02]'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`
        flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
        ${rowStyles}
        ${isCurrentUser ? 'ring-1 ring-[#F0B90B]/30 bg-[#F0B90B]/5' : ''}
      `}
    >
      {/* Rank / Medal */}
      <div className="shrink-0 w-9 flex items-center justify-center">
        {isTop3 ? (
          <MedalBadge rank={entry.rank} />
        ) : (
          <span className="text-sm font-bold text-gray-500">#{entry.rank}</span>
        )}
      </div>

      {/* Wallet Address */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate font-mono">
            {entry.walletAddress}
          </span>
          {isCurrentUser && (
            <Badge className="bg-[#F0B90B]/15 text-[#F0B90B] border-[#F0B90B]/20 text-[9px] h-4 px-1.5">
              YOU
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <LevelBadge level={entry.level} />
          <span className="text-[10px] text-gray-600">{entry.xp} XP</span>
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${isTop3 ? 'text-gradient-bnb' : 'text-white'}`}>
          {formatValue(entry.value, type)}
        </p>
        {type === 'stakers' && entry.totalStaked && (
          <p className="text-[10px] text-gray-600">Total: ${entry.totalStaked.toLocaleString()}</p>
        )}
      </div>
    </motion.div>
  )
}

// Loading skeleton
function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] animate-pulse">
          <div className="h-9 w-9 rounded-xl bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-28 rounded bg-white/5" />
            <div className="h-3 w-16 rounded bg-white/5" />
          </div>
          <div className="h-4 w-16 rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}

// Empty state
function EmptyLeaderboard() {
  const { t } = useTranslation()
  return (
    <div className="py-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-[#F0B90B]/10 flex items-center justify-center mx-auto mb-4">
        <Trophy className="h-7 w-7 text-[#F0B90B]/50" />
      </div>
      <p className="text-sm text-gray-500 mb-1">{t('no_data')}</p>
      <p className="text-xs text-gray-600">{t('leaderboard_description')}</p>
    </div>
  )
}

export function Leaderboard() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const { t } = useTranslation()
  const [activeType, setActiveType] = useState<LeaderboardType>('earners')
  const [activePeriod, setActivePeriod] = useState<PeriodType>('week')

  // Fetch leaderboard data
  const { data, isLoading, error } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', activeType, activePeriod],
    queryFn: () =>
      fetch(`/api/leaderboard?type=${activeType}&period=${activePeriod}&limit=20${currentWallet ? `&wallet=${currentWallet}` : ''}`)
        .then(r => r.json()),
    staleTime: 30000,
  })

  const entries = data?.leaderboard || []
  const userRank = data?.userRank

  // Value label based on type
  const valueLabel = useMemo(() => {
    switch (activeType) {
      case 'earners': return 'Earned'
      case 'stakers': return 'Staked'
      case 'referrers': return 'Referrals'
    }
  }, [activeType])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
    >
      <Card className="glass-card overflow-hidden transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#F0B90B]/10">
                <Trophy className="h-5 w-5 text-[#F0B90B]" />
              </div>
              {t('leaderboard_title')}
            </CardTitle>
            <Badge className="bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20 hover:bg-[#F0B90B]/20 text-xs">
              <Crown className="h-3 w-3 mr-1" />
              {data?.total || 0} {t('players')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Type Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium
                  transition-all duration-300 whitespace-nowrap shrink-0
                  ${activeType === tab.key
                    ? 'bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/25 shadow-[0_0_12px_rgba(240,185,11,0.1)]'
                    : 'bg-[#0a0a0f]/40 text-gray-500 border border-white/5 hover:text-gray-300 hover:border-white/10'
                  }
                `}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Period Toggle */}
          <div className="flex gap-1.5">
            {PERIOD_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActivePeriod(tab.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-300
                  ${activePeriod === tab.key
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'bg-transparent text-gray-500 hover:text-gray-300'
                  }
                `}
              >
                {tab.key === 'week' && <Star className="h-3 w-3" />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table Header */}
          <div className="flex items-center gap-3 px-3 text-[10px] uppercase tracking-wider text-gray-600 font-medium">
            <span className="w-9 text-center">{t('rank')}</span>
            <span className="flex-1">{t('wallet')}</span>
            <span className="text-right">{valueLabel}</span>
          </div>

          {/* Leaderboard Entries */}
          {isLoading ? (
            <LeaderboardSkeleton />
          ) : error ? (
            <EmptyLeaderboard />
          ) : entries.length === 0 ? (
            <EmptyLeaderboard />
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence mode="popLayout">
                {entries.map((entry, index) => (
                  <LeaderboardRow
                    key={`${activeType}-${activePeriod}-${entry.rank}`}
                    entry={entry}
                    type={activeType}
                    index={index}
                    isCurrentUser={
                      !!currentWallet &&
                      entry.walletAddress.toLowerCase().includes(currentWallet.slice(2, 6).toLowerCase())
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* User's Rank */}
          {currentWallet && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 rounded-xl bg-[#F0B90B]/5 border border-[#F0B90B]/15 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#F0B90B]" />
                <span className="text-sm text-gray-300">{t('you_rank')}</span>
              </div>
              <span className="text-sm font-bold text-[#F0B90B]">
                {userRank ? `#${userRank}` : t('not_ranked')}
              </span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
