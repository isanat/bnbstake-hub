'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface LoadingSkeletonProps {
  variant?: 'cards' | 'table' | 'chart' | 'detail'
  className?: string
  count?: number
}

/* Custom skeleton with purple tint pulse */
function PolySkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className={cn(
        'rounded-lg bg-gradient-to-r from-poly/5 via-poly/10 to-poly/5',
        'animate-shimmer',
        className
      )}
    />
  )
}

export function LoadingSkeleton({ variant = 'cards', className, count = 4 }: LoadingSkeletonProps) {
  if (variant === 'cards') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5', className)}
      >
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="glass-card rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <PolySkeleton className="h-4 w-24" />
              <PolySkeleton className="h-10 w-10 rounded-xl" />
            </div>
            <PolySkeleton className="h-8 w-32" />
            <PolySkeleton className="h-3 w-16" />
            {/* Subtle bottom accent line placeholder */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-poly/5 to-transparent" />
          </motion.div>
        ))}
      </motion.div>
    )
  }

  if (variant === 'table') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('space-y-3', className)}
      >
        <div className="glass-card rounded-xl p-4">
          <PolySkeleton className="h-10 w-full" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="glass-card rounded-xl p-4"
          >
            <PolySkeleton className="h-14 w-full" />
          </motion.div>
        ))}
      </motion.div>
    )
  }

  if (variant === 'chart') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('glass-card rounded-2xl p-5', className)}
      >
        <PolySkeleton className="h-5 w-32 mb-4" />
        <PolySkeleton className="h-64 w-full" />
        {/* Chart bottom axis placeholder */}
        <div className="flex justify-between mt-3 gap-2">
          <PolySkeleton className="h-3 w-8" />
          <PolySkeleton className="h-3 w-8" />
          <PolySkeleton className="h-3 w-8" />
          <PolySkeleton className="h-3 w-8" />
          <PolySkeleton className="h-3 w-8" />
        </div>
      </motion.div>
    )
  }

  // Detail variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-5', className)}
    >
      <PolySkeleton className="h-8 w-48" />
      <PolySkeleton className="h-4 w-64" />
      <div className="glass-card rounded-2xl p-5">
        <PolySkeleton className="h-32 w-full" />
      </div>
    </motion.div>
  )
}
