'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Users,
  Coins,
} from 'lucide-react'

// ===== Types =====
interface ToastTransaction {
  id: string
  type: 'stake' | 'commission' | 'referral' | 'withdraw'
  wallet: string
  message: string
  amount?: number
  timestamp: string
}

// ===== Type Config =====
const typeConfig: Record<
  string,
  { icon: typeof ArrowUpRight; color: string; bgColor: string }
> = {
  stake: {
    icon: ArrowUpRight,
    color: 'text-[#8247E5]',
    bgColor: 'bg-[#8247E5]/10',
  },
  commission: {
    icon: Gift,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
  referral: {
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  withdraw: {
    icon: ArrowDownRight,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
}

// ===== Time Ago Helper =====
function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

// ===== LiveToast Component =====
export function LiveToast() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isActiveRef = useRef(true)

  const showRandomToast = useCallback(async () => {
    if (!isActiveRef.current) return

    try {
      const res = await fetch('/api/notifications/live')
      if (!res.ok) return

      const data = await res.json()
      const transactions: ToastTransaction[] = data.transactions
      if (!transactions || transactions.length === 0) return

      // Pick a random transaction
      const tx = transactions[Math.floor(Math.random() * transactions.length)]
      const config = typeConfig[tx.type] || typeConfig.stake
      const Icon = config.icon

      toast.custom(
        () => (
          <div className="glass-strong rounded-xl p-3 border border-[#8247E5]/20 glow-poly max-w-xs">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg ${config.bgColor} shrink-0`}
              >
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">
                  {timeAgo(tx.timestamp)}
                </p>
                <p className="text-sm text-white leading-snug truncate">
                  {tx.wallet}{' '}
                  {tx.type === 'stake' && 'deposited'}
                  {tx.type === 'commission' && 'earned commission'}
                  {tx.type === 'referral' && 'joined via referral'}
                  {tx.type === 'withdraw' && 'withdrew'}{' '}
                  {tx.amount !== undefined && tx.amount > 0 && (
                    <span className="text-[#8247E5] font-semibold">
                      ${tx.amount.toLocaleString()} USDT
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ),
        { duration: 4000 }
      )
    } catch {
      // Silently fail - don't spam errors for toast notifications
    }
  }, [])

  useEffect(() => {
    // Initial delay before first toast (5 seconds)
    const initialTimeout = setTimeout(() => {
      showRandomToast()

      // Then show a toast every 20-30 seconds (random interval)
      const scheduleNext = () => {
        const delay = 20000 + Math.random() * 10000 // 20-30s
        intervalRef.current = setTimeout(() => {
          showRandomToast()
          scheduleNext()
        }, delay)
      }
      scheduleNext()
    }, 5000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      isActiveRef.current = false
    }
  }, [showRandomToast])

  // This component doesn't render anything visible
  return null
}
