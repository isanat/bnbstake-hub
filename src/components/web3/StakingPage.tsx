'use client'

import { useState } from 'react'
import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Wallet, TrendingUp, Clock, Coins, Plus,
  Gift, AlertTriangle, CheckCircle2, Shield, Loader2,
  Flame, Sparkles, ArrowRight, CircleDot, CircleCheck, Circle
} from 'lucide-react'
import { motion } from 'framer-motion'

interface StakingPlan {
  id: string
  name: string
  description: string
  durationDays: number
  apy: number
  minAmount: number
  maxAmount: number
  isActive: boolean
  earlyWithdrawPenalty: number
}

interface Stake {
  id: string
  amount: number
  startDate: string
  endDate: string
  status: string
  pendingRewards: number
  plan: { name: string; apy: number; durationDays: number }
}

interface StakingData {
  plans: StakingPlan[]
  stakes: Stake[]
  summary: {
    totalStaked: number
    totalPendingRewards: number
    activeStakesCount: number
    totalStakesCount: number
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const stakeItemVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function StakingPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [depositOpen, setDepositOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [depositAmount, setDepositAmount] = useState('')
  const [approveStep, setApproveStep] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  const { data: stakingData, isLoading, error } = useQuery<StakingData>({
    queryKey: ['staking', currentWallet],
    queryFn: () => fetch(`/api/staking?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch staking data')
      return r.json()
    }),
    enabled: !!currentWallet,
  })

  const createStakeMutation = useMutation({
    mutationFn: (body: { walletAddress: string; planId: string; amount: number }) =>
      fetch('/api/staking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to create stake')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking', currentWallet] })
      queryClient.invalidateQueries({ queryKey: ['user', currentWallet] })
      queryClient.invalidateQueries({ queryKey: ['commissions', currentWallet] })
      toast.success('Stake created successfully!')
      setConfirmStep(true)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create stake')
      setApproveStep(false)
    },
  })

  const claimMutation = useMutation({
    mutationFn: (body: { stakeId: string; walletAddress: string }) =>
      fetch('/api/staking/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to claim rewards')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking', currentWallet] })
      queryClient.invalidateQueries({ queryKey: ['user', currentWallet] })
      toast.success('Rewards claimed successfully!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to claim rewards')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (body: { stakeId: string; walletAddress: string }) =>
      fetch('/api/staking/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to withdraw stake')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking', currentWallet] })
      queryClient.invalidateQueries({ queryKey: ['user', currentWallet] })
      toast.success('Stake withdrawn successfully!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to withdraw stake')
    },
  })

  if (!isConnected) {
    return (
      <div>
        <PageHeader title={t('staking_title')} description={t('staking_description')} />
        <EmptyState
          icon={Wallet}
          title={t('connect_wallet_title')}
          description={t('connect_wallet_desc')}
        />
      </div>
    )
  }

  const plans = stakingData?.plans?.filter(p => p.isActive) || []
  const stakes = stakingData?.stakes || []
  const summary = stakingData?.summary

  const totalStaked = summary?.totalStaked ?? 0
  const totalPendingRewards = summary?.totalPendingRewards ?? 0

  // Calculate daily earnings from all active stakes
  const dailyEarnings = stakes
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (Number(s.amount) * Number(s.plan.apy) / 100 / 365), 0)

  const selectedPlanData = plans.find(p => p.id === selectedPlan)

  const handleApprove = () => {
    setApproveStep(true)
  }

  const handleConfirmStake = () => {
    if (!currentWallet || !selectedPlan || !depositAmount) return
    createStakeMutation.mutate({
      walletAddress: currentWallet,
      planId: selectedPlan,
      amount: Number(depositAmount),
    })
  }

  const resetDialog = () => {
    setDepositOpen(false)
    setApproveStep(false)
    setConfirmStep(false)
    setDepositAmount('')
    setSelectedPlan('')
  }

  const getStepStatus = (step: number) => {
    if (confirmStep) return step <= 3 ? 'done' : 'pending'
    if (approveStep) return step === 1 ? 'done' : step === 2 ? 'active' : 'pending'
    return step === 1 ? 'active' : 'pending'
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('staking_title')}
        description={t('staking_description')}
        actions={
          <Button
            onClick={() => setDepositOpen(true)}
            className="btn-bnb gap-2 rounded-xl h-10 px-5"
          >
            <Plus className="h-4 w-4" />
            {t('new_stake')}
          </Button>
        }
      />

      {/* Summary Stats */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={4} />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants}>
            <StatsCard icon={Coins} label={t('total_staked')} value={`$${totalStaked.toLocaleString()}`} theme="bnb" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard icon={TrendingUp} label={t('daily_rate')} value={(() => {
              const activeStakes = stakes.filter(s => s.status === 'active')
              if (activeStakes.length === 0) return '0.00%'
              const totalStakedAmt = activeStakes.reduce((sum, s) => sum + Number(s.amount), 0)
              const dailyTotal = activeStakes.reduce((sum, s) => sum + (Number(s.amount) * Number(s.plan.apy) / 100 / 365), 0)
              const weightedDailyRate = (dailyTotal / totalStakedAmt) * 100
              return `${weightedDailyRate.toFixed(2)}%`
            })()} trend={dailyEarnings > 0 ? { value: 0, positive: true } : undefined} theme="bnb" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard icon={Clock} label={t('pending_rewards_label')} value={`$${totalPendingRewards.toFixed(2)}`} theme="bnb" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatsCard icon={Shield} label={t('active_stakes_label')} value={`${summary?.activeStakesCount ?? 0}`} theme="bnb" />
          </motion.div>
        </motion.div>
      )}

      {/* Staking Plans */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-1.5 rounded-lg bg-[#F0B90B]/10">
            <Flame className="h-5 w-5 text-[#F0B90B]" />
          </div>
          <h2 className="text-xl font-semibold text-white">{t('available_plans')}</h2>
        </div>
        {isLoading ? (
          <LoadingSkeleton variant="cards" count={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Coins}
            title={t('no_plans')}
            description={t('connect_wallet_desc')}
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div
                  className="gradient-border cursor-pointer group h-full"
                  onClick={() => { setSelectedPlan(plan.id); setDepositOpen(true) }}
                >
                  <div className="glass-card rounded-2xl h-full hover:border-[#F0B90B]/30 transition-all duration-300">
                    <CardContent className="p-5 sm:p-6">
                      <div className="space-y-5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white group-hover:text-[#F8D12F] transition-colors duration-300">
                            {plan.name}
                          </h3>
                          <Badge
                            className="border-[#F0B90B]/30 text-[#F0B90B] bg-[#F0B90B]/8 text-xs font-medium"
                            variant="outline"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {plan.durationDays} Days
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>

                        {/* Daily Rate - Big and bold (primary display) */}
                        <div className="text-center py-4 relative">
                          <div className="absolute inset-0 bg-[#F0B90B]/3 rounded-xl" />
                          <div className="relative">
                            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">
                              {t('daily_rate')}
                            </p>
                            <span className="text-5xl sm:text-6xl font-black text-gradient-bnb leading-none">
                              {(plan.apy / 365).toFixed(2)}%
                            </span>
                            <p className="text-sm text-[#F8D12F] font-semibold mt-1">
                              {t('per_day')}
                            </p>
                            {/* APY - secondary info */}
                            <div className="mt-2 pt-2 border-t border-[#F0B90B]/10">
                              <p className="text-xs text-gray-600">
                                {t('apy_label')}: <span className="text-gray-500 font-medium">{plan.apy}%</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">{t('staking_total_staked')}</span>
                            <span className="text-white font-medium">${plan.minAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">{t('range')}</span>
                            <span className="text-white font-medium">${plan.maxAmount.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#F0B90B]/15 to-transparent" />
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Early Penalty</span>
                            <span className="text-red-400 font-medium">{plan.earlyWithdrawPenalty}%</span>
                          </div>
                        </div>

                        {/* CTA Button */}
                        <Button className="btn-bnb w-full rounded-xl h-11 text-sm">
                          <Sparkles className="h-4 w-4 mr-1.5" />
                          Stake Now
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Active Stakes */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-1.5 rounded-lg bg-[#F0B90B]/10">
            <TrendingUp className="h-5 w-5 text-[#F0B90B]" />
          </div>
          <h2 className="text-xl font-semibold text-white">Your Stakes</h2>
        </div>
        {isLoading ? (
          <LoadingSkeleton variant="table" count={3} />
        ) : stakes.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No Stakes Yet"
            description="Start staking to earn rewards. Choose a plan above to begin."
            action={
              <Button onClick={() => setDepositOpen(true)} className="btn-bnb gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Start Staking
              </Button>
            }
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {stakes.map((stake, index) => {
              const start = new Date(stake.startDate)
              const end = new Date(stake.endDate)
              const now = new Date()
              const totalDuration = end.getTime() - start.getTime()
              const elapsed = now.getTime() - start.getTime()
              const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
              const isActive = stake.status === 'active'
              const isWithdrawn = stake.status === 'withdrawn'

              return (
                <motion.div
                  key={stake.id}
                  variants={stakeItemVariants}
                  className={`
                    glass-card rounded-2xl overflow-hidden transition-all duration-300
                    border-l-[3px]
                    ${isActive ? 'border-l-[#F0B90B]' : isWithdrawn ? 'border-l-gray-600' : 'border-l-amber-500'}
                    hover:border-[#F0B90B]/30
                  `}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        {/* Stake header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">{stake.plan.name} Plan</h3>
                          <Badge
                            className={`
                              text-xs font-medium
                              ${isActive
                                ? 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20'
                                : isWithdrawn
                                ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }
                            `}
                            variant="outline"
                          >
                            {stake.status}
                          </Badge>
                        </div>

                        {/* Stake details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">Amount</p>
                            <p className="text-white font-semibold">${Number(stake.amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">Pending Rewards</p>
                            <p className="text-[#F8D12F] font-semibold">${Number(stake.pendingRewards).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">Start</p>
                            <p className="text-white">{start.toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">End</p>
                            <p className="text-white">{end.toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {isActive && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Staking Progress</span>
                              <span className="text-[#F0B90B] font-medium">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-800/60 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-[#C99A00] via-[#F0B90B] to-[#F8D12F]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {isActive && (
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => claimMutation.mutate({ stakeId: stake.id, walletAddress: currentWallet! })}
                            disabled={claimMutation.isPending}
                            className="bg-[#F0B90B]/15 hover:bg-[#F0B90B]/25 text-[#F0B90B] border border-[#F0B90B]/20 gap-1.5 rounded-xl flex-1 sm:flex-none h-9 font-medium transition-all"
                          >
                            {claimMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Gift className="h-3.5 w-3.5" />
                            )}
                            Claim
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => withdrawMutation.mutate({ stakeId: stake.id, walletAddress: currentWallet! })}
                            disabled={withdrawMutation.isPending}
                            className="border-gray-700/50 text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 hover:border-gray-600 gap-1.5 rounded-xl flex-1 sm:flex-none h-9 font-medium transition-all"
                          >
                            {withdrawMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            Withdraw
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={(open) => {
        setDepositOpen(open)
        if (!open) resetDialog()
      }}>
        <DialogContent className="glass-strong border-[#F0B90B]/15 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-gradient-bnb text-3xl font-black">New Stake</DialogTitle>
            <DialogDescription className="text-gray-400">
              Stake USDT to earn rewards on BNB Smart Chain
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-0 py-2">
            {[
              { step: 1, label: 'Approve', icon: approveStep || confirmStep ? CircleCheck : CircleDot },
              { step: 2, label: 'Confirm', icon: confirmStep ? CircleCheck : CircleDot },
              { step: 3, label: 'Done', icon: CircleCheck },
            ].map((s, i) => {
              const status = getStepStatus(s.step)
              const StepIcon = s.icon
              return (
                <div key={s.step} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                      ${status === 'done'
                        ? 'bg-[#F0B90B]/20 text-[#F0B90B]'
                        : status === 'active'
                        ? 'bg-[#F0B90B]/10 text-[#F0B90B] glow-bnb'
                        : 'bg-gray-800/50 text-gray-600'
                      }
                    `}>
                      {status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-xs font-bold">{s.step}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${
                      status === 'done' ? 'text-[#F0B90B]' : status === 'active' ? 'text-[#F8D12F]' : 'text-gray-600'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`w-10 sm:w-14 h-0.5 mx-1 mb-4 rounded-full transition-all duration-500 ${
                      getStepStatus(s.step + 1) !== 'pending' ? 'bg-[#F0B90B]/40' : 'bg-gray-800'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Select Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="bg-[#0a0a0f]/60 border-[#F0B90B]/15 text-white focus:ring-[#F0B90B]/30 focus:border-[#F0B90B]/30 rounded-xl h-11">
                  <SelectValue placeholder="Choose a staking plan" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f1a] border-[#F0B90B]/15">
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id} className="text-white focus:bg-[#F0B90B]/10 focus:text-[#F8D12F]">
                      <div className="flex items-center gap-2">
                        <span>{plan.name}</span>
                        <span className="text-[#F0B90B] text-xs font-bold">{(plan.apy / 365).toFixed(2)}%/dia</span>
                        <span className="text-gray-600 text-xs">({plan.apy}% APY)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlanData && (
              <div className="p-3.5 rounded-xl glass border border-[#F0B90B]/10 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('daily_rate')}</span>
                  <span className="text-[#F0B90B] font-bold text-base">{(selectedPlanData.apy / 365).toFixed(2)}% <span className="text-xs font-normal text-gray-500">{t('per_day')}</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('apy_label')}</span>
                  <span className="text-gray-400 font-medium">{selectedPlanData.apy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white font-medium">{selectedPlanData.durationDays} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Range</span>
                  <span className="text-white font-medium">${selectedPlanData.minAmount.toLocaleString()} - ${selectedPlanData.maxAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Amount (USDT)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-[#0a0a0f]/60 border-[#F0B90B]/15 text-white focus:ring-[#F0B90B]/30 focus:border-[#F0B90B]/30 rounded-xl h-11 pr-16"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <div className="h-4 w-4 rounded-full bg-[#F0B90B]/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-[#F0B90B]">$</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">USDT</span>
                </div>
              </div>
              {selectedPlanData && depositAmount && (
                <div className="p-3 rounded-xl bg-[#F0B90B]/5 border border-[#F0B90B]/15 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#F0B90B]" />
                      {t('daily_rate')}
                    </span>
                    <span className="text-lg font-bold text-gradient-bnb">{(selectedPlanData.apy / 365).toFixed(2)}% <span className="text-xs font-normal text-[#F8D12F]">{t('per_day')}</span></span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{t('estimated_daily')}</span>
                    <span className="text-[#F8D12F] font-medium">~${((Number(depositAmount) * selectedPlanData.apy / 100) / 365).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{t('monthly_reward')}</span>
                    <span className="text-gray-400 font-medium">~${(((Number(depositAmount) * selectedPlanData.apy / 100) / 365) * 30).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1: Approve */}
            {!approveStep && !confirmStep && (
              <Button
                onClick={handleApprove}
                disabled={!selectedPlan || !depositAmount}
                className="btn-bnb w-full rounded-xl h-11 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shield className="h-4 w-4 mr-1.5" />
                Approve USDT
              </Button>
            )}

            {/* Step 2: Confirm */}
            {approveStep && !confirmStep && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#F0B90B] p-2 rounded-lg bg-[#F0B90B]/5 border border-[#F0B90B]/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>USDT Approved Successfully</span>
                </div>
                <Button
                  onClick={handleConfirmStake}
                  disabled={createStakeMutation.isPending}
                  className="btn-bnb w-full rounded-xl h-11 text-sm"
                >
                  {createStakeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Confirming on BNB Chain...
                    </>
                  ) : (
                    <>
                      Confirm Stake
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: Done */}
            {confirmStep && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#F0B90B] p-3 rounded-xl bg-[#F0B90B]/5 border border-[#F0B90B]/15 glow-bnb">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#F8D12F]">Transaction Confirmed!</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Your stake is now active on BNB Smart Chain. Rewards accrue immediately.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={resetDialog}
                  className="w-full bg-[#0a0a0f]/60 border border-[#F0B90B]/15 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/25 rounded-xl h-11 font-medium transition-all"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
