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
  ArrowUpRight, ArrowDownRight, ExternalLink, Zap,
  Hexagon, Shield, Flame
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { ReturnCalculator } from '@/components/web3/ReturnCalculator'
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

// Staggered animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl px-4 py-3 shadow-2xl glow-bnb">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-gradient-bnb">
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

  // Not connected — beautiful empty state
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
            {/* Wallet icon with golden glow */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative inline-block mb-8"
            >
              <div className="absolute inset-0 rounded-3xl bg-[#F0B90B]/10 blur-3xl scale-150" />
              <div className="relative p-6 rounded-3xl glass-card glow-bnb-strong">
                <Wallet className="h-14 w-14 text-[#F0B90B]" strokeWidth={1.5} />
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs text-gray-400">
                <Shield className="h-4 w-4 text-[#F0B90B]" />
                {t('non_custodial')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs text-gray-400">
                <Flame className="h-4 w-4 text-[#F0B90B]" />
                {t('up_to_daily')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs text-gray-400">
                <Hexagon className="h-4 w-4 text-[#F0B90B]" />
                {t('bnb_chain_label')}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const isLoading = userLoading || stakingLoading || commissionLoading

  const user = userData?.user
  const userStats = userData?.stats
  const stakingSummary = stakingData?.summary
  const commissionSummary = commissionData?.summary

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
    type: c.type === 'unilevel' || c.type === 'binary' ? 'commission' as const : 'commission' as const,
    amount: Number(c.amount),
    description: c.description,
    date: new Date(c.createdAt).toLocaleDateString(),
    status: c.status === 'distributed' ? 'completed' as const : 'pending' as const,
    commissionType: c.type,
  })) || []

  // Calculate daily earnings from active stakes
  const dailyEarnings = stakingData?.stakes
    ?.filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (Number(s.amount) * Number(s.plan.apy) / 100 / 365), 0) ?? 0

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
          title={t('title')}
          description={t('description')}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => setPage('staking')}
                className="btn-bnb gap-2 rounded-xl h-10 px-5"
              >
                <Zap className="h-4 w-4" />
                {t('deposit')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage('commissions')}
                className="border-[#F0B90B]/30 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/50 gap-2 rounded-xl h-10 px-5 transition-all"
              >
                <Gift className="h-4 w-4" />
                {t('claim_rewards')}
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* Stats Grid */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={6} />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <motion.div variants={itemVariants}>
            <StatsCard
              icon={Wallet}
              label={t('total_staked')}
              value={`$${(stakingSummary?.totalStaked ?? user?.totalStaked ?? 0).toLocaleString()}`}
              className="glass-card hover:border-[#F0B90B]/30 transition-all duration-300"
              iconClassName="bg-[#F0B90B]/10"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard
              icon={TrendingUp}
              label={t('daily_rate')}
              value={(() => {
                const activeStakes = stakingData?.stakes?.filter(s => s.status === 'active') || []
                if (activeStakes.length === 0) return '0.00%'
                const totalStakedAmt = activeStakes.reduce((sum, s) => sum + Number(s.amount), 0)
                const dailyTotal = activeStakes.reduce((sum, s) => sum + (Number(s.amount) * Number(s.plan.apy) / 100 / 365), 0)
                const weightedDailyRate = (dailyTotal / totalStakedAmt) * 100
                return `${weightedDailyRate.toFixed(2)}%`
              })()}
              trend={dailyEarnings > 0 ? { value: 0, positive: true } : undefined}
              className="glass-card hover:border-[#F0B90B]/30 transition-all duration-300"
              iconClassName="bg-[#F0B90B]/10"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard
              icon={Clock}
              label={t('pending_rewards')}
              value={`$${(stakingSummary?.totalPendingRewards ?? 0).toFixed(2)}`}
              className="glass-card hover:border-[#F0B90B]/30 transition-all duration-300"
              iconClassName="bg-[#F0B90B]/10"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard
              icon={Coins}
              label={t('active_stakes')}
              value={`${stakingSummary?.activeStakesCount ?? 0}`}
              className="glass-card hover:border-[#F0B90B]/30 transition-all duration-300"
              iconClassName="bg-[#F0B90B]/10"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard
              icon={TrendingUp}
              label={t('total_earned')}
              value={`$${(user?.totalEarned ?? 0).toLocaleString()}`}
              className="glass-card hover:border-[#F0B90B]/30 transition-all duration-300"
              iconClassName="bg-[#F0B90B]/10"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard
              icon={Gift}
              label={t('commission_balance')}
              value={`$${(commissionSummary?.pending?.amount ?? 0).toLocaleString()}`}
              className="glass-card hover:border-[#F0B90B]/30 transition-all duration-300"
              iconClassName="bg-[#F0B90B]/10"
            />
          </motion.div>
        </motion.div>
      )}

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          variants={fadeUpVariants}
          className="lg:col-span-2"
        >
          <Card className="glass-card glow-bnb overflow-hidden transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#F0B90B]" />
                  {t('rewards_overview')}
                </CardTitle>
                <Badge className="bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20 hover:bg-[#F0B90B]/20">
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bnbRewardGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.35} />
                        <stop offset="50%" stopColor="#F0B90B" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bnbStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#C99A00" />
                        <stop offset="50%" stopColor="#F0B90B" />
                        <stop offset="100%" stopColor="#F8D12F" />
                      </linearGradient>
                      <filter id="bnbGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(240, 185, 11, 0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(240, 185, 11, 0.3)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="rgba(240, 185, 11, 0.3)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dx={-4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="rewards"
                      stroke="url(#bnbStrokeGradient)"
                      strokeWidth={2.5}
                      fill="url(#bnbRewardGradient)"
                      filter="url(#bnbGlow)"
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: '#F0B90B',
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

        <motion.div variants={fadeUpVariants}>
          <Card className="glass-card h-full transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#F0B90B]" />
                {t('quick_actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setPage('staking')}
                className="btn-bnb w-full justify-start gap-3 rounded-xl h-12 text-sm"
              >
                <ArrowUpRight className="h-4 w-4" />
                {t('stake_usdt')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage('commissions')}
                className="w-full border-[#F0B90B]/30 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/50 justify-start gap-3 rounded-xl h-12 text-sm transition-all"
              >
                <Gift className="h-4 w-4" />
                {t('claim_all_rewards')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage('staking')}
                className="w-full border-[#F0B90B]/30 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/50 justify-start gap-3 rounded-xl h-12 text-sm transition-all"
              >
                <ArrowDownRight className="h-4 w-4" />
                {t('view_stakes')}
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20 justify-start gap-3 rounded-xl h-12 text-sm transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                {t('view_bscscan')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={fadeUpVariants}>
        <Card className="glass-card transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#F0B90B]" />
              {t('recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissionLoading ? (
              <LoadingSkeleton variant="table" count={4} />
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                icon={Coins}
                title={t('no_activity')}
                description={t('connect_wallet_desc')}
                action={
                  <Button
                    onClick={() => setPage('staking')}
                    className="btn-bnb gap-2 rounded-xl"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    {t('start_staking')}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {recentTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.06,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl glass-card border-l-2 border-l-[#F0B90B]/60 hover:border-l-[#F0B90B] transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        tx.commissionType === 'binary'
                          ? 'bg-[#F0B90B]/10 group-hover:bg-[#F0B90B]/20'
                          : 'bg-[#F0B90B]/10 group-hover:bg-[#F0B90B]/20'
                      } transition-colors`}>
                        {tx.commissionType === 'binary' ? (
                          <Gift className="h-4 w-4 text-[#F0B90B]" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-[#F0B90B]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                        <p className="text-xs text-gray-500">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-[#F0B90B]">
                        +${tx.amount.toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          tx.status === 'completed'
                            ? 'border-[#F0B90B]/30 text-[#F0B90B]'
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

      {/* Return Calculator + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReturnCalculator />
        <Leaderboard />
      </div>
    </motion.div>
  )
}
