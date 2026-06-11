'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  accentWord?: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, accentWord, description, actions, className }: PageHeaderProps) {
  // If accentWord is provided, highlight that word in the title with the Polygon gradient
  const renderTitle = () => {
    if (!accentWord) {
      return <span className="text-white">{title}</span>
    }

    const parts = title.split(accentWord)
    if (parts.length === 1) {
      // accentWord not found in title, just render normally
      return <span className="text-white">{title}</span>
    }

    return (
      <>
        {parts[0] && <span className="text-white">{parts[0]}</span>}
        <span className="text-gradient-poly glow-poly-text">{accentWord}</span>
        {parts[1] && <span className="text-white">{parts[1]}</span>}
      </>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {renderTitle()}
        </h1>
        {description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-sm sm:text-base text-gray-400 max-w-lg"
          >
            {description}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center gap-2 sm:gap-3 shrink-0"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  )
}
