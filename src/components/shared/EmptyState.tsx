'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 sm:px-6 text-center',
        className
      )}
    >
      <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-md w-full space-y-5">
        {/* Icon with golden glow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mx-auto relative"
        >
          <div className="absolute inset-0 rounded-2xl bg-bnb/15 blur-xl animate-pulse-glow" />
          <div className="relative p-4 sm:p-5 rounded-2xl bg-bnb/8 border border-bnb/15 inline-flex">
            <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-bnb" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-lg sm:text-xl font-semibold text-white"
        >
          {title}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-sm sm:text-base text-gray-400 leading-relaxed"
        >
          {description}
        </motion.p>

        {/* Action */}
        {action && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="pt-2"
          >
            {action}
          </motion.div>
        )}

        {/* Decorative bottom line */}
        <div className="pt-2">
          <div className="h-px w-1/2 mx-auto bg-gradient-to-r from-transparent via-bnb/20 to-transparent" />
        </div>
      </div>
    </motion.div>
  )
}
