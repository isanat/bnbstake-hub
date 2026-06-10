'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Shield, Plus, Edit, Trash2, Users, Settings, BarChart3,
  Search, Save, AlertTriangle, Coins, TrendingUp, Lock, Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalStaked: number
  totalEarned: number
  totalWithdrawn: number
  totalCommissions: number
  pendingCommissions: number
  activeStakes: number
  totalStakes: number
  totalTransactions: number
}

interface AdminData {
  stats: AdminStats
  planStats: Array<{ planId: string; planName: string; totalStaked: number; stakeCount: number }>
  recentActivity: Array<{ id: string; type: string; amount: number; description: string; createdAt: string }>
  recentUsers: Array<{ id: string; walletAddress: string; totalStaked: number; createdAt: string }>
}

interface AdminPlan {
  id: string
  name: string
  description: string
  durationDays: number
  apy: number
  minAmount: number
  maxAmount: number
  earlyWithdrawPenalty: number
  isActive: boolean
}

interface MlmConfig {
  unilevel: Array<{ id: string; level: number; percentage: number; isActive: boolean }>
  binary: {
    id: string
    percentage: number
    dailyCap: number
    flushOutThreshold: number
    isActive: boolean
  }
}

interface AdminUser {
  id: string
  walletAddress: string
  referralCode: string
  totalStaked: number
  totalEarned: number
  isActive: boolean
  createdAt: string
}

interface AdminUsersData {
  users: AdminUser[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export function AdminPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const isAdmin = useAppStore(s => s.isAdmin)
  const queryClient = useQueryClient()

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<AdminPlan | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [usersPage, setUsersPage] = useState(1)

  // Plan form state
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    durationDays: 30,
    apy: 10,
    minAmount: 100,
    maxAmount: 10000,
    earlyWithdrawPenalty: 10,
    isActive: true,
  })

  // Binary config local state (for editing before save)
  const [binaryConfigLocal, setBinaryConfigLocal] = useState({
    percentage: 10,
    dailyCap: 5000,
    flushOutThreshold: 80,
    isActive: true,
  })

  // Unilevel config local state
  const [unilevelConfigLocal, setUnilevelConfigLocal] = useState<Array<{ id?: string; level: number; percentage: number; isActive: boolean }>>([])

  // Fetch admin data
  const { data: adminData, isLoading: adminLoading } = useQuery<AdminData>({
    queryKey: ['admin', currentWallet],
    queryFn: () => fetch(`/api/admin?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch admin data')
      return r.json()
    }),
    enabled: !!currentWallet && isAdmin,
  })

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery<AdminPlan[]>({
    queryKey: ['admin-plans', currentWallet],
    queryFn: () => fetch(`/api/admin/plans?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch plans')
      return r.json()
    }).then(d => d.plans || d),
    enabled: !!currentWallet && isAdmin,
  })

  // Fetch MLM config
  const { data: mlmConfigData, isLoading: mlmLoading } = useQuery<MlmConfig>({
    queryKey: ['admin-mlm-config', currentWallet],
    queryFn: () => fetch(`/api/admin/mlm-config?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch MLM config')
      return r.json()
    }),
    enabled: !!currentWallet && isAdmin,
  })

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery<AdminUsersData>({
    queryKey: ['admin-users', currentWallet, searchQuery, usersPage],
    queryFn: () => fetch(`/api/admin/users?wallet=${currentWallet}&search=${searchQuery}&page=${usersPage}&limit=20`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch users')
      return r.json()
    }),
    enabled: !!currentWallet && isAdmin,
  })

  // Initialize local mlm config from fetched data
  const unilevelConfig = mlmConfigData?.unilevel || []
  const binaryConfig = mlmConfigData?.binary

  // Sync local state when data arrives
  const [mlmSynced, setMlmSynced] = useState(false)
  if (mlmConfigData && !mlmSynced) {
    setMlmSynced(true)
    if (mlmConfigData.binary) {
      setBinaryConfigLocal({
        percentage: mlmConfigData.binary.percentage,
        dailyCap: mlmConfigData.binary.dailyCap,
        flushOutThreshold: mlmConfigData.binary.flushOutThreshold,
        isActive: mlmConfigData.binary.isActive,
      })
    }
    if (mlmConfigData.unilevel?.length) {
      setUnilevelConfigLocal(mlmConfigData.unilevel.map(u => ({
        id: u.id,
        level: u.level,
        percentage: u.percentage,
        isActive: u.isActive,
      })))
    }
  }

  // Create/Update plan mutation
  const savePlanMutation = useMutation({
    mutationFn: (plan: Partial<AdminPlan> & { walletAddress: string }) => {
      const isEdit = !!plan.id
      return fetch(`/api/admin/plans?wallet=${currentWallet}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      }).then(r => {
        if (!r.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'create'} plan`)
        return r.json()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans', currentWallet] })
      queryClient.invalidateQueries({ queryKey: ['admin', currentWallet] })
      toast.success(editPlan ? 'Plan updated successfully!' : 'Plan created successfully!')
      setPlanDialogOpen(false)
      setEditPlan(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Save binary config mutation
  const saveBinaryConfigMutation = useMutation({
    mutationFn: (config: typeof binaryConfigLocal & { walletAddress: string }) =>
      fetch(`/api/admin/mlm-config?wallet=${currentWallet}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'binary', ...config }),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to update binary config')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mlm-config', currentWallet] })
      toast.success('Binary configuration saved!')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Save unilevel config mutation
  const saveUnilevelConfigMutation = useMutation({
    mutationFn: (config: { level: number; percentage: number; isActive: boolean; walletAddress: string }) =>
      fetch(`/api/admin/mlm-config?wallet=${currentWallet}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'unilevel', ...config }),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to update unilevel config')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mlm-config', currentWallet] })
      toast.success('Unilevel level updated!')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const openEditPlan = (plan: AdminPlan) => {
    setEditPlan(plan)
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      durationDays: plan.durationDays,
      apy: plan.apy,
      minAmount: plan.minAmount,
      maxAmount: plan.maxAmount,
      earlyWithdrawPenalty: plan.earlyWithdrawPenalty,
      isActive: plan.isActive,
    })
    setPlanDialogOpen(true)
  }

  const openNewPlan = () => {
    setEditPlan(null)
    setPlanForm({
      name: '',
      description: '',
      durationDays: 30,
      apy: 10,
      minAmount: 100,
      maxAmount: 10000,
      earlyWithdrawPenalty: 10,
      isActive: true,
    })
    setPlanDialogOpen(true)
  }

  const handleSavePlan = () => {
    savePlanMutation.mutate({
      ...planForm,
      id: editPlan?.id,
      walletAddress: currentWallet!,
    })
  }

  if (!isConnected || !isAdmin) {
    return (
      <div>
        <PageHeader title="Admin" description="System administration" />
        <EmptyState
          icon={Lock}
          title="Access Denied"
          description="You need admin privileges to access this page. Connect with an admin wallet to continue."
        />
      </div>
    )
  }

  const stats = adminData?.stats
  const plans = plansData || []
  const users = usersData?.users || []

  const mockDepositData = [
    { month: 'Jan', deposits: 45000, withdrawals: 12000 },
    { month: 'Feb', deposits: 52000, withdrawals: 15000 },
    { month: 'Mar', deposits: 38000, withdrawals: 8000 },
    { month: 'Apr', deposits: 65000, withdrawals: 20000 },
    { month: 'May', deposits: 48000, withdrawals: 18000 },
    { month: 'Jun', deposits: 72000, withdrawals: 25000 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Panel"
        description="Manage staking plans, configurations, and users"
        actions={
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1">
            <Shield className="h-3 w-3" />
            Admin Access
          </Badge>
        }
      />

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="plans" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            <Coins className="h-4 w-4 mr-1" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="unilevel" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            Unilevel Config
          </TabsTrigger>
          <TabsTrigger value="binary" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            <Settings className="h-4 w-4 mr-1" />
            Binary Config
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1" />
            Users
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">Staking Plans</CardTitle>
                <Button
                  onClick={openNewPlan}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  Add Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <LoadingSkeleton variant="table" count={4} />
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-7 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>Name</span>
                    <span>Duration</span>
                    <span>APY</span>
                    <span>Min/Max</span>
                    <span>Penalty</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {plans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors items-center"
                    >
                      <span className="text-sm font-medium text-white">{plan.name}</span>
                      <span className="text-sm text-gray-300">{plan.durationDays} days</span>
                      <span className="text-sm font-semibold text-emerald-400">{plan.apy}%</span>
                      <span className="text-sm text-gray-400">${plan.minAmount.toLocaleString()} - ${plan.maxAmount.toLocaleString()}</span>
                      <span className="text-sm text-red-400">{plan.earlyWithdrawPenalty}%</span>
                      <Badge variant="outline" className={`w-fit text-xs ${
                        plan.isActive
                          ? 'border-emerald-500/30 text-emerald-400'
                          : 'border-gray-600 text-gray-500'
                      }`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => openEditPlan(plan)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unilevel Config Tab */}
        <TabsContent value="unilevel">
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-white">Unilevel Commission Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {mlmLoading ? (
                <LoadingSkeleton variant="table" count={5} />
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-4 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>Level</span>
                    <span>Percentage</span>
                    <span>Active</span>
                    <span>Action</span>
                  </div>
                  {unilevelConfigLocal.map((config, index) => (
                    <motion.div
                      key={config.level}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/50 items-center"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold">
                          {config.level}
                        </div>
                        <span className="text-sm text-white">Level {config.level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={config.percentage}
                          onChange={(e) => {
                            const newConfig = [...unilevelConfigLocal]
                            newConfig[index].percentage = Number(e.target.value)
                            setUnilevelConfigLocal(newConfig)
                          }}
                          className="bg-gray-700 border-gray-600 text-white text-sm h-9 w-20"
                        />
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) => {
                          const newConfig = [...unilevelConfigLocal]
                          newConfig[index].isActive = checked
                          setUnilevelConfigLocal(newConfig)
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => saveUnilevelConfigMutation.mutate({
                          level: config.level,
                          percentage: config.percentage,
                          isActive: config.isActive,
                          walletAddress: currentWallet!,
                        })}
                        disabled={saveUnilevelConfigMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 w-fit"
                      >
                        {saveUnilevelConfigMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Binary Config Tab */}
        <TabsContent value="binary">
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-white">Binary Commission Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {mlmLoading ? (
                <LoadingSkeleton variant="detail" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Commission Percentage (%)</Label>
                      <Input
                        type="number"
                        value={binaryConfigLocal.percentage}
                        onChange={(e) => setBinaryConfigLocal({ ...binaryConfigLocal, percentage: Number(e.target.value) })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500">Percentage of weaker leg volume paid as commission</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Daily Cap (USDT)</Label>
                      <Input
                        type="number"
                        value={binaryConfigLocal.dailyCap}
                        onChange={(e) => setBinaryConfigLocal({ ...binaryConfigLocal, dailyCap: Number(e.target.value) })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500">Maximum binary commission per day</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Flush Out Threshold (%)</Label>
                      <Input
                        type="number"
                        value={binaryConfigLocal.flushOutThreshold}
                        onChange={(e) => setBinaryConfigLocal({ ...binaryConfigLocal, flushOutThreshold: Number(e.target.value) })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500">Volume remaining after flush (% of stronger leg)</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Active</Label>
                      <div className="flex items-center gap-3 h-10">
                        <Switch
                          checked={binaryConfigLocal.isActive}
                          onCheckedChange={(checked) => setBinaryConfigLocal({ ...binaryConfigLocal, isActive: checked })}
                        />
                        <span className="text-sm text-gray-400">
                          {binaryConfigLocal.isActive ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-amber-400 font-medium">Configuration Warning</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Changes to binary configuration will affect all users immediately. Ensure values are tested thoroughly before saving.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => saveBinaryConfigMutation.mutate({
                      ...binaryConfigLocal,
                      walletAddress: currentWallet!,
                    })}
                    disabled={saveBinaryConfigMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                  >
                    {saveBinaryConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">Users</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search wallet or code..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setUsersPage(1) }}
                      className="bg-gray-800 border-gray-700 text-white pl-9 h-9 w-48 sm:w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <LoadingSkeleton variant="table" count={6} />
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-6 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>Wallet</span>
                    <span>Staked</span>
                    <span>Earned</span>
                    <span>Ref Code</span>
                    <span>Status</span>
                    <span>Joined</span>
                  </div>
                  {users.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No Users Found"
                      description="No users match the search criteria."
                    />
                  ) : (
                    users.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors items-center"
                      >
                        <span className="text-sm text-gray-300 font-mono col-span-2 sm:col-span-1">
                          {`${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                        </span>
                        <span className="text-sm text-white">${user.totalStaked.toLocaleString()}</span>
                        <span className="text-sm text-emerald-400">${user.totalEarned.toLocaleString()}</span>
                        <span className="text-sm text-gray-400">{user.referralCode}</span>
                        <Badge variant="outline" className={`w-fit text-xs ${
                          user.isActive
                            ? 'border-emerald-500/30 text-emerald-400'
                            : 'border-gray-600 text-gray-500'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-4">
            {adminLoading ? (
              <LoadingSkeleton variant="cards" count={4} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold text-white">{stats?.totalUsers?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats?.activeUsers ?? 0} active</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">Total Staked</p>
                    <p className="text-2xl font-bold text-white">${stats?.totalStaked?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats?.activeStakes ?? 0} active stakes</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">Total Commissions</p>
                    <p className="text-2xl font-bold text-white">${stats?.totalCommissions?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-amber-400 mt-1">${stats?.pendingCommissions?.toLocaleString() ?? '0'} pending</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">Total Transactions</p>
                    <p className="text-2xl font-bold text-white">{stats?.totalTransactions?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-gray-500 mt-1">${stats?.totalWithdrawn?.toLocaleString() ?? '0'} withdrawn</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-white">Deposits vs Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockDepositData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Bar dataKey="deposits" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="withdrawals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{editPlan ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editPlan ? 'Modify staking plan details' : 'Create a new staking plan for users'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Plan Name</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g., Silver, Gold"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Input
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Plan description"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Duration (days)</Label>
                <Input
                  type="number"
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">APY (%)</Label>
                <Input
                  type="number"
                  value={planForm.apy}
                  onChange={(e) => setPlanForm({ ...planForm, apy: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Min Amount</Label>
                <Input
                  type="number"
                  value={planForm.minAmount}
                  onChange={(e) => setPlanForm({ ...planForm, minAmount: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Max Amount</Label>
                <Input
                  type="number"
                  value={planForm.maxAmount}
                  onChange={(e) => setPlanForm({ ...planForm, maxAmount: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Early Penalty (%)</Label>
                <Input
                  type="number"
                  value={planForm.earlyWithdrawPenalty}
                  onChange={(e) => setPlanForm({ ...planForm, earlyWithdrawPenalty: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Active</Label>
                <div className="h-9 flex items-center">
                  <Switch
                    checked={planForm.isActive}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, isActive: checked })}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleSavePlan}
              disabled={savePlanMutation.isPending || !planForm.name}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11"
            >
              {savePlanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                editPlan ? 'Update Plan' : 'Create Plan'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
