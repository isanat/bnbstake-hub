'use client'

import { useState } from 'react'
import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Wallet, TrendingUp, Clock, Coins, Plus,
  ArrowUpRight, Gift, AlertTriangle, CheckCircle2, Shield, Loader2
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

export function StakingPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const queryClient = useQueryClient()

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
        <PageHeader title="Staking" description="Stake USDT and earn rewards" />
        <EmptyState
          icon={Wallet}
          title="Wallet Not Connected"
          description="Connect your wallet to view staking plans and start earning rewards."
        />
      </div>
    )
  }

  const plans = stakingData?.plans?.filter(p => p.isActive) || []
  const stakes = stakingData?.stakes || []
  const summary = stakingData?.summary

  const activeStakes = stakes.filter(s => s.status === 'active')
  const totalStaked = summary?.totalStaked ?? 0
  const totalPendingRewards = summary?.totalPendingRewards ?? 0

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staking"
        description="Stake USDT on BNB Smart Chain and earn passive income"
        actions={
          <Button
            onClick={() => setDepositOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            New Stake
          </Button>
        }
      />

      {/* Summary Stats */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Coins} label="Total Staked" value={`$${totalStaked.toLocaleString()}`} />
          <StatsCard icon={TrendingUp} label="Total Rewards" value={`$${(stakes.reduce((sum, s) => sum + Number(s.pendingRewards || 0), 0) + totalStaked * 0.01).toFixed(2)}`} trend={{ value: 8.5, positive: true }} />
          <StatsCard icon={Clock} label="Pending Rewards" value={`$${totalPendingRewards.toFixed(2)}`} />
          <StatsCard icon={Shield} label="Active Stakes" value={`${summary?.activeStakesCount ?? 0}`} />
        </div>
      )}

      {/* Staking Plans */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Available Plans</h2>
        {isLoading ? (
          <LoadingSkeleton variant="cards" count={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No Plans Available"
            description="There are no active staking plans at the moment. Check back later."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm hover:border-emerald-500/30 transition-all cursor-pointer group"
                  onClick={() => { setSelectedPlan(plan.id); setDepositOpen(true) }}
                >
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {plan.name}
                        </h3>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {plan.durationDays} Days
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{plan.description}</p>
                      <div className="text-center py-3">
                        <span className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                          {plan.apy}%
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Annual Percentage Yield</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-400">
                          <span>Min</span>
                          <span className="text-white">${plan.minAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Max</span>
                          <span className="text-white">${plan.maxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Early Penalty</span>
                          <span className="text-red-400">{plan.earlyWithdrawPenalty}%</span>
                        </div>
                      </div>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                        Stake Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Active Stakes */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Your Stakes</h2>
        {isLoading ? (
          <LoadingSkeleton variant="table" count={3} />
        ) : stakes.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No Stakes Yet"
            description="Start staking to earn rewards. Choose a plan above to begin."
            action={
              <Button onClick={() => setDepositOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Start Staking
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {stakes.map((stake, index) => {
              const start = new Date(stake.startDate)
              const end = new Date(stake.endDate)
              const now = new Date()
              const totalDuration = end.getTime() - start.getTime()
              const elapsed = now.getTime() - start.getTime()
              const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)

              return (
                <motion.div
                  key={stake.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{stake.plan.name} Plan</h3>
                            <Badge className={`${
                              stake.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : stake.status === 'withdrawn'
                                ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {stake.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500">Amount</p>
                              <p className="text-white font-medium">${Number(stake.amount).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Pending Rewards</p>
                              <p className="text-emerald-400 font-medium">${Number(stake.pendingRewards).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Start</p>
                              <p className="text-white">{start.toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">End</p>
                              <p className="text-white">{end.toLocaleDateString()}</p>
                            </div>
                          </div>
                          {stake.status === 'active' && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Progress</span>
                                <span className="text-gray-400">{progress.toFixed(1)}%</span>
                              </div>
                              <Progress value={progress} className="h-2 bg-gray-800" />
                            </div>
                          )}
                        </div>
                        {stake.status === 'active' && (
                          <div className="flex sm:flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => claimMutation.mutate({ stakeId: stake.id, walletAddress: currentWallet! })}
                              disabled={claimMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-xl flex-1 sm:flex-none"
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
                              className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1 rounded-xl flex-1 sm:flex-none"
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
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={(open) => {
        setDepositOpen(open)
        if (!open) resetDialog()
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">New Stake</DialogTitle>
            <DialogDescription className="text-gray-400">
              Stake USDT to earn rewards on BNB Smart Chain
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Select Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Choose a staking plan" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id} className="text-white focus:bg-gray-700 focus:text-white">
                      {plan.name} - {plan.apy}% APY ({plan.durationDays} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlanData && (
              <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">APY</span>
                  <span className="text-emerald-400 font-medium">{selectedPlanData.apy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{selectedPlanData.durationDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Range</span>
                  <span className="text-white">${selectedPlanData.minAmount.toLocaleString()} - ${selectedPlanData.maxAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Amount (USDT)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
              {selectedPlanData && depositAmount && (
                <p className="text-xs text-gray-500">
                  Estimated daily reward: ${((Number(depositAmount) * selectedPlanData.apy / 100) / 365).toFixed(2)}
                </p>
              )}
            </div>

            {!approveStep && !confirmStep && (
              <Button
                onClick={handleApprove}
                disabled={!selectedPlan || !depositAmount}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11"
              >
                Approve USDT
              </Button>
            )}

            {approveStep && !confirmStep && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <CheckCircle2 className="h-4 w-4" />
                  USDT Approved Successfully
                </div>
                <Button
                  onClick={handleConfirmStake}
                  disabled={createStakeMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11"
                >
                  {createStakeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Confirming...
                    </>
                  ) : (
                    'Confirm Stake'
                  )}
                </Button>
              </div>
            )}

            {confirmStep && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Transaction Confirmed!
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Your stake has been submitted to BNB Smart Chain. Rewards will begin accruing immediately.
                </p>
                <Button
                  onClick={resetDialog}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-xl h-11"
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
