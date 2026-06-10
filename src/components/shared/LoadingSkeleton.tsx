'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  variant?: 'cards' | 'table' | 'chart' | 'detail'
  className?: string
  count?: number
}

export function LoadingSkeleton({ variant = 'cards', className, count = 4 }: LoadingSkeletonProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-gray-700" />
              <Skeleton className="h-10 w-10 rounded-xl bg-gray-700" />
            </div>
            <Skeleton className="h-8 w-32 bg-gray-700" />
            <Skeleton className="h-3 w-16 bg-gray-700" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-10 w-full bg-gray-700 rounded-lg" />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full bg-gray-800 rounded-lg" />
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return (
      <div className={cn('bg-gray-900/80 border border-gray-800 rounded-xl p-4', className)}>
        <Skeleton className="h-5 w-32 bg-gray-700 mb-4" />
        <Skeleton className="h-64 w-full bg-gray-800 rounded-lg" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton className="h-8 w-48 bg-gray-700" />
      <Skeleton className="h-4 w-64 bg-gray-700" />
      <Skeleton className="h-32 w-full bg-gray-800 rounded-lg" />
    </div>
  )
}
