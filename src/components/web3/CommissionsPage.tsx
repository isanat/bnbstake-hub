'use client'

import { useState } from 'react'
import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Wallet, Gift, TrendingUp, Clock, ArrowUpRight,
  Filter, Download, CheckCircle2, Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Commission {
  id: string
  amount: number
  type: string
  level: number
  status: string
  description: string
  createdAt: string
  fromUser: { walletAddress: string; referralCode: string }
}

interface CommissionData {
  commissions: Commission[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  summary: {
    total: { amount: number; count: number }
    pending: { amount: number; count: number }
    distributed: { amount: number; count: number }
    unilevel: { amount: number; count: number }
    binary: { amount: number; count: number }
  }
}

export function CommissionsPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: commissionData, isLoading, error } = useQuery<CommissionData>({
    queryKey: ['commissions', currentWallet],
    queryFn: () => fetch(`/api/commissions?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch commissions')
      return r.json()
    }),
    enabled: !!currentWallet,
  })

  const claimAllMutation = useMutation({
    mutationFn: (body: { walletAddress: string }) =>
      fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to claim commissions')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', currentWallet] })
      queryClient.invalidateQueries({ queryKey: ['user', currentWallet] })
      toast.success('All pending commissions claimed successfully!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to claim commissions')
    },
  })

  if (!isConnected) {
    return (
      <div>
        <PageHeader title="Commissions" description="Track your earnings" />
        <EmptyState
          icon={Wallet}
          title="Wallet Not Connected"
          description="Connect your wallet to view your commissions and earnings."
        />
      </div>
    )
  }

  const commissions = commissionData?.commissions || []
  const summary = commissionData?.summary

  const totalUnilevel = summary?.unilevel?.amount ?? 0
  const totalBinary = summary?.binary?.amount ?? 0
  const pendingAmount = summary?.pending?.amount ?? 0
  const distributedAmount = summary?.distributed?.amount ?? 0

  const filteredCommissions = commissions.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    return true
  })

  const handleExport = () => {
    if (!filteredCommissions.length) {
      toast.error('No commissions to export')
      return
    }
    const csv = [
      ['Type', 'From', 'Amount', 'Level', 'Status', 'Date', 'Description'].join(','),
      ...filteredCommissions.map(c =>
        [c.type, c.fromUser?.walletAddress || '', c.amount, c.level, c.status, c.createdAt, c.description].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'commissions.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Commissions exported!')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Track your unilevel and binary commissions"
        actions={
          <Button
            onClick={() => claimAllMutation.mutate({ walletAddress: currentWallet! })}
            disabled={claimAllMutation.isPending || !summary?.pending?.count}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
          >
            {claimAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            Claim All Pending
          </Button>
        }
      />

      {/* Summary Stats */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={TrendingUp} label="Total Unilevel" value={`$${totalUnilevel.toLocaleString()}`} trend={totalUnilevel > 0 ? { value: 12, positive: true } : undefined} />
          <StatsCard icon={ArrowUpRight} label="Total Binary" value={`$${totalBinary.toLocaleString()}`} trend={totalBinary > 0 ? { value: 8, positive: true } : undefined} iconClassName="bg-amber-500/10" />
          <StatsCard icon={Clock} label="Pending" value={`$${pendingAmount.toLocaleString()}`} />
          <StatsCard icon={CheckCircle2} label="Distributed" value={`$${distributedAmount.toLocaleString()}`} />
        </div>
      )}

      {/* Filters */}
      <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  <SelectItem value="unilevel" className="text-white">Unilevel</SelectItem>
                  <SelectItem value="binary" className="text-white">Binary</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="distributed" className="text-white">Distributed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">Commission History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-gray-700 text-gray-400 hover:bg-gray-800 gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton variant="table" count={6} />
          ) : filteredCommissions.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No Commissions Found"
              description={commissions.length === 0
                ? "You haven't earned any commissions yet. Build your network to start earning."
                : "No commissions match the selected filters."}
            />
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-5 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Type</span>
                <span>From</span>
                <span>Amount</span>
                <span>Level / Date</span>
                <span>Status</span>
              </div>

              {filteredCommissions.map((commission, index) => (
                <motion.div
                  key={commission.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors items-center"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      commission.type === 'unilevel' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                    }`}>
                      {commission.type === 'unilevel' ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <span className={`text-xs font-medium sm:hidden ${
                        commission.type === 'unilevel' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {commission.type.charAt(0).toUpperCase() + commission.type.slice(1)}
                      </span>
                      <span className="hidden sm:inline text-sm text-white capitalize">{commission.type}</span>
                      <p className="text-xs text-gray-500 sm:hidden">{commission.description}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-sm text-gray-300 font-mono">
                      {commission.fromUser?.walletAddress
                        ? `${commission.fromUser.walletAddress.slice(0, 6)}...${commission.fromUser.walletAddress.slice(-4)}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-emerald-400">
                      ${Number(commission.amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">
                      {commission.type === 'unilevel' ? `L${commission.level}` : 'Pair'}
                    </span>
                    <p className="text-xs text-gray-600">{new Date(commission.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Badge variant="outline" className={`text-xs ${
                      commission.status === 'distributed'
                        ? 'border-emerald-500/30 text-emerald-400'
                        : 'border-amber-500/30 text-amber-400'
                    }`}>
                      {commission.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
