'use client'

import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery } from '@tanstack/react-query'
import {
  Wallet, TrendingUp, Clock, Coins, Users, Gift,
  ArrowUpRight, ExternalLink, Zap,
  Hexagon, Shield, Flame, Network, Layers
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Leaderboard } from '@/components/web3/Leaderboard'

interface UserData {
  user: {
    id: string
    walletAddress: string
    referralCode: string
    isAdmin: boolean
    isActive: boolean
    totalStaked: number
    totalEarned: number
    totalWithdrawn: number
    leftVolume: number
    rightVolume: number
  }
  stats: {
    activeStakes: number
    totalStakedInActiveStakes: number
    networkSize: number
    directReferrals: number
    totalCommissions: number
    totalTransactions: number
  }
}

interface StakingData {
  plans: Array<{
    id: string
    name: string
    description: string
    durationDays: number
    apy: number
    minAmount: number
    maxAmount: number
    isActive: boolean
    earlyWithdrawPenalty: number
  }>
  stakes: Array<{
    id: string
    amount: number
    startDate: string
    endDate: string
    status: string
    pendingRewards: number
    plan: { name: string; apy: number; durationDays: number }
  }>
  summary: {
    totalStaked: number
    totalPendingRewards: number
    activeStakesCount: number
    totalStakesCount: number
  }
}

interface CommissionData {
  commissions: Array<{
    id: string
    amount: number
    type: string
    level: number
    status: string
    description: string
    createdAt: string
    fromUser: { walletAddress: string; referralCode: string }
  }>
  pagination: { page: number; limit: number; total: number; totalPages: number }
  summary: {
    total: { amount: number; count: number }
    pending: { amount: number; count: number }
    distributed: { amount: number; count: number }
    unilevel: { amount: number; count: number }
    binary: { amount: number; count: number }
  }
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl px-3 py-2 shadow-2xl glow-poly">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gradient-poly">
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

export function DashboardPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const setPage = useAppStore(s => s.setPage)
  const { t } = useTranslation()

  const { data: userData, isLoading: userLoading } = useQuery<UserData>({
    queryKey: ['user', currentWallet],
    queryFn: () => fetch(`/api/user?wallet=${currentWallet}`).then(r => r.json()),
    enabled: !!currentWallet,
  })

  const { data: stakingData, isLoading: stakingLoading } = useQuery<StakingData>({
    queryKey: ['staking', currentWallet],
    queryFn: () => fetch(`/api/staking?wallet=${currentWallet}`).then(r => r.json()),
    enabled: !!currentWallet,
  })

  const { data: commissionData, isLoading: commissionLoading } = useQuery<CommissionData>({
    queryKey: ['commissions', currentWallet],
    queryFn: () => fetch(`/api/commissions?wallet=${currentWallet}`).then(r => r.json()),
    enabled: !!currentWallet,
  })

  // Not connected — engaging empty state
  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex flex-col">
        <PageHeader title={t('title')} description={t('connect_wallet_desc')} />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center max-w-md mx-auto px-4"
          >
            {/* Animated wallet icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative inline-block mb-8"
            >
              <div className="absolute inset-0 rounded-3xl bg-[#8247E5]/10 blur-3xl scale-150" />
              <div className="relative p-6 sm:p-8 rounded-3xl glass-card glow-poly-strong">
                <Wallet className="h-14 w-14 sm:h-16 sm:w-16 text-[#8247E5]" strokeWidth={1.5} />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-bold text-white mb-3"
            >
              {t('connect_wallet_title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed"
            >
              {t('connect_wallet_desc')}
            </motion.p>

            {/* Feature badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-xs text-gray-400 min-h-[44px]">
                <Shield className="h-4 w-4 text-[#8247E5] shrink-0" />
                {t('non_custodial')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-xs text-gray-400 min-h-[44px]">
                <Flame className="h-4 w-4 text-[#8247E5] shrink-0" />
                {t('up_to_daily')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-xs text-gray-400 min-h-[44px]">
                <Hexagon className="h-4 w-4 text-[#8247E5] shrink-0" />
                {t('network_label')}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const isLoading = userLoading || stakingLoading || commissionLoading

  const user = userData?.user
  const stakingSummary = stakingData?.summary
  const commissionSummary = commissionData?.summary
  const userStats = userData?.stats

  // Generate chart data from stakes or use fallback
  const chartData = stakingData?.stakes && stakingData.stakes.length > 0
    ? stakingData.stakes.map((s, i) => ({
        date: `Stake ${i + 1}`,
        rewards: Number(s.pendingRewards) || 0,
      }))
    : [
        { date: 'Jan', rewards: 0 },
        { date: 'Feb', rewards: 0 },
        { date: 'Mar', rewards: 0 },
        { date: 'Apr', rewards: 0 },
        { date: 'May', rewards: 0 },
        { date: 'Jun', rewards: 0 },
        { date: 'Jul', rewards: 0 },
      ]

  // Build recent transactions from commissions
  const recentTransactions = commissionData?.commissions?.slice(0, 6).map(c => ({
    id: c.id,
    amount: Number(c.amount),
    description: c.description,
    date: new Date(c.createdAt).toLocaleDateString(),
    status: c.status === 'distributed' ? 'completed' as const : 'pending' as const,
    commissionType: c.type,
  })) || []

  // Calculate daily rate from active stakes
  const activeStakes = stakingData?.stakes?.filter(s => s.status === 'active') || []
  const dailyRate = activeStakes.length > 0
    ? (() => {
        const totalStakedAmt = activeStakes.reduce((sum, s) => sum + Number(s.amount), 0)
        const dailyTotal = activeStakes.reduce((sum, s) => sum + (Number(s.amount) * Number(s.plan.apy) / 100 / 365), 0)
        return (dailyTotal / totalStakedAmt) * 100
      })()
    : 0

  const dailyEarnings = activeStakes.reduce((sum, s) => sum + (Number(s.amount) * Number(s.plan.apy) / 100 / 365), 0)
  const totalStaked = stakingSummary?.totalStaked ?? user?.totalStaked ?? 0
  const pendingRewards = stakingSummary?.totalPendingRewards ?? 0
  const totalEarned = user?.totalEarned ?? 0

  return (
    <motion.div
      className="space-y-4 sm:space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header with Actions */}
      <motion.div variants={fadeUpVariants}>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => setPage('staking')}
                className="btn-poly gap-1.5 rounded-xl h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm min-w-[44px]"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">{t('deposit')}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage('commissions')}
                className="border-[#8247E5]/30 text-[#8247E5] hover:bg-[#8247E5]/10 hover:border-[#8247E5]/50 gap-1.5 rounded-xl h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm transition-all min-w-[44px]"
              >
                <Gift className="h-4 w-4" />
                <span className="hidden sm:inline">{t('claim_rewards')}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPage('network')}
                className="text-gray-400 hover:text-[#8247E5] hover:bg-[#8247E5]/10 gap-1.5 rounded-xl h-10 sm:h-9 px-3 text-xs sm:text-sm transition-all hidden sm:flex"
              >
                <Network className="h-4 w-4" />
                <span>{t('nav_network')}</span>
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* Hero Stats — Total Staked & Daily Rate (visually prominent) */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={4} />
      ) : (
        <>
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 gap-3 sm:gap-4"
          >
            {/* Total Staked — Hero Card */}
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden glass-card border-[#8247E5]/20 hover:border-[#8247E5]/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8247E5]/8 via-transparent to-transparent pointer-events-none" />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-[#8247E5]/15">
                      <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-[#8247E5]" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{t('total_staked')}</span>
                  </div>
                  <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-[#8247E5] to-[#9B6DFF] bg-clip-text text-transparent">
                    ${totalStaked.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Daily Rate — Hero Card */}
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden glass-card border-[#8247E5]/20 hover:border-[#8247E5]/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-bl from-[#8247E5]/8 via-transparent to-transparent pointer-events-none" />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-[#8247E5]/15">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#8247E5]" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{t('daily_rate')}</span>
                  </div>
                  <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-[#8247E5] to-[#9B6DFF] bg-clip-text text-transparent">
                    {dailyRate.toFixed(2)}%
                  </p>
                  {dailyEarnings > 0 && (
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      ~${dailyEarnings.toFixed(2)}/day
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Secondary Stats Row — Pending Rewards & Total Earned */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 gap-3 sm:gap-4"
          >
            <motion.div variants={itemVariants}>
              <StatsCard
                icon={Clock}
                label={t('pending_rewards')}
                value={`$${pendingRewards.toFixed(2)}`}
                className="glass-card hover:border-[#8247E5]/30 transition-all duration-300"
                iconClassName="bg-[#8247E5]/10"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatsCard
                icon={TrendingUp}
                label={t('total_earned')}
                value={`$${totalEarned.toLocaleString()}`}
                className="glass-card hover:border-[#8247E5]/30 transition-all duration-300"
                iconClassName="bg-[#8247E5]/10"
              />
            </motion.div>
          </motion.div>

          {/* Compact Tertiary Stats — inline strip */}
          <motion.div variants={fadeUpVariants}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl glass-card">
                <div className="p-1.5 rounded-lg bg-[#8247E5]/10 shrink-0">
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#8247E5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">{t('active_stakes')}</p>
                  <p className="text-sm sm:text-base font-semibold text-white">{stakingSummary?.activeStakesCount ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl glass-card">
                <div className="p-1.5 rounded-lg bg-[#8247E5]/10 shrink-0">
                  <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#8247E5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">{t('commission_balance')}</p>
                  <p className="text-sm sm:text-base font-semibold text-white">${(commissionSummary?.pending?.amount ?? 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl glass-card">
                <div className="p-1.5 rounded-lg bg-[#8247E5]/10 shrink-0">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#8247E5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">{t('network_size')}</p>
                  <p className="text-sm sm:text-base font-semibold text-white">{userStats?.networkSize ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl glass-card">
                <div className="p-1.5 rounded-lg bg-[#8247E5]/10 shrink-0">
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#8247E5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">{t('direct_referrals')}</p>
                  <p className="text-sm sm:text-base font-semibold text-white">{userStats?.directReferrals ?? 0}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Rewards Chart — compact */}
      <motion.div variants={fadeUpVariants}>
        <Card className="glass-card overflow-hidden transition-all duration-300">
          <CardHeader className="pb-1 sm:pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#8247E5]" />
                {t('rewards_overview')}
              </CardTitle>
              <Badge className="bg-[#8247E5]/10 text-[#8247E5] border-[#8247E5]/20 hover:bg-[#8247E5]/20 text-[10px] sm:text-xs">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5">
            <div className="h-36 sm:h-48 lg:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="polyRewardGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8247E5" stopOpacity={0.35} />
                      <stop offset="50%" stopColor="#8247E5" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#8247E5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="polyStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6B33D4" />
                      <stop offset="50%" stopColor="#8247E5" />
                      <stop offset="100%" stopColor="#9B6DFF" />
                    </linearGradient>
                    <filter id="polyGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(130, 71, 229, 0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(130, 71, 229, 0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    stroke="rgba(130, 71, 229, 0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="rewards"
                    stroke="url(#polyStrokeGradient)"
                    strokeWidth={2.5}
                    fill="url(#polyRewardGradient)"
                    filter="url(#polyGlow)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: '#8247E5',
                      stroke: '#0a0a0f',
                      strokeWidth: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity + Leaderboard — side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Recent Activity */}
        <motion.div variants={fadeUpVariants}>
          <Card className="glass-card transition-all duration-300 h-full">
            <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
              <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#8247E5]" />
                {t('recent_activity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5">
              {commissionLoading ? (
                <LoadingSkeleton variant="table" count={3} />
              ) : recentTransactions.length === 0 ? (
                <EmptyState
                  icon={Coins}
                  title={t('no_activity')}
                  description={t('connect_wallet_desc')}
                  action={
                    <Button
                      onClick={() => setPage('staking')}
                      className="btn-poly gap-2 rounded-xl text-sm min-h-[44px]"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      {t('start_staking')}
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar">
                  {recentTransactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl glass-card border-l-2 border-l-[#8247E5]/60 hover:border-l-[#8247E5] transition-all duration-200 group min-h-[44px] sm:min-h-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-lg shrink-0 bg-[#8247E5]/10 group-hover:bg-[#8247E5]/20 transition-colors">
                          {tx.commissionType === 'binary' ? (
                            <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#8247E5]" />
                          ) : (
                            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#8247E5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-white truncate">{tx.description}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs sm:text-sm font-semibold text-[#8247E5]">
                          +${tx.amount.toLocaleString()}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 ${
                            tx.status === 'completed'
                              ? 'border-[#8247E5]/30 text-[#8247E5]'
                              : 'border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={fadeUpVariants}>
          <Leaderboard />
        </motion.div>
      </div>
    </motion.div>
  )
}
