'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Star, Target, Flame, Crown, Shield, Zap, Users,
  Lock, Award, CheckCircle2, Gift, TrendingUp, Coins, Sparkles,
  ArrowUpRight, CircleDot, Gem, ShieldCheck, Swords, Timer,
  Rocket, Wallet, Hexagon, Medal
} from 'lucide-react'
import { toast } from 'sonner'
import type { Locale } from '@/store/useI18nStore'

// ========================
// Types
// ========================
interface AchievementItem {
  id: string
  key: string
  nameEn: string
  nameEs: string
  namePt: string
  descEn: string
  descEs: string
  descPt: string
  icon: string
  condition: { type: string; value?: string | number }
  reward: { type: string; amount?: number }
  tier: string
  xpReward: number
  isActive: boolean
  order: number
  unlocked: boolean
  claimed: boolean
  claimedAt: string | null
  unlockedAt: string | null
  progress: number
  currentValue: number
  targetValue: number
}

interface AchievementsData {
  achievements: AchievementItem[]
  userAchievements: Array<{
    id: string
    achievementId: string
    unlockedAt: string
    claimed: boolean
    claimedAt: string | null
  }>
  xp: number
  level: number
  xpForNextLevel: number
  xpProgress: number
  unlockedCount: number
  totalCount: number
}

// ========================
// Icon mapping
// ========================
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Star, Target, Flame, Crown, Shield, Zap, Users,
  Lock, Award, Gift, TrendingUp, Coins, Sparkles, ArrowUpRight,
  CircleDot, Gem, ShieldCheck, Swords, Timer, Rocket, Wallet,
  Hexagon, Medal, CheckCircle2,
}

function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Trophy
  return <Icon className={className} />
}

// ========================
// Tier colors
// ========================
const tierConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
  bronze: { bg: 'bg-amber-700/20', border: 'border-amber-700/40', text: 'text-amber-600', label: 'Bronze' },
  silver: { bg: 'bg-gray-400/20', border: 'border-gray-400/40', text: 'text-gray-300', label: 'Silver' },
  gold: { bg: 'bg-[#8247E5]/20', border: 'border-[#8247E5]/40', text: 'text-[#8247E5]', label: 'Gold' },
  diamond: { bg: 'bg-cyan-400/20', border: 'border-cyan-400/40', text: 'text-cyan-400', label: 'Diamond' },
}

// ========================
// Staker tier from level
// ========================
function getStakerTier(level: number): { key: string; label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> } {
  if (level >= 10) return { key: 'diamond', label: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-400/20', border: 'border-cyan-400/40', icon: Gem }
  if (level >= 7) return { key: 'gold', label: 'Gold', color: 'text-[#8247E5]', bg: 'bg-[#8247E5]/20', border: 'border-[#8247E5]/40', icon: Crown }
  if (level >= 4) return { key: 'silver', label: 'Silver', color: 'text-gray-300', bg: 'bg-gray-400/20', border: 'border-gray-400/40', icon: Shield }
  return { key: 'bronze', label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-700/20', border: 'border-amber-700/40', icon: Award }
}

// ========================
// Get localized name/description
// ========================
function getLocalizedName(achievement: AchievementItem, locale: Locale): string {
  switch (locale) {
    case 'es': return achievement.nameEs || achievement.nameEn
    case 'pt': return achievement.namePt || achievement.nameEn
    default: return achievement.nameEn
  }
}

function getLocalizedDesc(achievement: AchievementItem, locale: Locale): string {
  switch (locale) {
    case 'es': return achievement.descEs || achievement.descEn
    case 'pt': return achievement.descPt || achievement.descEn
    default: return achievement.descEn
  }
}

// ========================
// Animation variants
// ========================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ========================
// Tier Badge Sub-component
// ========================
function TierBadge({ tier }: { tier: string }) {
  const config = tierConfig[tier] || tierConfig.bronze
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${config.bg} ${config.border} ${config.text}`}>
      {tier === 'diamond' && <Gem className="h-2.5 w-2.5" />}
      {tier === 'gold' && <Crown className="h-2.5 w-2.5" />}
      {tier === 'silver' && <Shield className="h-2.5 w-2.5" />}
      {tier === 'bronze' && <Award className="h-2.5 w-2.5" />}
      {config.label}
    </span>
  )
}

// ========================
// Achievement Card Sub-component
// ========================
function AchievementCard({
  achievement,
  locale,
  onClick,
  onClaim,
  isClaiming,
}: {
  achievement: AchievementItem
  locale: Locale
  onClick: () => void
  onClaim: () => void
  isClaiming: boolean
}) {
  const name = getLocalizedName(achievement, locale)
  const desc = getLocalizedDesc(achievement, locale)
  const isUnlocked = achievement.unlocked
  const isClaimed = achievement.claimed

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${
        isUnlocked
          ? 'glass-card border-[#8247E5]/30 hover:border-[#8247E5]/50 glow-poly'
          : 'glass-card opacity-60 grayscale-[30%] hover:grayscale-0 hover:opacity-80'
      }`}
    >
      {/* Golden glow overlay for unlocked */}
      {isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#8247E5]/5 via-transparent to-[#8247E5]/5 pointer-events-none" />
      )}

      {/* Lock overlay for locked */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-none z-10 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-black/40 flex items-center justify-center border border-white/10">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      <div className="relative p-4 sm:p-5 space-y-3">
        {/* Icon + Tier */}
        <div className="flex items-start justify-between">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
            isUnlocked ? 'bg-[#8247E5]/15 border border-[#8247E5]/20' : 'bg-white/5 border border-white/10'
          }`}>
            <AchievementIcon name={achievement.icon} className={`h-5 w-5 ${isUnlocked ? 'text-[#8247E5]' : 'text-gray-500'}`} />
          </div>
          <TierBadge tier={achievement.tier} />
        </div>

        {/* Name & Description */}
        <div className="space-y-1 min-h-[3rem]">
          <h3 className={`text-sm font-bold leading-tight ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
            {name}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {desc}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Progress</span>
            <span className={isUnlocked ? 'text-[#8247E5] font-medium' : 'text-gray-500'}>
              {achievement.progress}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full"
              style={{
                background: isUnlocked
                  ? 'linear-gradient(90deg, #6B33D4, #8247E5, #9B6DFF)'
                  : 'linear-gradient(90deg, rgba(130,71,229,0.3), rgba(130,71,229,0.5))',
              }}
            />
          </div>
        </div>

        {/* XP Reward & Claim Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#8247E5]" />
            <span className="text-xs font-semibold text-[#8247E5]">
              +{achievement.xpReward} XP
            </span>
          </div>

          {isUnlocked && isClaimed ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Claimed
            </span>
          ) : isUnlocked && !isClaimed ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onClaim()
              }}
              disabled={isClaiming}
              className="btn-poly h-7 px-3 rounded-lg text-xs gap-1 font-semibold"
            >
              {isClaiming ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-3 w-3 border-2 border-[#0a0a0f] border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Gift className="h-3 w-3" />
                  Claim
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

// ========================
// Achievement Detail Modal
// ========================
function AchievementDetailModal({
  achievement,
  locale,
  open,
  onOpenChange,
  onClaim,
  isClaiming,
}: {
  achievement: AchievementItem | null
  locale: Locale
  open: boolean
  onOpenChange: (open: boolean) => void
  onClaim: () => void
  isClaiming: boolean
}) {
  if (!achievement) return null

  const name = getLocalizedName(achievement, locale)
  const desc = getLocalizedDesc(achievement, locale)
  const isUnlocked = achievement.unlocked
  const isClaimed = achievement.claimed
  const tierInfo = tierConfig[achievement.tier] || tierConfig.bronze

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-[#8247E5]/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <DialogDescription className="sr-only">{desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Icon & Tier */}
          <div className="flex flex-col items-center text-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={`relative h-20 w-20 rounded-2xl flex items-center justify-center ${
                isUnlocked
                  ? 'bg-[#8247E5]/15 border-2 border-[#8247E5]/30 glow-poly'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <AchievementIcon name={achievement.icon} className={`h-9 w-9 ${isUnlocked ? 'text-[#8247E5]' : 'text-gray-500'}`} />
              {isUnlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </motion.div>
              )}
            </motion.div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>

            <TierBadge tier={achievement.tier} />
          </div>

          {/* Progress Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-[#8247E5] font-bold">{achievement.progress}%</span>
            </div>

            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${achievement.progress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: isUnlocked
                    ? 'linear-gradient(90deg, #6B33D4, #8247E5, #9B6DFF)'
                    : 'linear-gradient(90deg, rgba(130,71,229,0.3), rgba(130,71,229,0.5))',
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Current: {achievement.currentValue}</span>
              <span>Target: {achievement.targetValue}</span>
            </div>
          </div>

          {/* Reward Details */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rewards</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8247E5]" />
                <span className="text-sm text-white">Experience Points</span>
              </div>
              <span className="text-sm font-bold text-[#8247E5]">+{achievement.xpReward} XP</span>
            </div>
            {achievement.reward && achievement.reward.type && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-white">{achievement.reward.type}</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">
                  {achievement.reward.amount ? `$${achievement.reward.amount}` : 'Bonus'}
                </span>
              </div>
            )}
          </div>

          {/* Unlock status */}
          {!isUnlocked && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <Lock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-400">Complete the requirements to unlock this achievement</span>
            </div>
          )}

          {/* Claim Button */}
          {isUnlocked && !isClaimed && (
            <Button
              onClick={onClaim}
              disabled={isClaiming}
              className="btn-poly w-full h-12 rounded-xl text-sm gap-2 font-semibold"
            >
              {isClaiming ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 border-2 border-[#0a0a0f] border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Claim Reward
                </>
              )}
            </Button>
          )}

          {isUnlocked && isClaimed && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Reward Claimed</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ========================
// Main Component
// ========================
export function AchievementsPage() {
  const { t, locale } = useTranslation()
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const queryClient = useQueryClient()
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch achievements
  const { data, isLoading, isError } = useQuery<AchievementsData>({
    queryKey: ['achievements', currentWallet],
    queryFn: () => fetch(`/api/achievements?wallet=${currentWallet}`).then(r => r.json()),
    enabled: !!currentWallet,
  })

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: currentWallet, achievementId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to claim')
      }
      return res.json()
    },
    onSuccess: (result) => {
      toast.success(`Reward claimed! +${result.xpEarned} XP earned`)
      queryClient.invalidateQueries({ queryKey: ['achievements', currentWallet] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to claim reward')
    },
  })

  // Handlers
  const handleCardClick = (achievement: AchievementItem) => {
    setSelectedAchievement(achievement)
    setDialogOpen(true)
  }

  const handleClaim = (achievementId: string) => {
    claimMutation.mutate(achievementId)
  }

  // Computed values
  const level = data?.level ?? 1
  const xp = data?.xp ?? 0
  const xpForNextLevel = data?.xpForNextLevel ?? 100
  const xpProgress = data?.xpProgress ?? 0
  const achievements = data?.achievements ?? []
  const unlockedCount = data?.unlockedCount ?? 0
  const totalCount = data?.totalCount ?? achievements.length
  const stakerTier = getStakerTier(level)

  // Stats
  const claimedCount = achievements.filter(a => a.claimed).length
  const totalXpEarned = achievements.filter(a => a.claimed).reduce((sum, a) => sum + a.xpReward, 0)
  const nextToUnlock = achievements.find(a => !a.unlocked && a.progress > 0)

  // ========================
  // Not connected - Empty State
  // ========================
  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex flex-col">
        <PageHeader title={t('achievements_title') !== 'achievements_title' ? t('achievements_title') : 'Achievements'} description={t('achievements_description') !== 'achievements_description' ? t('achievements_description') : 'Track your milestones and earn rewards'} />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center max-w-md mx-auto px-4"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative inline-block mb-8"
            >
              <div className="absolute inset-0 rounded-3xl bg-[#8247E5]/10 blur-3xl scale-150" />
              <div className="relative p-6 rounded-3xl glass-card glow-poly-strong">
                <Trophy className="h-14 w-14 text-[#8247E5]" strokeWidth={1.5} />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-bold text-white mb-3"
            >
              {t('achievements_connect_title') !== 'achievements_connect_title' ? t('achievements_connect_title') : 'Connect to Unlock Achievements'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed"
            >
              {t('achievements_connect_desc') !== 'achievements_connect_desc' ? t('achievements_connect_desc') : 'Connect your wallet to start earning achievements, track your XP, and claim rewards as you stake and grow your network on Polygon.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              {[
                { icon: Trophy, text: '8 Achievements' },
                { icon: Sparkles, text: 'Earn XP' },
                { icon: Gift, text: 'Claim Rewards' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs text-gray-400">
                  <item.icon className="h-4 w-4 text-[#8247E5]" />
                  {item.text}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  // ========================
  // Connected - Full Page
  // ========================
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div variants={fadeUpVariants}>
        <PageHeader
          title={t('achievements_title') !== 'achievements_title' ? t('achievements_title') : 'Achievements'}
          accentWord="Achievements"
          description={t('achievements_description') !== 'achievements_description' ? t('achievements_description') : 'Track your milestones, earn XP, and level up'}
        />
      </motion.div>

      {/* Level & XP Header */}
      <motion.div variants={fadeUpVariants}>
        <Card className="glass-card glow-poly overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Level Badge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="relative shrink-0"
              >
                {/* Golden ring */}
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full flex items-center justify-center relative">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8247E5]/30 via-[#9B6DFF]/10 to-[#6B33D4]/20 animate-pulse-glow" />
                  {/* Border ring */}
                  <div className="absolute inset-[3px] rounded-full border-2 border-[#8247E5]/40" />
                  {/* Inner background */}
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] flex flex-col items-center justify-center border-2 border-[#8247E5]/50">
                    <span className="text-2xl sm:text-3xl font-extrabold text-gradient-poly">Level</span>
                    <span className="text-3xl sm:text-4xl font-black text-[#8247E5]">{level}</span>
                  </div>
                </div>
              </motion.div>

              {/* XP Progress & Tier Info */}
              <div className="flex-1 w-full space-y-4">
                {/* Staker Tier Badge */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${stakerTier.bg} ${stakerTier.border}`}>
                    <stakerTier.icon className={`h-4 w-4 ${stakerTier.color}`} />
                    <span className={`text-sm font-bold ${stakerTier.color}`}>{stakerTier.label} Staker</span>
                  </div>
                </div>

                {/* XP Text */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    XP: <span className="text-[#8247E5] font-semibold">{xp}</span> / <span className="text-white font-medium">{xpForNextLevel}</span> to Level {level + 1}
                  </p>

                  {/* XP Progress Bar */}
                  <div className="h-4 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(90deg, #6B33D4, #8247E5, #9B6DFF)',
                      }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 animate-shimmer" />
                    </motion.div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-[#8247E5]" />
                    <span className="text-gray-400">{unlockedCount}/{totalCount} Unlocked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#8247E5]" />
                    <span className="text-gray-400">{xp} Total XP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-gray-400">{claimedCount} Claimed</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Summary */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: Trophy,
            label: t('achievements_total') !== 'achievements_total' ? t('achievements_total') : 'Total Achievements',
            value: `${unlockedCount}/${totalCount}`,
            color: 'text-[#8247E5]',
            bg: 'bg-[#8247E5]/10',
          },
          {
            icon: Sparkles,
            label: t('achievements_xp_earned') !== 'achievements_xp_earned' ? t('achievements_xp_earned') : 'Total XP Earned',
            value: totalXpEarned.toString(),
            color: 'text-[#8247E5]',
            bg: 'bg-[#8247E5]/10',
          },
          {
            icon: CheckCircle2,
            label: t('achievements_claimed') !== 'achievements_claimed' ? t('achievements_claimed') : 'Achievements Claimed',
            value: `${claimedCount}`,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            icon: Target,
            label: t('achievements_next') !== 'achievements_next' ? t('achievements_next') : 'Next to Unlock',
            value: nextToUnlock
              ? `${nextToUnlock.progress}%`
              : '—',
            color: 'text-cyan-400',
            bg: 'bg-cyan-400/10',
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="glass-card hover:border-[#8247E5]/30 transition-all duration-300">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-[11px] text-gray-500 truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Achievement Grid */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={8} />
      ) : isError ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Flame className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-400">{t('achievements_error') !== 'achievements_error' ? t('achievements_error') : 'Failed to load achievements. Please try again.'}</p>
          </CardContent>
        </Card>
      ) : achievements.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Trophy className="h-10 w-10 text-[#8247E5] mx-auto mb-3" />
            <p className="text-gray-400">{t('achievements_empty') !== 'achievements_empty' ? t('achievements_empty') : 'No achievements available yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
        >
          <AnimatePresence>
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                locale={locale}
                onClick={() => handleCardClick(achievement)}
                onClaim={() => handleClaim(achievement.id)}
                isClaiming={claimMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Achievement Detail Modal */}
      <AchievementDetailModal
        achievement={selectedAchievement}
        locale={locale}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClaim={() => {
          if (selectedAchievement) {
            handleClaim(selectedAchievement.id)
            setDialogOpen(false)
          }
        }}
        isClaiming={claimMutation.isPending}
      />
    </motion.div>
  )
}
