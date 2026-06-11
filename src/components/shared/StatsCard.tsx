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
  variant?: 'default' | 'poly' | 'purple'
}

const variantStyles = {
  default: {
    value: 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent',
    icon: 'text-emerald-500',
    hoverBorder: 'hover:border-emerald-500/30',
    trendPositive: 'text-emerald-400',
  },
  poly: {
    value: 'bg-gradient-to-r from-[#8247E5] to-[#9B6DFF] bg-clip-text text-transparent',
    icon: 'text-[#8247E5]',
    hoverBorder: 'hover:border-[#8247E5]/30',
    trendPositive: 'text-[#8247E5]',
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
        'glass-card hover:border-[#8247E5]/25 transition-colors',
        styles.hoverBorder,
        className
      )}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-[10px] sm:text-sm text-gray-400 truncate">{label}</p>
              <p className={cn('text-lg sm:text-2xl font-bold truncate', styles.value)}>
                {value}
              </p>
              {trend && (
                <p className={cn(
                  'text-[10px] sm:text-xs font-medium',
                  trend.positive ? styles.trendPositive : 'text-red-400'
                )}>
                  {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
            <div className={cn(
              'p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0',
              variant === 'poly' ? 'bg-[#8247E5]/10' : variant === 'purple' ? 'bg-purple-500/10' : 'bg-emerald-500/10',
              iconClassName
            )}>
              <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', styles.icon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
