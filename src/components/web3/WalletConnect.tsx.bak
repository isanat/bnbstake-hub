'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Wallet, LogOut, Copy, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function generateRandomAddress(): string {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

export function WalletConnect() {
  const { currentWallet, isConnected, bnbBalance, usdtBalance, connectWallet, disconnectWallet } = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [customAddress, setCustomAddress] = useState('')
  const [copied, setCopied] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const registerUser = async (address: string) => {
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // If user already exists, that's fine
        if (!data.message?.includes('already exists')) {
          console.warn('User registration warning:', data.error)
        }
      }
    } catch (err) {
      console.warn('User registration failed (non-critical):', err)
    }
  }

  const handleConnectRandom = async () => {
    setConnecting(true)
    const address = generateRandomAddress()
    connectWallet(address)
    await registerUser(address)
    setConnecting(false)
    setDialogOpen(false)
    toast.success('Wallet connected!')
  }

  const handleConnectCustom = async () => {
    if (customAddress.startsWith('0x') && customAddress.length === 42) {
      setConnecting(true)
      connectWallet(customAddress)
      await registerUser(customAddress)
      setConnecting(false)
      setCustomAddress('')
      setDialogOpen(false)
      toast.success('Wallet connected!')
    }
  }

  const handleConnectAdmin = async () => {
    setConnecting(true)
    connectWallet('0xAdmin0000000000000000000000000000000001')
    await registerUser('0xAdmin0000000000000000000000000000000001')
    setConnecting(false)
    setDialogOpen(false)
    toast.success('Admin wallet connected!')
  }

  const handleDisconnect = () => {
    disconnectWallet()
    toast.info('Wallet disconnected')
  }

  const handleCopyAddress = async () => {
    if (currentWallet) {
      await navigator.clipboard.writeText(currentWallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isConnected && currentWallet) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        <div className="hidden sm:flex items-center gap-2 glass-card rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#F0B90B] animate-pulse shadow-[0_0_8px_rgba(240,185,11,0.5)]" />
            <span className="text-sm text-gray-300 font-mono">
              {truncateAddress(currentWallet)}
            </span>
            <button onClick={handleCopyAddress} className="text-gray-400 hover:text-[#F0B90B] transition-colors">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="border-l border-[#F0B90B]/20 pl-2 ml-1">
            <span className="text-xs text-gray-400">{bnbBalance.toFixed(3)} BNB</span>
          </div>
          <div className="border-l border-[#F0B90B]/20 pl-2 ml-1">
            <span className="text-xs text-[#F0B90B] font-medium">{usdtBalance.toFixed(2)} USDT</span>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-1 glass-card rounded-xl px-2 py-1.5">
          <div className="h-2 w-2 rounded-full bg-[#F0B90B] animate-pulse shadow-[0_0_8px_rgba(240,185,11,0.5)]" />
          <span className="text-xs text-gray-300 font-mono">
            {truncateAddress(currentWallet)}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDisconnect}
          className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-9 w-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </motion.div>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="btn-bnb gap-2 rounded-xl">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-[#F0B90B]/15 text-white sm:max-w-md backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-gradient-bnb">Connect Wallet</DialogTitle>
          <DialogDescription className="text-gray-400">
            Connect your BNB Smart Chain wallet to start staking
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Button
            onClick={handleConnectRandom}
            disabled={connecting}
            className="w-full btn-bnb h-12 rounded-xl gap-2 justify-start px-4"
          >
            {connecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wallet className="h-5 w-5" />
            )}
            <div className="text-left">
              <div className="font-semibold">Simulated Wallet</div>
              <div className="text-xs opacity-70">Generate a random test address</div>
            </div>
          </Button>

          <Button
            onClick={handleConnectAdmin}
            disabled={connecting}
            variant="outline"
            className="w-full border-[#F0B90B]/30 hover:bg-[#F0B90B]/10 text-[#F0B90B] h-12 rounded-xl gap-2 justify-start px-4"
          >
            <div className="h-5 w-5 rounded-full bg-[#F0B90B]/20 flex items-center justify-center text-xs font-bold text-[#F0B90B]">A</div>
            <div className="text-left">
              <div className="font-semibold">Admin Wallet</div>
              <div className="text-xs text-[#F0B90B]/60">Connect as admin (0xAdmin...0001)</div>
            </div>
          </Button>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center">Or enter a custom address</p>
            <div className="flex gap-2">
              <Input
                placeholder="0x..."
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="bg-gray-800/60 border-[#F0B90B]/20 text-white font-mono text-sm focus:ring-[#F0B90B]/50 focus:border-[#F0B90B]/50"
              />
              <Button
                onClick={handleConnectCustom}
                disabled={!customAddress.startsWith('0x') || customAddress.length !== 42 || connecting}
                variant="secondary"
                className="bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/20 shrink-0"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Badge variant="outline" className="border-[#F0B90B]/20 text-[#F0B90B]/70 gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[#F0B90B]" />
              BNB Smart Chain
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
