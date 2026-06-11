'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
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
  const { currentWallet, isConnected, polBalance, usdtBalance, connectWallet, disconnectWallet } = useAppStore()
  const { t } = useTranslation()
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
    toast.success(t('wallet_connected'))
  }

  const handleConnectCustom = async () => {
    if (customAddress.startsWith('0x') && customAddress.length === 42) {
      setConnecting(true)
      connectWallet(customAddress)
      await registerUser(customAddress)
      setConnecting(false)
      setCustomAddress('')
      setDialogOpen(false)
      toast.success(t('wallet_connected'))
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
    toast.info(t('disconnect'))
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
            <div className="h-2 w-2 rounded-full bg-[#8247E5] animate-pulse shadow-[0_0_8px_rgba(130,71,229,0.5)]" />
            <span className="text-sm text-gray-300 font-mono">
              {truncateAddress(currentWallet)}
            </span>
            <button onClick={handleCopyAddress} className="text-gray-400 hover:text-[#8247E5] transition-colors">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="border-l border-[#8247E5]/20 pl-2 ml-1">
            <span className="text-xs text-gray-400">{polBalance.toFixed(3)} POL</span>
          </div>
          <div className="border-l border-[#8247E5]/20 pl-2 ml-1">
            <span className="text-xs text-[#8247E5] font-medium">{usdtBalance.toFixed(2)} USDT</span>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-1 glass-card rounded-xl px-2 py-1.5">
          <div className="h-2 w-2 rounded-full bg-[#8247E5] animate-pulse shadow-[0_0_8px_rgba(130,71,229,0.5)]" />
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
        <Button className="btn-poly gap-2 rounded-xl">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">{t('connect_wallet')}</span>
          <span className="sm:hidden">{t('connect')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-[#8247E5]/15 text-white sm:max-w-md backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-gradient-poly">{t('connect_wallet')}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('connect_wallet_desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Button
            onClick={handleConnectRandom}
            disabled={connecting}
            className="w-full btn-poly h-12 rounded-xl gap-2 justify-start px-4"
          >
            {connecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wallet className="h-5 w-5" />
            )}
            <div className="text-left">
              <div className="font-semibold">{t('simulated_wallet')}</div>
              <div className="text-xs opacity-70">{t('simulated_wallet_desc')}</div>
            </div>
          </Button>

          <Button
            onClick={handleConnectAdmin}
            disabled={connecting}
            variant="outline"
            className="w-full border-[#8247E5]/30 hover:bg-[#8247E5]/10 text-[#8247E5] h-12 rounded-xl gap-2 justify-start px-4"
          >
            <div className="h-5 w-5 rounded-full bg-[#8247E5]/20 flex items-center justify-center text-xs font-bold text-[#8247E5]">A</div>
            <div className="text-left">
              <div className="font-semibold">{t('admin_wallet')}</div>
              <div className="text-xs text-[#8247E5]/60">{t('admin_wallet_desc')}</div>
            </div>
          </Button>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center">{t('custom_address')}</p>
            <div className="flex gap-2">
              <Input
                placeholder="0x..."
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="bg-gray-800/60 border-[#8247E5]/20 text-white font-mono text-sm focus:ring-[#8247E5]/50 focus:border-[#8247E5]/50"
              />
              <Button
                onClick={handleConnectCustom}
                disabled={!customAddress.startsWith('0x') || customAddress.length !== 42 || connecting}
                variant="secondary"
                className="bg-[#8247E5]/10 hover:bg-[#8247E5]/20 text-[#8247E5] border border-[#8247E5]/20 shrink-0"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Badge variant="outline" className="border-[#8247E5]/20 text-[#8247E5]/70 gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[#8247E5]" />
              {t('bnb_chain')}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
