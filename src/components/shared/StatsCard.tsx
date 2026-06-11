'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: {
    value: number
    positive: boolean
  }
  className?: string
  iconClassName?: string
  variant?: 'default' | 'gold' | 'purple'
}

const variantStyles = {
  default: {
    value: 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent',
    icon: 'text-emerald-500',
    hoverBorder: 'hover:border-emerald-500/30',
    trendPositive: 'text-emerald-400',
  },
  gold: {
    value: 'bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] bg-clip-text text-transparent',
    icon: 'text-[#F0B90B]',
    hoverBorder: 'hover:border-[#F0B90B]/30',
    trendPositive: 'text-[#F0B90B]',
  },
  purple: {
    value: 'bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent',
    icon: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/30',
    trendPositive: 'text-purple-400',
  },
}

export function StatsCard({ icon: Icon, label, value, trend, className, iconClassName, variant = 'default' }: StatsCardProps) {
  const styles = variantStyles[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'glass-card hover:border-[#F0B90B]/25 transition-colors',
        styles.hoverBorder,
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">{label}</p>
              <p className={cn('text-2xl font-bold', styles.value)}>
                {value}
              </p>
              {trend && (
                <p className={cn(
                  'text-xs font-medium',
                  trend.positive ? styles.trendPositive : 'text-red-400'
                )}>
                  {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
            <div className={cn(
              'p-3 rounded-xl',
              variant === 'gold' ? 'bg-[#F0B90B]/10' : variant === 'purple' ? 'bg-purple-500/10' : 'bg-emerald-500/10',
              iconClassName
            )}>
              <Icon className={cn('h-5 w-5', styles.icon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
