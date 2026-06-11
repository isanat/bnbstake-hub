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
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Shield, Plus, Edit, Trash2, Users, Settings, BarChart3,
  Search, Save, AlertTriangle, Coins, TrendingUp, Lock, Loader2,
  Award, Globe, Bell, Trophy, Sparkles, MessageSquare, Eye
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
  tier: string
  xpReward: number
  condition: { type: string; value?: string | number }
  reward: { type: string; amount?: number }
  isActive: boolean
  order: number
}

interface TranslationRow {
  id: string
  key: string
  locale: string
  value: string
  category: string
}

interface NotificationTemplate {
  id: string
  type: string
  titleEn: string
  titleEs: string
  titlePt: string
  messageEn: string
  messageEs: string
  messagePt: string
  isActive: boolean
}

const TRANSLATION_CATEGORIES = ['general', 'landing', 'dashboard', 'staking', 'network', 'commissions', 'admin', 'achievements', 'calculator', 'leaderboard']

export function AdminPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const isAdmin = useAppStore(s => s.isAdmin)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<AdminPlan | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [usersPage, setUsersPage] = useState(1)

  // Achievements admin state
  const [achieveDialogOpen, setAchieveDialogOpen] = useState(false)
  const [editAchievement, setEditAchievement] = useState<AchievementItem | null>(null)
  const [achieveForm, setAchieveForm] = useState({
    key: '',
    nameEn: '', nameEs: '', namePt: '',
    descEn: '', descEs: '', descPt: '',
    icon: 'Trophy', tier: 'bronze', xpReward: 50,
    conditionType: 'stake_count', conditionValue: '1',
    isActive: true,
  })

  // Translations admin state
  const [transCategory, setTransCategory] = useState('general')
  const [transSearch, setTransSearch] = useState('')
  const [transDialogOpen, setTransDialogOpen] = useState(false)
  const [editTransKey, setEditTransKey] = useState('')
  const [editTransLocale, setEditTransLocale] = useState<'en' | 'es' | 'pt'>('en')
  const [editTransValues, setEditTransValues] = useState({ en: '', es: '', pt: '' })

  // Notifications admin state
  const [notifDialogOpen, setNotifDialogOpen] = useState(false)
  const [editNotif, setEditNotif] = useState<NotificationTemplate | null>(null)
  const [notifForm, setNotifForm] = useState({
    type: '', titleEn: '', titleEs: '', titlePt: '',
    messageEn: '', messageEs: '', messagePt: '', isActive: true,
  })

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

  // Display overrides local state
  const [displayOverrides, setDisplayOverrides] = useState({
    display_tvl: '',
    display_stakers: '',
    display_rewards: '',
    display_network: '',
  })

  // Binary config local state
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

  // Fetch achievements for admin
  const { data: achievementsData, isLoading: achievementsLoading } = useQuery<AchievementItem[]>({
    queryKey: ['admin-achievements'],
    queryFn: () => fetch('/api/achievements').then(r => {
      if (!r.ok) throw new Error('Failed to fetch achievements')
      return r.json()
    }).then(d => d.achievements || d),
    enabled: isAdmin,
  })

  // Fetch translations for admin
  const { data: translationsData, isLoading: translationsLoading } = useQuery({
    queryKey: ['admin-translations', transCategory],
    queryFn: async () => {
      const [enRes, esRes, ptRes] = await Promise.all([
        fetch('/api/translations?locale=en').then(r => r.json()),
        fetch('/api/translations?locale=es').then(r => r.json()),
        fetch('/api/translations?locale=pt').then(r => r.json()),
      ])
      const enMap = enRes.translations || {}
      const esMap = esRes.translations || {}
      const ptMap = ptRes.translations || {}
      const enByCat = enRes.byCategory || {}
      const keys = Object.keys(enByCat[transCategory] || {})
      return keys.map(key => ({
        key,
        en: enMap[key] || '',
        es: esMap[key] || '',
        pt: ptMap[key] || '',
        category: transCategory,
      }))
    },
    enabled: isAdmin,
  })

  // Fetch notification templates
  const { data: notifTemplates, isLoading: notifLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ['admin-notifications'],
    queryFn: () => fetch('/api/notifications/templates').then(r => {
      if (!r.ok) {
        // Fallback mock data if API doesn't exist yet
        return [
          { id: '1', type: 'stake', titleEn: 'New Stake', titleEs: 'Nueva Apuesta', titlePt: 'Nova Aposta', messageEn: 'A user just staked {amount} USDT', messageEs: 'Un usuario acaba de apostar {amount} USDT', messagePt: 'Um usuário acabou de apostar {amount} USDT', isActive: true },
          { id: '2', type: 'commission', titleEn: 'Commission Earned', titleEs: 'Comisión Ganada', titlePt: 'Comissão Ganha', messageEn: 'You earned {amount} USDT in commissions', messageEs: 'Ganaste {amount} USDT en comisiones', messagePt: 'Você ganhou {amount} USDT em comissões', isActive: true },
          { id: '3', type: 'referral', titleEn: 'New Referral', titleEs: 'Nuevo Referido', titlePt: 'Novo Indicado', messageEn: 'A new member joined your network', messageEs: 'Un nuevo miembro se unió a tu red', messagePt: 'Um novo membro entrou na sua rede', isActive: true },
          { id: '4', type: 'level_up', titleEn: 'Level Up!', titleEs: '¡Subiste de Nivel!', titlePt: 'Subiu de Nível!', messageEn: 'Congratulations! You reached Level {level}', messageEs: '¡Felicidades! Alcanzaste el Nivel {level}', messagePt: 'Parabéns! Você alcançou o Nível {level}', isActive: true },
          { id: '5', type: 'achievement', titleEn: 'Achievement Unlocked', titleEs: 'Logro Desbloqueado', titlePt: 'Conquista Desbloqueada', messageEn: 'You unlocked: {name}', messageEs: 'Desbloqueaste: {name}', messagePt: 'Você desbloqueou: {name}', isActive: false },
        ] as NotificationTemplate[]
      }
      return r.json()
    }).then(d => d.templates || d),
    enabled: isAdmin,
  })

  // Fetch system config (display overrides)
  const { data: systemConfigData, isLoading: systemConfigLoading } = useQuery<{
    configs: Array<{ id: string; key: string; value: string; description: string }>
  }>({
    queryKey: ['admin-system-config', currentWallet],
    queryFn: () => fetch(`/api/admin/system-config?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch system config')
      return r.json()
    }),
    enabled: !!currentWallet && isAdmin,
  })

  // Initialize local mlm config from fetched data
  const unilevelConfig = mlmConfigData?.unilevel || []
  const binaryConfig = mlmConfigData?.binary

  // Sync local state when data arrives
  const [mlmSynced, setMlmSynced] = useState(false)
  const [displaySynced, setDisplaySynced] = useState(false)
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

  // Sync display overrides when system config data arrives
  if (systemConfigData?.configs && !displaySynced) {
    setDisplaySynced(true)
    const overrides: Record<string, string> = {}
    for (const cfg of systemConfigData.configs) {
      if (cfg.key.startsWith('display_')) {
        overrides[cfg.key] = cfg.value
      }
    }
    if (Object.keys(overrides).length > 0) {
      setDisplayOverrides(prev => ({
        ...prev,
        display_tvl: overrides.display_tvl ?? prev.display_tvl,
        display_stakers: overrides.display_stakers ?? prev.display_stakers,
        display_rewards: overrides.display_rewards ?? prev.display_rewards,
        display_network: overrides.display_network ?? prev.display_network,
      }))
    }
  }

  // Save display override mutation
  const saveDisplayOverrideMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      fetch(`/api/admin/system-config?wallet=${currentWallet}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, description: `Display override for ${data.key}` }),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to save display override')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-config', currentWallet] })
      // CRITICAL: Invalidate platform-stats so landing page & dashboard get updated values
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      toast.success('Display settings updated!')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleSaveAllDisplayOverrides = () => {
    const entries = [
      { key: 'display_tvl', value: displayOverrides.display_tvl },
      { key: 'display_stakers', value: displayOverrides.display_stakers },
      { key: 'display_rewards', value: displayOverrides.display_rewards },
      { key: 'display_network', value: displayOverrides.display_network },
    ]
    for (const entry of entries) {
      if (entry.value.trim()) {
        saveDisplayOverrideMutation.mutate({ key: entry.key, value: entry.value.trim() })
      }
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
      // CRITICAL: Invalidate user-facing queries so changes reflect on Dashboard/Staking
      queryClient.invalidateQueries({ queryKey: ['staking'] })
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
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
      // Also invalidate user-facing data
      queryClient.invalidateQueries({ queryKey: ['commissions'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
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
      // Also invalidate user-facing data
      queryClient.invalidateQueries({ queryKey: ['commissions'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      toast.success('Unilevel level updated!')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Save translation mutation
  const saveTranslationMutation = useMutation({
    mutationFn: (data: { key: string; locale: string; value: string; adminWallet: string }) =>
      fetch('/api/translations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to save translation')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-translations'] })
      toast.success(t('success'))
      setTransDialogOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Toggle achievement mutation
  const toggleAchievementMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      fetch('/api/achievements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to update achievement')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] })
      toast.success(t('success'))
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

  const openEditAchievement = (ach: AchievementItem) => {
    setEditAchievement(ach)
    setAchieveForm({
      key: ach.key,
      nameEn: ach.nameEn, nameEs: ach.nameEs, namePt: ach.namePt,
      descEn: ach.descEn, descEs: ach.descEs, descPt: ach.descPt,
      icon: ach.icon, tier: ach.tier, xpReward: ach.xpReward,
      conditionType: ach.condition?.type || 'stake_count',
      conditionValue: String(ach.condition?.value || '1'),
      isActive: ach.isActive,
    })
    setAchieveDialogOpen(true)
  }

  const openNewAchievement = () => {
    setEditAchievement(null)
    setAchieveForm({
      key: '',
      nameEn: '', nameEs: '', namePt: '',
      descEn: '', descEs: '', descPt: '',
      icon: 'Trophy', tier: 'bronze', xpReward: 50,
      conditionType: 'stake_count', conditionValue: '1',
      isActive: true,
    })
    setAchieveDialogOpen(true)
  }

  const openEditTranslation = (key: string, en: string, es: string, pt: string) => {
    setEditTransKey(key)
    setEditTransValues({ en, es, pt })
    setEditTransLocale('en')
    setTransDialogOpen(true)
  }

  const openEditNotif = (notif: NotificationTemplate) => {
    setEditNotif(notif)
    setNotifForm({
      type: notif.type,
      titleEn: notif.titleEn, titleEs: notif.titleEs, titlePt: notif.titlePt,
      messageEn: notif.messageEn, messageEs: notif.messageEs, messagePt: notif.messagePt,
      isActive: notif.isActive,
    })
    setNotifDialogOpen(true)
  }

  const filteredTranslations = (translationsData || []).filter(row =>
    !transSearch || row.key.toLowerCase().includes(transSearch.toLowerCase())
  )

  if (!isConnected || !isAdmin) {
    return (
      <div>
        <PageHeader title={t('admin_title')} description={t('admin_description')} />
        <EmptyState
          icon={Lock}
          title={t('access_denied')}
          description={t('admin_access')}
        />
      </div>
    )
  }

  const stats = adminData?.stats
  const plans = plansData || []
  const users = usersData?.users || []

  // Generate chart data from real stats
  const depositChartData = [
    { month: t('total_staked_admin'), value: stats?.totalStaked ?? 0 },
    { month: t('total_earned'), value: stats?.totalEarned ?? 0 },
    { month: t('total_commissions'), value: stats?.totalCommissions ?? 0 },
    { month: t('withdrawn'), value: stats?.totalWithdrawn ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin_title')}
        description={t('admin_description')}
        actions={
          <Badge className="bg-[#8247E5]/10 text-[#8247E5] border-[#8247E5]/20 gap-1">
            <Shield className="h-3 w-3" />
            {t('admin_access')}
          </Badge>
        }
      />

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="bg-gray-800/60 border border-[#8247E5]/10 flex-wrap h-auto gap-1 p-1 backdrop-blur-sm">
          <TabsTrigger value="plans" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Coins className="h-4 w-4 mr-1" />
            {t('plans')}
          </TabsTrigger>
          <TabsTrigger value="unilevel" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <TrendingUp className="h-4 w-4 mr-1" />
            {t('unilevel_config')}
          </TabsTrigger>
          <TabsTrigger value="binary" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Settings className="h-4 w-4 mr-1" />
            {t('binary_config')}
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Users className="h-4 w-4 mr-1" />
            {t('users')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <BarChart3 className="h-4 w-4 mr-1" />
            {t('reports')}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Award className="h-4 w-4 mr-1" />
            {t('admin_achievements_tab')}
          </TabsTrigger>
          <TabsTrigger value="translations" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Globe className="h-4 w-4 mr-1" />
            {t('admin_translations_tab')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Bell className="h-4 w-4 mr-1" />
            {t('admin_notifications_tab')}
          </TabsTrigger>
          <TabsTrigger value="display" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold text-xs sm:text-sm text-gray-400">
            <Eye className="h-4 w-4 mr-1" />
            Display
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg text-white">{t('admin_staking_plans')}</CardTitle>
                <Button onClick={openNewPlan} className="btn-poly gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  {t('add_plan')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <LoadingSkeleton variant="table" count={4} />
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-7 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>{t('plan_name')}</span>
                    <span>{t('duration_days')}</span>
                    <span>{t('daily_rate')}</span>
                    <span>{t('min_max')}</span>
                    <span>{t('penalty')}</span>
                    <span>{t('status')}</span>
                    <span>{t('actions')}</span>
                  </div>
                  {plans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/40 hover:bg-[#8247E5]/5 border border-transparent hover:border-[#8247E5]/10 transition-colors items-center"
                    >
                      <span className="text-sm font-medium text-white">{plan.name}</span>
                      <span className="text-sm text-gray-300">{plan.durationDays} {t('duration_days').toLowerCase()}</span>
                      <div className="text-sm">
                        <span className="font-bold text-[#8247E5]">{(plan.apy / 365).toFixed(2)}%/dia</span>
                        <span className="text-gray-600 text-xs ml-1">({plan.apy}% APY)</span>
                      </div>
                      <span className="text-sm text-gray-400">${plan.minAmount.toLocaleString()} - ${plan.maxAmount.toLocaleString()}</span>
                      <span className="text-sm text-red-400">{plan.earlyWithdrawPenalty}%</span>
                      <Badge variant="outline" className={`w-fit text-xs ${plan.isActive ? 'border-[#8247E5]/30 text-[#8247E5]' : 'border-gray-600 text-gray-500'}`}>
                        {plan.isActive ? t('active') : t('inactive')}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#8247E5] hover:bg-[#8247E5]/10" onClick={() => openEditPlan(plan)}>
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
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">{t('unilevel_config')}</CardTitle>
            </CardHeader>
            <CardContent>
              {mlmLoading ? (
                <LoadingSkeleton variant="table" count={5} />
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-4 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>{t('level')}</span>
                    <span>%</span>
                    <span>{t('active')}</span>
                    <span>{t('actions')}</span>
                  </div>
                  {unilevelConfigLocal.map((config, index) => (
                    <motion.div
                      key={config.level}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/40 border border-transparent hover:border-[#8247E5]/10 transition-colors items-center"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-[#8247E5]/10 flex items-center justify-center text-[#8247E5] text-sm font-bold">
                          {config.level}
                        </div>
                        <span className="text-sm text-white">{t('level')} {config.level}</span>
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
                          className="bg-gray-800/60 border-[#8247E5]/20 text-white text-sm h-9 w-20 focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
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
                        className="btn-poly rounded-xl gap-1 w-fit"
                      >
                        {saveUnilevelConfigMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        {t('admin_save')}
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
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">{t('binary_config')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {mlmLoading ? (
                <LoadingSkeleton variant="detail" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300">{t('commission_percentage')}</Label>
                      <Input
                        type="number"
                        value={binaryConfigLocal.percentage}
                        onChange={(e) => setBinaryConfigLocal({ ...binaryConfigLocal, percentage: Number(e.target.value) })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">{t('binary_commission_desc')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">{t('daily_cap')}</Label>
                      <Input
                        type="number"
                        value={binaryConfigLocal.dailyCap}
                        onChange={(e) => setBinaryConfigLocal({ ...binaryConfigLocal, dailyCap: Number(e.target.value) })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">{t('daily_cap_desc')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">{t('flush_threshold')}</Label>
                      <Input
                        type="number"
                        value={binaryConfigLocal.flushOutThreshold}
                        onChange={(e) => setBinaryConfigLocal({ ...binaryConfigLocal, flushOutThreshold: Number(e.target.value) })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">{t('flush_threshold_desc')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">{t('active')}</Label>
                      <div className="flex items-center gap-3 h-10">
                        <Switch
                          checked={binaryConfigLocal.isActive}
                          onCheckedChange={(checked) => setBinaryConfigLocal({ ...binaryConfigLocal, isActive: checked })}
                        />
                        <span className="text-sm text-gray-400">
                          {binaryConfigLocal.isActive ? t('enabled') : t('disabled')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#8247E5]/5 border border-[#8247E5]/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-[#8247E5] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-[#8247E5] font-medium">{t('configuration_warning')}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t('configuration_warning_desc')}
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
                    className="btn-poly rounded-xl gap-2"
                  >
                    {saveBinaryConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t('save_config')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg text-white">{t('users')}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder={t('search_users')}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setUsersPage(1) }}
                      className="bg-gray-800/60 border-[#8247E5]/20 text-white pl-9 h-9 w-48 sm:w-64 focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
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
                    <span>{t('wallet')}</span>
                    <span>{t('total_staked')}</span>
                    <span>{t('total_earned')}</span>
                    <span>{t('ref_code')}</span>
                    <span>{t('status')}</span>
                    <span>{t('joined')}</span>
                  </div>
                  {users.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title={t('no_users_found')}
                      description={t('no_data')}
                    />
                  ) : (
                    users.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/40 hover:bg-[#8247E5]/5 border border-transparent hover:border-[#8247E5]/10 transition-colors items-center"
                      >
                        <span className="text-sm text-gray-300 font-mono col-span-2 sm:col-span-1">
                          {`${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                        </span>
                        <span className="text-sm text-white">${user.totalStaked.toLocaleString()}</span>
                        <span className="text-sm text-[#8247E5]">${user.totalEarned.toLocaleString()}</span>
                        <span className="text-sm text-gray-400">{user.referralCode}</span>
                        <Badge variant="outline" className={`w-fit text-xs ${user.isActive ? 'border-[#8247E5]/30 text-[#8247E5]' : 'border-gray-600 text-gray-500'}`}>
                          {user.isActive ? t('active') : t('inactive')}
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
                <Card className="glass-card backdrop-blur-xl">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">{t('total_users')}</p>
                    <p className="text-2xl font-bold text-[#8247E5]">{stats?.totalUsers?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats?.activeUsers ?? 0} {t('active').toLowerCase()}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card backdrop-blur-xl">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">{t('total_staked_admin')}</p>
                    <p className="text-2xl font-bold text-[#8247E5]">${stats?.totalStaked?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats?.activeStakes ?? 0} {t('active_stakes').toLowerCase()}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card backdrop-blur-xl">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">{t('total_commissions')}</p>
                    <p className="text-2xl font-bold text-[#8247E5]">${stats?.totalCommissions?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-[#9B6DFF] mt-1">${stats?.pendingCommissions?.toLocaleString() ?? '0'} {t('pending').toLowerCase()}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card backdrop-blur-xl">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">{t('total_transactions')}</p>
                    <p className="text-2xl font-bold text-[#8247E5]">{stats?.totalTransactions?.toLocaleString() ?? '0'}</p>
                    <p className="text-xs text-gray-500 mt-1">${stats?.totalWithdrawn?.toLocaleString() ?? '0'} {t('withdrawn').toLowerCase()}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="glass-card backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">{t('deposits_vs_withdrawals')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={depositChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 15, 25, 0.9)',
                          border: '1px solid rgba(130, 71, 229, 0.2)',
                          borderRadius: '12px',
                          color: '#fff',
                          backdropFilter: 'blur(20px)',
                        }}
                      />
                      <Bar dataKey="value" fill="#8247E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== NEW: Achievements Tab ===== */}
        <TabsContent value="achievements">
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#8247E5]" />
                  {t('admin_achievements_tab')}
                </CardTitle>
                <Button onClick={openNewAchievement} className="btn-poly gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  {t('create')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <LoadingSkeleton variant="table" count={4} />
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-7 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>{t('key')}</span>
                    <span>{t('icon')}</span>
                    <span>{t('tier')}</span>
                    <span>{t('xp_reward')}</span>
                    <span>{t('condition')}</span>
                    <span>{t('status')}</span>
                    <span>{t('actions')}</span>
                  </div>
                  {(achievementsData || []).map((ach, index) => (
                    <motion.div
                      key={ach.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/40 hover:bg-[#8247E5]/5 border border-transparent hover:border-[#8247E5]/10 transition-colors items-center"
                    >
                      <span className="text-sm font-mono text-[#8247E5] truncate">{ach.key}</span>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-[#8247E5]" />
                        <span className="text-sm text-gray-300 truncate">{ach.icon}</span>
                      </div>
                      <Badge variant="outline" className={`w-fit text-xs capitalize ${
                        ach.tier === 'gold' ? 'border-[#8247E5]/30 text-[#8247E5]' :
                        ach.tier === 'diamond' ? 'border-cyan-400/30 text-cyan-400' :
                        ach.tier === 'silver' ? 'border-gray-400/30 text-gray-300' :
                        'border-amber-700/30 text-amber-600'
                      }`}>
                        {ach.tier}
                      </Badge>
                      <span className="text-sm text-[#8247E5] font-medium">+{ach.xpReward} XP</span>
                      <span className="text-xs text-gray-500">{ach.condition?.type || '-'}</span>
                      <Switch
                        checked={ach.isActive}
                        onCheckedChange={(checked) => toggleAchievementMutation.mutate({ id: ach.id, isActive: checked })}
                        disabled={toggleAchievementMutation.isPending}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#8247E5] hover:bg-[#8247E5]/10" onClick={() => openEditAchievement(ach)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievement Dialog */}
          <Dialog open={achieveDialogOpen} onOpenChange={setAchieveDialogOpen}>
            <DialogContent className="glass-strong border-[#8247E5]/15 text-white sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="text-xl text-gradient-poly">
                  {editAchievement ? t('edit') + ' ' + t('admin_achievements_tab') : t('create') + ' ' + t('admin_achievements_tab')}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {t('achievements_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('key')}</Label>
                    <Input value={achieveForm.key} onChange={(e) => setAchieveForm({ ...achieveForm, key: e.target.value })} placeholder="first_stake" className="bg-gray-800/60 border-[#8247E5]/20 text-white font-mono" disabled={!!editAchievement} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('icon')}</Label>
                    <Input value={achieveForm.icon} onChange={(e) => setAchieveForm({ ...achieveForm, icon: e.target.value })} placeholder="Trophy" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇺🇸</span> EN</Label>
                    <Input value={achieveForm.nameEn} onChange={(e) => setAchieveForm({ ...achieveForm, nameEn: e.target.value })} placeholder="Name (EN)" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇪🇸</span> ES</Label>
                    <Input value={achieveForm.nameEs} onChange={(e) => setAchieveForm({ ...achieveForm, nameEs: e.target.value })} placeholder="Nombre (ES)" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇧🇷</span> PT</Label>
                    <Input value={achieveForm.namePt} onChange={(e) => setAchieveForm({ ...achieveForm, namePt: e.target.value })} placeholder="Nome (PT)" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇺🇸</span> {t('description')}</Label>
                    <Input value={achieveForm.descEn} onChange={(e) => setAchieveForm({ ...achieveForm, descEn: e.target.value })} placeholder="Description (EN)" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇪🇸</span> {t('description')}</Label>
                    <Input value={achieveForm.descEs} onChange={(e) => setAchieveForm({ ...achieveForm, descEs: e.target.value })} placeholder="Descripción (ES)" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇧🇷</span> {t('description')}</Label>
                    <Input value={achieveForm.descPt} onChange={(e) => setAchieveForm({ ...achieveForm, descPt: e.target.value })} placeholder="Descrição (PT)" className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('tier')}</Label>
                    <Select value={achieveForm.tier} onValueChange={(v) => setAchieveForm({ ...achieveForm, tier: v })}>
                      <SelectTrigger className="bg-gray-800/60 border-[#8247E5]/20 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0f0f1a] border-[#8247E5]/15">
                        <SelectItem value="bronze" className="text-white">Bronze</SelectItem>
                        <SelectItem value="silver" className="text-white">Silver</SelectItem>
                        <SelectItem value="gold" className="text-white">Gold</SelectItem>
                        <SelectItem value="diamond" className="text-white">Diamond</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('xp_reward')}</Label>
                    <Input type="number" value={achieveForm.xpReward} onChange={(e) => setAchieveForm({ ...achieveForm, xpReward: Number(e.target.value) })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('condition_type')}</Label>
                    <Select value={achieveForm.conditionType} onValueChange={(v) => setAchieveForm({ ...achieveForm, conditionType: v })}>
                      <SelectTrigger className="bg-gray-800/60 border-[#8247E5]/20 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0f0f1a] border-[#8247E5]/15">
                        <SelectItem value="stake_count" className="text-white">Stake Count</SelectItem>
                        <SelectItem value="total_staked" className="text-white">Total Staked</SelectItem>
                        <SelectItem value="referral_count" className="text-white">Referral Count</SelectItem>
                        <SelectItem value="commission_earned" className="text-white">Commission Earned</SelectItem>
                        <SelectItem value="days_active" className="text-white">Days Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('condition_value')}</Label>
                    <Input value={achieveForm.conditionValue} onChange={(e) => setAchieveForm({ ...achieveForm, conditionValue: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-gray-300">{t('active')}</Label>
                  <Switch checked={achieveForm.isActive} onCheckedChange={(c) => setAchieveForm({ ...achieveForm, isActive: c })} />
                </div>
                <Button className="w-full btn-poly rounded-xl h-11" disabled={!achieveForm.nameEn}>
                  {editAchievement ? t('edit') : t('create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== NEW: Translations Tab ===== */}
        <TabsContent value="translations">
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#8247E5]" />
                  {t('admin_translations_tab')}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={transCategory} onValueChange={setTransCategory}>
                    <SelectTrigger className="w-[160px] bg-gray-800/60 border-[#8247E5]/20 text-white text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f0f1a] border-[#8247E5]/15">
                      {TRANSLATION_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-white capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <Input
                      placeholder={t('search') + ' ' + t('key')}
                      value={transSearch}
                      onChange={(e) => setTransSearch(e.target.value)}
                      className="bg-gray-800/60 border-[#8247E5]/20 text-white pl-9 h-9 w-48 focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {translationsLoading ? (
                <LoadingSkeleton variant="table" count={8} />
              ) : filteredTranslations.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title={t('no_data')}
                  description={t('no_translations_found')}
                />
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="hidden sm:grid grid-cols-5 gap-4 p-3 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-[#0f0f1a] z-10">
                    <span>{t('key')}</span>
                    <span>🇺🇸 EN</span>
                    <span>🇪🇸 ES</span>
                    <span>🇧🇷 PT</span>
                    <span>{t('actions')}</span>
                  </div>
                  {filteredTranslations.map((row: { key: string; en: string; es: string; pt: string }) => (
                    <div key={row.key} className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 p-3 rounded-xl bg-gray-800/40 hover:bg-[#8247E5]/5 border border-transparent hover:border-[#8247E5]/10 transition-colors items-center">
                      <span className="text-sm font-mono text-[#8247E5] truncate">{row.key}</span>
                      <span className="text-xs text-gray-300 truncate">{row.en || <span className="text-gray-600 italic">empty</span>}</span>
                      <span className="text-xs text-gray-300 truncate">{row.es || <span className="text-gray-600 italic">empty</span>}</span>
                      <span className="text-xs text-gray-300 truncate">{row.pt || <span className="text-gray-600 italic">empty</span>}</span>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-[#8247E5] hover:bg-[#8247E5]/10 gap-1" onClick={() => openEditTranslation(row.key, row.en, row.es, row.pt)}>
                        <Edit className="h-3.5 w-3.5" />
                        {t('edit')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Translation Edit Dialog */}
          <Dialog open={transDialogOpen} onOpenChange={setTransDialogOpen}>
            <DialogContent className="glass-strong border-[#8247E5]/15 text-white sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl text-gradient-poly">{t('edit')} {t('translation')}</DialogTitle>
                <DialogDescription className="text-gray-400 font-mono text-xs">
                  {editTransKey}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Tabs value={editTransLocale} onValueChange={(v) => setEditTransLocale(v as 'en' | 'es' | 'pt')}>
                  <TabsList className="bg-gray-800/60 border border-[#8247E5]/10">
                    <TabsTrigger value="en" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] text-xs">🇺🇸 EN</TabsTrigger>
                    <TabsTrigger value="es" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] text-xs">🇪🇸 ES</TabsTrigger>
                    <TabsTrigger value="pt" className="data-[state=active]:bg-[#8247E5] data-[state=active]:text-[#0a0a0f] text-xs">🇧🇷 PT</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="space-y-2">
                  <Label className="text-gray-300">
                    {editTransLocale === 'en' ? '🇺🇸 English' : editTransLocale === 'es' ? '🇪🇸 Español' : '🇧🇷 Português'}
                  </Label>
                  <Input
                    value={editTransValues[editTransLocale]}
                    onChange={(e) => setEditTransValues({ ...editTransValues, [editTransLocale]: e.target.value })}
                    className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                  />
                </div>
                <Button
                  onClick={() => {
                    // Save all three locales
                    ['en', 'es', 'pt'].forEach(locale => {
                      saveTranslationMutation.mutate({
                        key: editTransKey,
                        locale: locale as 'en' | 'es' | 'pt',
                        value: editTransValues[locale as 'en' | 'es' | 'pt'],
                        adminWallet: currentWallet!,
                      })
                    })
                  }}
                  disabled={saveTranslationMutation.isPending}
                  className="w-full btn-poly rounded-xl h-11"
                >
                  {saveTranslationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {t('admin_save')} ({t('all_locales')})
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== NEW: Notifications Tab ===== */}
        <TabsContent value="notifications">
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#8247E5]" />
                {t('admin_notifications_tab')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifLoading ? (
                <LoadingSkeleton variant="table" count={5} />
              ) : (
                <div className="space-y-3">
                  {(notifTemplates || []).map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-[#8247E5]/10 flex items-center justify-center">
                            <Bell className="h-4 w-4 text-[#8247E5]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white capitalize">{notif.type.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500">{notif.titleEn}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={notif.isActive}
                            onCheckedChange={() => {
                              toast.success(t('success'))
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#8247E5] hover:bg-[#8247E5]/10" onClick={() => openEditNotif(notif)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Preview */}
                      <div className="p-3 rounded-lg bg-[#0a0a0f]/60 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">{t('preview')}</p>
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-[#8247E5] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-white font-medium">{notif.titleEn}</p>
                            <p className="text-xs text-gray-400">{notif.messageEn}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Edit Dialog */}
          <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
            <DialogContent className="glass-strong border-[#8247E5]/15 text-white sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="text-xl text-gradient-poly">{t('edit')} {t('notification')}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {t('notif_edit_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-gray-300">{t('type')}</Label>
                  <Input value={notifForm.type} onChange={(e) => setNotifForm({ ...notifForm, type: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                </div>
                {/* Title per locale */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇺🇸</span> {t('title')}</Label>
                    <Input value={notifForm.titleEn} onChange={(e) => setNotifForm({ ...notifForm, titleEn: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇪🇸</span> {t('title')}</Label>
                    <Input value={notifForm.titleEs} onChange={(e) => setNotifForm({ ...notifForm, titleEs: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇧🇷</span> {t('title')}</Label>
                    <Input value={notifForm.titlePt} onChange={(e) => setNotifForm({ ...notifForm, titlePt: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                {/* Message per locale */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇺🇸</span> {t('message')}</Label>
                    <Input value={notifForm.messageEn} onChange={(e) => setNotifForm({ ...notifForm, messageEn: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇪🇸</span> {t('message')}</Label>
                    <Input value={notifForm.messageEs} onChange={(e) => setNotifForm({ ...notifForm, messageEs: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-1"><span className="text-xs">🇧🇷</span> {t('message')}</Label>
                    <Input value={notifForm.messagePt} onChange={(e) => setNotifForm({ ...notifForm, messagePt: e.target.value })} className="bg-gray-800/60 border-[#8247E5]/20 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-gray-300">{t('active')}</Label>
                  <Switch checked={notifForm.isActive} onCheckedChange={(c) => setNotifForm({ ...notifForm, isActive: c })} />
                </div>
                <Button className="w-full btn-poly rounded-xl h-11" disabled={!notifForm.type}>
                  {saveTranslationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('admin_save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Display Settings Tab */}
        <TabsContent value="display">
          <Card className="glass-card backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {systemConfigLoading ? (
                <LoadingSkeleton variant="detail" />
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-[#8247E5]/5 border border-[#8247E5]/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-[#8247E5] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-[#8247E5] font-medium">Display Overrides</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Set custom display values for the landing page and dashboard stats. Leave a field empty to use the real data from the database. These values override the actual numbers shown to users.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Total Value Locked (TVL)</Label>
                      <Input
                        type="number"
                        placeholder="Use real data"
                        value={displayOverrides.display_tvl}
                        onChange={(e) => setDisplayOverrides({ ...displayOverrides, display_tvl: e.target.value })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">Override the TVL shown on landing page &amp; stats</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Total Stakers</Label>
                      <Input
                        type="number"
                        placeholder="Use real data"
                        value={displayOverrides.display_stakers}
                        onChange={(e) => setDisplayOverrides({ ...displayOverrides, display_stakers: e.target.value })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">Override the staker count shown on landing page &amp; stats</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Total Rewards Distributed</Label>
                      <Input
                        type="number"
                        placeholder="Use real data"
                        value={displayOverrides.display_rewards}
                        onChange={(e) => setDisplayOverrides({ ...displayOverrides, display_rewards: e.target.value })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">Override the rewards amount shown on landing page &amp; stats</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Network Size</Label>
                      <Input
                        type="number"
                        placeholder="Use real data"
                        value={displayOverrides.display_network}
                        onChange={(e) => setDisplayOverrides({ ...displayOverrides, display_network: e.target.value })}
                        className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                      />
                      <p className="text-xs text-gray-500">Override the network size shown on landing page &amp; stats</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveAllDisplayOverrides}
                    disabled={saveDisplayOverrideMutation.isPending}
                    className="btn-poly rounded-xl gap-2"
                  >
                    {saveDisplayOverrideMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Display Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="glass-strong border-[#8247E5]/15 text-white sm:max-w-md backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-gradient-poly">{editPlan ? t('edit_plan') : t('add_plan')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editPlan ? t('edit_plan_desc') : t('add_plan_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-300">{t('plan_name')}</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g., Silver, Gold"
                className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">{t('description')}</Label>
              <Input
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder={t('description')}
                className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">{t('duration_days')}</Label>
                <Input
                  type="number"
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                  className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">{t('apy_percent')}</Label>
                <Input
                  type="number"
                  value={planForm.apy}
                  onChange={(e) => setPlanForm({ ...planForm, apy: Number(e.target.value) })}
                  className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                />
                {planForm.apy > 0 && (
                  <p className="text-xs text-[#9B6DFF] font-medium">
                    = ${((planForm.apy / 100) / 365 * 1000).toFixed(2)}/day per $1,000 staked
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">{t('min_amount')}</Label>
                <Input
                  type="number"
                  value={planForm.minAmount}
                  onChange={(e) => setPlanForm({ ...planForm, minAmount: Number(e.target.value) })}
                  className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">{t('max_amount')}</Label>
                <Input
                  type="number"
                  value={planForm.maxAmount}
                  onChange={(e) => setPlanForm({ ...planForm, maxAmount: Number(e.target.value) })}
                  className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">{t('penalty')}</Label>
                <Input
                  type="number"
                  value={planForm.earlyWithdrawPenalty}
                  onChange={(e) => setPlanForm({ ...planForm, earlyWithdrawPenalty: Number(e.target.value) })}
                  className="bg-gray-800/60 border-[#8247E5]/20 text-white focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">{t('active')}</Label>
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
              className="w-full btn-poly rounded-xl h-11"
            >
              {savePlanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('saving')}
                </>
              ) : (
                editPlan ? t('update_plan') : t('create_plan')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
