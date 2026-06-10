'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery } from '@tanstack/react-query'
import {
  Calculator, TrendingUp, Rocket, ArrowRight, Clock,
  DollarSign, Sparkles, Shield, Zap, ChevronRight,
  Info
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

// Hardcoded plans as fallback
const DEFAULT_PLANS = [
  { id: 'flex', name: 'Flex Staking', apy: 12, durationDays: 30, minAmount: 100, maxAmount: 50000 },
  { id: 'pro', name: 'Pro Staking', apy: 18, durationDays: 90, minAmount: 500, maxAmount: 100000 },
  { id: 'elite', name: 'Elite Staking', apy: 25, durationDays: 180, minAmount: 1000, maxAmount: 200000 },
]

const DURATION_OPTIONS = [
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '180 Days' },
  { value: 365, label: '365 Days' },
]

const SCENARIOS = [
  { key: 'conservative', label: 'Conservative', multiplier: 0.5, color: '#06b6d4', icon: Shield, desc: '50% of APY' },
  { key: 'moderate', label: 'Moderate', multiplier: 1.0, color: '#F0B90B', icon: TrendingUp, desc: '100% of APY' },
  { key: 'optimistic', label: 'Optimistic', multiplier: 1.2, color: '#10b981', icon: Rocket, desc: '120% of APY' },
]

// Animated number counter hook using requestAnimationFrame
function useAnimatedNumber(target: number, _duration: number = 800) {
  const [current, setCurrent] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = current
    startRef.current = null
    const duration = _duration
    const from = fromRef.current
    const to = target

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(from + (to - from) * eased)
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    const rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, _duration])

  return current
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl px-4 py-3 shadow-2xl glow-bnb">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => {
        const scenario = SCENARIOS.find(s => s.key === entry.dataKey)
        return (
          <p key={i} className="text-sm font-bold" style={{ color: scenario?.color || '#F0B90B' }}>
            ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )
      })}
    </div>
  )
}

// Animated stat item component (hooks must be at component top level)
function AnimatedStatItem({ label, value, icon, isPercentage }: {
  label: string
  value: number
  icon: string
  isPercentage: boolean
}) {
  const animatedVal = useAnimatedNumber(value, 600)
  return (
    <div className="text-center p-3 rounded-xl glass border border-[#F0B90B]/8">
      <span className="text-sm">{icon}</span>
      <p className="text-lg sm:text-xl font-bold text-[#F8D12F] mt-1">
        {isPercentage
          ? `${animatedVal.toFixed(1)}%`
          : `$${animatedVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        }
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// Scenario card component
function ScenarioCard({ scenario, returnAmount, apy }: {
  scenario: typeof SCENARIOS[0]
  returnAmount: number
  apy: number
}) {
  const animatedReturn = useAnimatedNumber(returnAmount)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-2xl glass-card p-4 sm:p-5 text-center group"
      style={{
        borderColor: `${scenario.color}20`,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${scenario.color}08, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div
          className="h-10 w-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${scenario.color}15` }}
        >
          <scenario.icon className="h-5 w-5" style={{ color: scenario.color }} />
        </div>
        <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">{scenario.label}</p>
        <motion.p
          className="text-2xl sm:text-3xl font-black mb-1"
          style={{ color: scenario.color }}
        >
          ${animatedReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </motion.p>
        <p className="text-xs text-gray-500">
          ({apy.toFixed(1)}% APY)
        </p>
      </div>
    </motion.div>
  )
}

export function ReturnCalculator() {
  const setPage = useAppStore(s => s.setPage)
  const { t } = useTranslation()
  const [investmentAmount, setInvestmentAmount] = useState(5000)
  const [selectedPlanId, setSelectedPlanId] = useState('pro')
  const [selectedDuration, setSelectedDuration] = useState(90)

  // Fetch staking plans (public endpoint, no wallet needed)
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetch('/api/plans').then(r => r.ok ? r.json() : { plans: [] }),
  })

  const plans = useMemo(() => {
    if (plansData?.plans?.length) {
      return plansData.plans
        .filter((p: { isActive: boolean }) => p.isActive)
        .map((p: { id: string; name: string; apy: number; durationDays: number; minAmount: number; maxAmount: number }) => ({
          id: p.id,
          name: p.name,
          apy: p.apy,
          durationDays: p.durationDays,
          minAmount: p.minAmount,
          maxAmount: p.maxAmount,
        }))
    }
    return DEFAULT_PLANS
  }, [plansData])

  const selectedPlan = useMemo(
    () => plans.find((p: { id: string }) => p.id === selectedPlanId) || plans[1] || DEFAULT_PLANS[1],
    [plans, selectedPlanId]
  )

  // Calculate returns for each scenario
  const calculations = useMemo(() => {
    const baseApy = selectedPlan?.apy || 18
    const principal = investmentAmount
    const days = selectedDuration

    const scenarios = SCENARIOS.map(s => {
      const effectiveApy = baseApy * s.multiplier
      const totalReturn = principal * (effectiveApy / 100) * (days / 365)
      const dailyReturn = totalReturn / days
      const monthlyReturn = totalReturn / (days / 30)
      return {
        ...s,
        effectiveApy,
        totalReturn: Math.round(totalReturn * 100) / 100,
        dailyReturn: Math.round(dailyReturn * 100) / 100,
        monthlyReturn: Math.round(monthlyReturn * 100) / 100,
      }
    })

    return scenarios
  }, [investmentAmount, selectedPlan, selectedDuration])

  // Generate chart data
  const chartData = useMemo(() => {
    const data = []
    const steps = Math.min(selectedDuration, 12)
    const stepSize = selectedDuration / steps

    for (let i = 0; i <= steps; i++) {
      const day = Math.round(stepSize * i)
      const baseApy = selectedPlan?.apy || 18
      const point: Record<string, number | string> = {
        day: day === 0 ? 'Start' : `Day ${day}`,
      }

      calculations.forEach(s => {
        const effectiveApy = baseApy * s.multiplier
        const value = investmentAmount + investmentAmount * (effectiveApy / 100) * (day / 365)
        point[s.key] = Math.round(value)
      })

      data.push(point)
    }

    return data
  }, [calculations, investmentAmount, selectedPlan, selectedDuration])

  const handleSliderChange = useCallback((value: number[]) => {
    setInvestmentAmount(value[0])
  }, [])

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`
    return `$${val.toLocaleString()}`
  }

  // Slider marks
  const sliderMarks = [100, 10000, 50000, 100000, 200000]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="glass-card glow-bnb overflow-hidden transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#F0B90B]/10">
                <Calculator className="h-5 w-5 text-[#F0B90B]" />
              </div>
              {t('calculator_title')}
            </CardTitle>
            <Badge className="bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20 hover:bg-[#F0B90B]/20 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('interactive')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Investment Amount Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-[#F0B90B]" />
                {t('investment_amount')}
              </label>
              <motion.span
                key={investmentAmount}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bold text-gradient-bnb"
              >
                ${investmentAmount.toLocaleString()}
              </motion.span>
            </div>

            <div className="px-1">
              <Slider
                value={[investmentAmount]}
                min={100}
                max={200000}
                step={100}
                onValueChange={handleSliderChange}
                className="w-full [&_[data-slot=slider-track]]:bg-[#F0B90B]/10 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#C99A00] [&_[data-slot=slider-range]]:via-[#F0B90B] [&_[data-slot=slider-range]]:to-[#F8D12F] [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:border-[#F0B90B] [&_[data-slot=slider-thumb]]:bg-[#0a0a0f] [&_[data-slot=slider-thumb]]:shadow-[0_0_10px_rgba(240,185,11,0.3)]"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                {sliderMarks.map(mark => (
                  <span key={mark} className="cursor-pointer hover:text-[#F0B90B] transition-colors"
                    onClick={() => setInvestmentAmount(mark)}
                  >
                    {formatCurrency(mark)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Staking Plan & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plan Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[#F0B90B]" />
                {t('staking_title')}
              </label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-full bg-[#0a0a0f]/60 border-[#F0B90B]/15 text-white focus:ring-[#F0B90B]/30 focus:border-[#F0B90B]/30 rounded-xl h-11">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f1a] border-[#F0B90B]/15">
                  {plans.map((plan: { id: string; name: string; apy: number; durationDays: number }) => (
                    <SelectItem key={plan.id} value={plan.id} className="text-white focus:bg-[#F0B90B]/10 focus:text-[#F8D12F]">
                      <div className="flex items-center gap-2">
                        <span>{plan.name}</span>
                        <span className="text-[#F0B90B] text-xs font-medium">{plan.apy}% APY</span>
                        <span className="text-gray-500 text-xs">({plan.durationDays}d)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#F0B90B]" />
                {t('duration')}
              </label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedDuration(opt.value)}
                    className={`
                      flex-1 h-11 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300
                      ${selectedDuration === opt.value
                        ? 'bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 shadow-[0_0_12px_rgba(240,185,11,0.15)]'
                        : 'bg-[#0a0a0f]/40 text-gray-500 border border-white/5 hover:text-gray-300 hover:border-white/10'
                      }
                    `}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Three Scenario Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {calculations.map(scenario => (
                <ScenarioCard
                  key={scenario.key}
                  scenario={scenario}
                  returnAmount={scenario.totalReturn}
                  apy={scenario.effectiveApy}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Daily & Monthly Returns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AnimatedStatItem label={t('daily_reward')} value={calculations[1].dailyReturn} icon="📅" isPercentage={false} />
            <AnimatedStatItem label={t('monthly_reward')} value={calculations[1].monthlyReturn} icon="📆" isPercentage={false} />
            <AnimatedStatItem label={t('total_return')} value={calculations[1].totalReturn} icon="💰" isPercentage={false} />
            <AnimatedStatItem label={t('roi')} value={((calculations[1].totalReturn / investmentAmount) * 100)} icon="📈" isPercentage={true} />
          </div>

          {/* Projected Growth Chart */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#F0B90B]" />
              <span className="text-sm font-medium text-gray-300">{t('projected_growth')}</span>
              <div className="flex items-center gap-3 ml-auto">
                {SCENARIOS.map(s => (
                  <div key={s.key} className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-gray-500 hidden sm:inline">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-52 sm:h-64 rounded-xl bg-[#0a0a0f]/40 border border-[#F0B90B]/5 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="calcGradConservative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="calcGradModerate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#F0B90B" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="calcGradOptimistic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="calcStrokeModerate" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#C99A00" />
                      <stop offset="50%" stopColor="#F0B90B" />
                      <stop offset="100%" stopColor="#F8D12F" />
                    </linearGradient>
                    <filter id="calcGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(240, 185, 11, 0.04)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(240, 185, 11, 0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    stroke="rgba(240, 185, 11, 0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-4}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="conservative"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    fill="url(#calcGradConservative)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#06b6d4', stroke: '#0a0a0f', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="moderate"
                    stroke="url(#calcStrokeModerate)"
                    strokeWidth={2.5}
                    fill="url(#calcGradModerate)"
                    filter="url(#calcGlow)"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: '#F0B90B',
                      stroke: '#0a0a0f',
                      strokeWidth: 3,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill="url(#calcGradOptimistic)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981', stroke: '#0a0a0f', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#F0B90B]/5 border border-[#F0B90B]/10">
            <Info className="h-4 w-4 text-[#F0B90B] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('calculator_disclaimer')}
            </p>
          </div>

          {/* CTA Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={() => setPage('staking')}
              className="btn-bnb w-full h-13 sm:h-14 rounded-2xl text-base gap-2 font-bold"
            >
              <Rocket className="h-5 w-5" />
              {t('cta_button')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
