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
        <div className={`px-3 py-2 rounded-xl border text-center min-w-[140px] ${
          node.isActive
            ? 'bg-gray-800/80 border-emerald-500/30'
            : 'bg-gray-800/40 border-gray-700'
        }`}>
          <p className="text-xs font-mono text-gray-300">{truncateAddress(node.walletAddress)}</p>
          <p className="text-sm font-semibold text-emerald-400 mt-1">
            ${node.totalStaked.toLocaleString()}
          </p>
          <Badge variant="outline" className={`mt-1 text-xs ${
            node.isActive
              ? 'border-emerald-500/30 text-emerald-400'
              : 'border-gray-600 text-gray-500'
          }`}>
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </motion.div>
      {node.children && node.children.length > 0 && (
        <>
          <div className="w-px h-4 bg-gray-700" />
          <div className="relative flex gap-4 sm:gap-8">
            <div className="absolute top-0 left-1/2 right-1/2 h-px bg-gray-700" />
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
        className="px-3 py-2 rounded-xl border border-dashed border-gray-700 text-center min-w-[120px] bg-gray-800/20"
      >
        <UserPlus className="h-4 w-4 text-gray-600 mx-auto mb-1" />
        <p className="text-xs text-gray-600">Empty</p>
      </motion.div>
    )
  }

  const borderColor = side === 'left' ? 'border-emerald-500/40' : side === 'right' ? 'border-amber-500/40' : 'border-gray-600'

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: level * 0.1 }}
        className="relative"
      >
        <div className={`px-3 py-2 rounded-xl border text-center min-w-[130px] bg-gray-800/80 ${borderColor}`}>
          <p className="text-xs font-mono text-gray-300">{truncateAddress(node.walletAddress)}</p>
          <div className="flex justify-between gap-2 mt-1 text-xs">
            <span className="text-emerald-400">L: ${node.leftVolume.toLocaleString()}</span>
            <span className="text-amber-400">R: ${node.rightVolume.toLocaleString()}</span>
          </div>
          <Badge variant="outline" className={`mt-1 text-xs ${
            node.isActive
              ? 'border-emerald-500/30 text-emerald-400'
              : 'border-gray-600 text-gray-500'
          }`}>
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </motion.div>
      {level < 3 && (
        <>
          <div className="w-px h-4 bg-gray-700" />
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
        <PageHeader title="Network" description="View your referral network" />
        <EmptyState
          icon={Wallet}
          title="Wallet Not Connected"
          description="Connect your wallet to view your referral network and tree structure."
        />
      </div>
    )
  }

  const stats = networkData?.stats

  return (
    <div className="space-y-6">
      <PageHeader title="Network" description="Your referral network on BNB Smart Chain" />

      {/* Referral Link */}
      <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Link2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-white">Referral Link</span>
            </div>
            <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
              <Input
                value={referralLink}
                readOnly
                className="bg-gray-800 border-gray-700 text-gray-300 text-sm font-mono"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className="border-gray-700 hover:bg-gray-800 shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
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
          <StatsCard icon={Users} label="Direct Referrals" value={`${stats?.directReferrals ?? 0}`} trend={stats?.directReferrals ? { value: 20, positive: true } : undefined} />
          <StatsCard icon={TreePine} label="Total Network" value={`${stats?.totalNetworkSize ?? 0}`} trend={stats?.totalNetworkSize ? { value: 15, positive: true } : undefined} />
          <StatsCard icon={GitBranch} label="Left Volume" value={`$${(stats?.leftVolume ?? 0).toLocaleString()}`} />
          <StatsCard icon={GitBranch} label="Right Volume" value={`$${(stats?.rightVolume ?? 0).toLocaleString()}`} iconClassName="bg-amber-500/10" />
        </div>
      )}

      {/* Tree Tabs */}
      <Tabs defaultValue="unilevel" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="unilevel" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <TreePine className="h-4 w-4 mr-2" />
            Unilevel
          </TabsTrigger>
          <TabsTrigger value="binary" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <GitBranch className="h-4 w-4 mr-2" />
            Binary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unilevel">
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-white">Unilevel Tree</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSkeleton variant="detail" />
              ) : !networkData?.unilevelTree ? (
                <EmptyState
                  icon={TreePine}
                  title="No Network Data"
                  description="You don't have any referrals yet. Share your referral link to start building your network."
                />
              ) : (
                <>
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[800px] flex justify-center">
                      <UnilevelNodeComponent node={networkData.unilevelTree} level={0} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded border border-emerald-500/30 bg-emerald-500/10" />
                      Active
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded border border-gray-700 bg-gray-800/40" />
                      Inactive
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="binary">
          <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">Binary Tree</CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-emerald-500/30 border border-emerald-500/40" />
                    Left Leg
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-amber-500/30 border border-amber-500/40" />
                    Right Leg
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
                  title="No Binary Tree Data"
                  description="Your binary tree will appear here once you have binary team members."
                />
              ) : (
                <>
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[800px] flex justify-center">
                      <BinaryNodeComponent node={networkData.binaryTree} side="root" level={0} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <p className="text-sm text-gray-400">Left Volume</p>
                      <p className="text-xl font-bold text-emerald-400">${(stats?.leftVolume ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                      <p className="text-sm text-gray-400">Right Volume</p>
                      <p className="text-xl font-bold text-amber-400">${(stats?.rightVolume ?? 0).toLocaleString()}</p>
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
