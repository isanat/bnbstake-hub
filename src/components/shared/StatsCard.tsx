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
}

export function StatsCard({ icon: Icon, label, value, trend, className, iconClassName }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'bg-gray-900/80 border-gray-800 backdrop-blur-sm hover:border-emerald-500/30 transition-colors',
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">{label}</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                {value}
              </p>
              {trend && (
                <p className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
            <div className={cn(
              'p-3 rounded-xl bg-emerald-500/10',
              iconClassName
            )}>
              <Icon className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
