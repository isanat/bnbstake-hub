'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Wallet, Users, TreePine, GitBranch, Copy, Check,
  Link2, UserPlus
} from 'lucide-react'
import { motion } from 'framer-motion'

interface UnilevelNode {
  id: string
  walletAddress: string
  referralCode: string
  totalStaked: number
  isActive: boolean
  level: number
  children: UnilevelNode[]
}

interface BinaryNode {
  id: string
  walletAddress: string
  referralCode: string
  totalStaked: number
  leftVolume: number
  rightVolume: number
  isActive: boolean
  side: string
  left: BinaryNode | null
  right: BinaryNode | null
}

interface NetworkData {
  referralLink: { referralCode: string; walletAddress: string }
  referrer: null | { walletAddress: string; referralCode: string }
  unilevelTree: UnilevelNode
  binaryTree: BinaryNode
  stats: {
    directReferrals: number
    binaryChildren: number
    totalNetworkSize: number
    leftVolume: number
    rightVolume: number
    weakerLeg: number
    strongerLeg: number
  }
}

function truncateAddress(address: string): string {
  if (!address) return '0x0000...0000'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface UnilevelNodeProps {
  node: UnilevelNode
  level: number
}

function UnilevelNodeComponent({ node, level }: UnilevelNodeProps) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: level * 0.1 }}
        className="relative"
      >
        <div className={`px-4 py-3 rounded-xl text-center min-w-[150px] backdrop-blur-md transition-all duration-300 ${
          node.isActive
            ? 'bg-[#0a0a0f]/80 border border-[#F0B90B]/30 shadow-[0_0_15px_rgba(240,185,11,0.08)]'
            : 'bg-[#0a0a0f]/50 border border-dashed border-gray-700'
        }`}>
          <p className="text-xs font-mono text-gray-300">{truncateAddress(node.walletAddress)}</p>
          <p className="text-sm font-semibold text-[#F0B90B] mt-1">
            ${node.totalStaked.toLocaleString()}
          </p>
          <Badge variant="outline" className={`mt-1 text-xs ${
            node.isActive
              ? 'border-[#F0B90B]/30 text-[#F0B90B] bg-[#F0B90B]/5'
              : 'border-gray-600 text-gray-500'
          }`}>
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </motion.div>
      {node.children && node.children.length > 0 && (
        <>
          <div className="w-px h-5 bg-gradient-to-b from-[#F0B90B]/40 to-[#F0B90B]/10" />
          <div className="relative flex gap-4 sm:gap-8">
            <div className="absolute top-0 left-1/2 right-1/2 h-px bg-gradient-to-r from-transparent via-[#F0B90B]/30 to-transparent" />
            {node.children.map((child, i) => (
              <UnilevelNodeComponent key={child.id || i} node={child} level={level + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface BinaryNodeProps {
  node: BinaryNode | null
  side?: 'left' | 'right' | 'root'
  level: number
}

function BinaryNodeComponent({ node, side = 'root', level }: BinaryNodeProps) {
  if (!node) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: level * 0.1 }}
        className="px-4 py-3 rounded-xl border border-dashed border-gray-700 text-center min-w-[130px] bg-[#0a0a0f]/30 backdrop-blur-sm"
      >
        <UserPlus className="h-4 w-4 text-gray-600 mx-auto mb-1" />
        <p className="text-xs text-gray-600">Empty</p>
      </motion.div>
    )
  }

  const borderColor = side === 'left'
    ? 'border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.06)]'
    : side === 'right'
    ? 'border-[#F0B90B]/40 shadow-[0_0_12px_rgba(240,185,11,0.06)]'
    : 'border-[#F0B90B]/20'

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: level * 0.1 }}
        className="relative"
      >
        <div className={`px-4 py-3 rounded-xl border text-center min-w-[140px] backdrop-blur-md bg-[#0a0a0f]/80 transition-all duration-300 ${borderColor}`}>
          <p className="text-xs font-mono text-gray-300">{truncateAddress(node.walletAddress)}</p>
          <div className="flex justify-between gap-2 mt-1 text-xs">
            <span className="text-emerald-400">L: ${node.leftVolume.toLocaleString()}</span>
            <span className="text-[#F0B90B]">R: ${node.rightVolume.toLocaleString()}</span>
          </div>
          <Badge variant="outline" className={`mt-1 text-xs ${
            node.isActive
              ? 'border-[#F0B90B]/30 text-[#F0B90B] bg-[#F0B90B]/5'
              : 'border-gray-600 text-gray-500'
          }`}>
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </motion.div>
      {level < 3 && (
        <>
          <div className={`w-px h-5 ${
            side === 'left'
              ? 'bg-gradient-to-b from-emerald-500/40 to-emerald-500/10'
              : side === 'right'
              ? 'bg-gradient-to-b from-[#F0B90B]/40 to-[#F0B90B]/10'
              : 'bg-gradient-to-b from-[#F0B90B]/30 to-[#F0B90B]/10'
          }`} />
          <div className="flex gap-4 sm:gap-6">
            <BinaryNodeComponent node={node.left} side="left" level={level + 1} />
            <BinaryNodeComponent node={node.right} side="right" level={level + 1} />
          </div>
        </>
      )}
    </div>
  )
}

export function NetworkPage() {
  const currentWallet = useAppStore(s => s.currentWallet)
  const isConnected = useAppStore(s => s.isConnected)
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()

  const { data: networkData, isLoading, error } = useQuery<NetworkData>({
    queryKey: ['network', currentWallet],
    queryFn: () => fetch(`/api/network?wallet=${currentWallet}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch network data')
      return r.json()
    }),
    enabled: !!currentWallet,
  })

  const referralCode = networkData?.referralLink?.referralCode || 'demo'
  const referralLink = `https://stakebnb.io/ref/${referralCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Referral link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy referral link')
    }
  }

  if (!isConnected) {
    return (
      <div>
        <PageHeader title={t('network_title')} description={t('network_description')} />
        <EmptyState
          icon={Wallet}
          title={t('connect_wallet_title')}
          description={t('connect_wallet_desc')}
        />
      </div>
    )
  }

  const stats = networkData?.stats

  return (
    <div className="space-y-6">
      <PageHeader title={t('network_title')} description={t('network_description')} />

      {/* Referral Link - Glass card with golden accent */}
      <Card className="glass-card glow-bnb rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-2 rounded-lg bg-[#F0B90B]/10">
                <Link2 className="h-5 w-5 text-[#F0B90B]" />
              </div>
              <span className="text-sm font-medium text-white">{t('referral_link')}</span>
            </div>
            <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
              <Input
                value={referralLink}
                readOnly
                className="bg-[#0a0a0f]/60 border-[#F0B90B]/15 text-gray-300 text-sm font-mono focus-visible:ring-[#F0B90B]/30"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className={`shrink-0 rounded-xl transition-all duration-300 ${
                  copied
                    ? 'border-[#F0B90B]/50 bg-[#F0B90B]/10 text-[#F0B90B]'
                    : 'border-[#F0B90B]/20 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/40'
                }`}
              >
                {copied ? <Check className="h-4 w-4 text-[#F0B90B]" /> : <Copy className="h-4 w-4 text-[#F0B90B]" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Stats */}
      {isLoading ? (
        <LoadingSkeleton variant="cards" count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Users} label={t('direct_referrals')} value={`${stats?.directReferrals ?? 0}`} trend={stats?.directReferrals ? { value: 20, positive: true } : undefined} variant="gold" />
          <StatsCard icon={TreePine} label={t('total_network')} value={`${stats?.totalNetworkSize ?? 0}`} trend={stats?.totalNetworkSize ? { value: 15, positive: true } : undefined} variant="gold" />
          <StatsCard icon={GitBranch} label={t('left_volume')} value={`$${(stats?.leftVolume ?? 0).toLocaleString()}`} />
          <StatsCard icon={GitBranch} label={t('right_volume')} value={`$${(stats?.rightVolume ?? 0).toLocaleString()}`} variant="gold" />
        </div>
      )}

      {/* Tree Tabs */}
      <Tabs defaultValue="unilevel" className="space-y-4">
        <TabsList className="bg-[#0a0a0f]/80 border border-[#F0B90B]/10 backdrop-blur-sm">
          <TabsTrigger value="unilevel" className="data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold">
            <TreePine className="h-4 w-4 mr-2" />
            {t('unilevel')}
          </TabsTrigger>
          <TabsTrigger value="binary" className="data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold">
            <GitBranch className="h-4 w-4 mr-2" />
            {t('binary')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unilevel">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <TreePine className="h-5 w-5 text-[#F0B90B]" />
                {t('unilevel_tree')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSkeleton variant="detail" />
              ) : !networkData?.unilevelTree ? (
                <EmptyState
                  icon={TreePine}
                  title={t('no_network')}
                  description={t('connect_wallet_desc')}
                />
              ) : (
                <>
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[800px] flex justify-center">
                      <UnilevelNodeComponent node={networkData.unilevelTree} level={0} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded border border-[#F0B90B]/30 bg-[#F0B90B]/10" />
                      {t('active')}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded border border-dashed border-gray-700 bg-[#0a0a0f]/50" />
                      {t('inactive')}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="binary">
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-[#F0B90B]" />
                  {t('binary_tree')}
                </CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                    {t('left_leg')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-[#F0B90B]/20 border border-[#F0B90B]/40" />
                    {t('right_leg')}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSkeleton variant="detail" />
              ) : !networkData?.binaryTree ? (
                <EmptyState
                  icon={GitBranch}
                  title={t('no_binary')}
                  description={t('connect_wallet_desc')}
                />
              ) : (
                <>
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[800px] flex justify-center">
                      <BinaryNodeComponent node={networkData.binaryTree} side="root" level={0} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                      <p className="text-sm text-gray-400 mb-1">{t('left_volume')}</p>
                      <p className="text-2xl font-bold text-emerald-400">${(stats?.leftVolume ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-5 rounded-xl bg-[#F0B90B]/5 border border-[#F0B90B]/20 text-center shadow-[0_0_20px_rgba(240,185,11,0.05)]">
                      <p className="text-sm text-gray-400 mb-1">{t('right_volume')}</p>
                      <p className="text-2xl font-bold text-[#F0B90B]">${(stats?.rightVolume ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
