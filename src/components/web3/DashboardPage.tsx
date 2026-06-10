'use client'

import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useQuery } from '@tanstack/react-query'
import {
  Wallet, TrendingUp, Clock, Coins, Users, Gift,
  ArrowUpRight, ArrowDownRight, ExternalLink, Zap
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

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

export function DashboardPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const setPage = useAppStore(s => s.setPage)

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

  if (!isConnected) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your staking portfolio" />
        <EmptyState
          icon={Wallet}
          title="Wallet Not Connected"
          description="Connect your wallet to view your dashboard, track staking rewards, and manage your portfolio."
        />
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your staking portfolio on BNB Smart Chain"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setPage('staking')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
            >
              <Zap className="h-4 w-4" />
              Deposit
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage('commissions')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2 rounded-xl"
            >
              <Gift className="h-4 w-4" />
              Claim Rewards
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            icon={Wallet}
            label="Total Staked"
            value={`$${(stakingSummary?.totalStaked ?? user?.totalStaked ?? 0).toLocaleString()}`}
            trend={user?.totalStaked ? { value: 12.5, positive: true } : undefined}
          />
          <StatsCard
            icon={TrendingUp}
            label="Total Earned"
            value={`$${(user?.totalEarned ?? 0).toLocaleString()}`}
            trend={user?.totalEarned ? { value: 8.3, positive: true } : undefined}
          />
          <StatsCard
            icon={Clock}
            label="Pending Rewards"
            value={`$${(stakingSummary?.totalPendingRewards ?? 0).toFixed(2)}`}
            trend={stakingSummary?.totalPendingRewards ? { value: 2.1, positive: true } : undefined}
          />
          <StatsCard
            icon={Coins}
            label="Active Stakes"
            value={`${stakingSummary?.activeStakesCount ?? 0}`}
          />
          <StatsCard
            icon={Users}
            label="Network Size"
            value={`${userStats?.networkSize ?? 0}`}
            trend={userStats?.networkSize ? { value: 15.2, positive: true } : undefined}
          />
          <StatsCard
            icon={Gift}
            label="Commission Balance"
            value={`$${(commissionSummary?.pending?.amount ?? 0).toLocaleString()}`}
            trend={commissionSummary?.pending?.amount ? { value: 5.7, positive: true } : undefined}
          />
        </div>
      )}

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Rewards Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rewards"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#rewardGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setPage('staking')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-start gap-3 rounded-xl h-12"
              >
                <ArrowUpRight className="h-4 w-4" />
                Stake USDT
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage('commissions')}
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start gap-3 rounded-xl h-12"
              >
                <Gift className="h-4 w-4" />
                Claim All Rewards
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage('staking')}
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start gap-3 rounded-xl h-12"
              >
                <ArrowDownRight className="h-4 w-4" />
                View Stakes
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start gap-3 rounded-xl h-12"
              >
                <ExternalLink className="h-4 w-4" />
                View on BscScan
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {commissionLoading ? (
              <LoadingSkeleton variant="table" count={4} />
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                icon={Coins}
                title="No Recent Activity"
                description="Start staking to see your transaction history here."
                action={
                  <Button
                    onClick={() => setPage('staking')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Start Staking
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        tx.commissionType === 'binary' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                      }`}>
                        {tx.commissionType === 'binary' ? (
                          <Gift className="h-4 w-4 text-amber-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{tx.description}</p>
                        <p className="text-xs text-gray-500">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">
                        +${tx.amount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className={`text-xs ${
                        tx.status === 'completed'
                          ? 'border-emerald-500/30 text-emerald-400'
                          : 'border-amber-500/30 text-amber-400'
                      }`}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
