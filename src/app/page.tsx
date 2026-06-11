'use client'

import { useAppStore, PageType } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { WalletConnect } from '@/components/web3/WalletConnect'
import { LanguageSwitcher } from '@/components/web3/LanguageSwitcher'
import { DashboardPage } from '@/components/web3/DashboardPage'
import { StakingPage } from '@/components/web3/StakingPage'
import { NetworkPage } from '@/components/web3/NetworkPage'
import { CommissionsPage } from '@/components/web3/CommissionsPage'
import { AchievementsPage } from '@/components/web3/AchievementsPage'
import { AdminPage } from '@/components/web3/AdminPage'
import { Leaderboard } from '@/components/web3/Leaderboard'
import { LiveFeed } from '@/components/web3/LiveFeed'
import { LiveToast } from '@/components/web3/LiveToast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard, Coins, Users, Gift, Shield, Menu,
  Zap, ExternalLink, ChevronDown, ArrowRight, Globe,
  Lock, TrendingUp, Award, Layers, ShieldCheck, Rocket, Star
} from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

const navItemConfigs: { page: PageType; labelKey: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { page: 'dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
  { page: 'staking', labelKey: 'nav_staking', icon: Coins },
  { page: 'network', labelKey: 'nav_network', icon: Users },
  { page: 'commissions', labelKey: 'nav_commissions', icon: Gift },
  { page: 'achievements', labelKey: 'nav_achievements', icon: Award },
  { page: 'admin', labelKey: 'nav_admin', icon: Shield, adminOnly: true },
]

const mobileNavItemConfigs: { page: PageType; labelKey: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { page: 'dashboard', labelKey: 'nav_home', icon: LayoutDashboard },
  { page: 'staking', labelKey: 'nav_stake', icon: Coins },
  { page: 'commissions', labelKey: 'nav_rewards', icon: Gift },
  { page: 'achievements', labelKey: 'nav_trophies', icon: Award },
  { page: 'admin', labelKey: 'nav_admin', icon: Shield, adminOnly: true },
]

// ===== Helper to format large numbers =====
function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M+`
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K+`
  return num.toLocaleString()
}

// ===== LANDING PAGE =====
function LandingPage() {
  const { isConnected, setPage } = useAppStore()
  const { t } = useTranslation()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  // Fetch real platform stats
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => fetch('/api/stats').then(r => r.json()),
    staleTime: 60000, // Cache for 1 minute
  })

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#8247E5] to-[#6B33D4] flex items-center justify-center shadow-lg shadow-[#8247E5]/20">
              <Zap className="h-5 w-5 text-[#0a0a0f]" />
            </div>
            <span className="font-bold text-xl text-gradient-poly">PolyStake</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-[#8247E5] transition-colors">{t('landing_nav_features')}</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-[#8247E5] transition-colors">{t('landing_nav_how')}</a>
            <a href="#stats" className="text-sm text-gray-400 hover:text-[#8247E5] transition-colors">{t('landing_nav_stats')}</a>
            <a href="#security" className="text-sm text-gray-400 hover:text-[#8247E5] transition-colors">{t('landing_nav_security')}</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LiveFeed variant="ticker" />
            </div>
            <LanguageSwitcher />
            <Badge variant="outline" className="border-[#8247E5]/30 text-[#8247E5] gap-1.5 text-xs hidden sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-[#8247E5] animate-pulse" />
              {t('bnb_chain')}
            </Badge>
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4 hero-pattern"
      >
        {/* Animated grid background */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-[#8247E5]/30 animate-particle" />
        <div className="absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-[#8247E5]/20 animate-particle" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 h-1 w-1 rounded-full bg-[#8247E5]/25 animate-particle" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/4 h-2.5 w-2.5 rounded-full bg-[#8247E5]/15 animate-particle" style={{ animationDelay: '0.5s' }} />

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <div className="h-2 w-2 rounded-full bg-[#8247E5] animate-pulse" />
            <span className="text-xs font-medium text-[#8247E5]">{t('live_on_bnb')}</span>
            <ChevronDown className="h-3 w-3 text-[#8247E5] rotate-180" />
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight mb-6"
          >
            <span className="text-white">{t('hero_title_1')}</span>
            <br />
            <span className="text-gradient-poly glow-poly-text">{t('hero_title_2')}</span>
            <br />
            <span className="text-white">{t('hero_title_3')}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('hero_subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            {isConnected ? (
              <Button
                onClick={() => setPage('dashboard')}
                className="btn-poly h-14 px-8 rounded-2xl text-base gap-2"
              >
                <Rocket className="h-5 w-5" />
                {t('go_to_dashboard')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setPage('dashboard')}
                  className="btn-poly h-14 px-8 rounded-2xl text-base gap-2"
                >
                  <Zap className="h-5 w-5" />
                  {t('hero_cta')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-14 px-8 rounded-2xl text-base border-[#8247E5]/20 text-[#8247E5] hover:bg-[#8247E5]/10 hover:border-[#8247E5]/30 gap-2"
                >
                  <Globe className="h-5 w-5" />
                  {t('view_bscscan')}
                </Button>
              </>
            )}
          </motion.div>

          {/* Live Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: t('stat_tvl'), value: stats ? formatLargeNumber(stats.totalTVL) : '...', icon: Lock },
              { label: t('stat_stakers'), value: stats ? formatLargeNumber(stats.totalStakers) : '...', icon: Users },
              { label: t('stat_rewards'), value: stats ? formatLargeNumber(stats.totalRewardsDistributed) : '...', icon: TrendingUp },
              { label: t('stat_network'), value: stats ? formatLargeNumber(stats.totalNetworkSize) : '...', icon: Globe },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <stat.icon className="h-5 w-5 text-[#8247E5] mx-auto mb-2" />
                <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 px-4 relative section-transition">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="border-[#8247E5]/30 text-[#8247E5] gap-1.5 text-xs mb-4">
              <Star className="h-3 w-3" />
              {t('features_title').split(' ')[0].toUpperCase()}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {t('features_title')}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t('features_subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: TrendingUp,
                title: t('feature_staking_title'),
                desc: t('feature_staking_desc'),
                color: '#8247E5'
              },
              {
                icon: Users,
                title: t('feature_unilevel_title'),
                desc: t('feature_unilevel_desc'),
                color: '#10b981'
              },
              {
                icon: Layers,
                title: t('feature_binary_title'),
                desc: t('feature_binary_desc'),
                color: '#8b5cf6'
              },
              {
                icon: ShieldCheck,
                title: t('feature_audit_title'),
                desc: t('feature_audit_desc'),
                color: '#06b6d4'
              },
              {
                icon: Zap,
                title: t('feature_instant_title'),
                desc: t('feature_instant_desc'),
                color: '#f43f5e'
              },
              {
                icon: Globe,
                title: t('feature_community_title'),
                desc: t('feature_community_desc'),
                color: '#8247E5'
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-card rounded-2xl p-6 group cursor-default transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#8247E5] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 relative section-transition poly-gradient-bg">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="border-[#8247E5]/30 text-[#8247E5] gap-1.5 text-xs mb-4">
              <Rocket className="h-3 w-3" />
              {t('how_title').split(' ')[0].toUpperCase()}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {t('how_title')}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t('how_subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: t('step1_title'),
                desc: t('step1_desc'),
                icon: Lock,
              },
              {
                step: '02',
                title: t('step2_title'),
                desc: t('step2_desc'),
                icon: Coins,
              },
              {
                step: '03',
                title: t('step3_title'),
                desc: t('step3_desc'),
                icon: Award,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="relative text-center"
              >
                <div className="relative inline-flex mb-6">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#8247E5]/20 to-[#8247E5]/5 border border-[#8247E5]/20 flex items-center justify-center animate-pulse-glow">
                    <item.icon className="h-8 w-8 text-[#8247E5]" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-[#8247E5] text-[#0a0a0f] text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 -right-4 w-8">
                    <ArrowRight className="h-5 w-5 text-[#8247E5]/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 sm:py-28 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-3xl p-8 sm:p-12 glow-poly"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {t('stats_title')}
              </h2>
              <p className="text-gray-400">{t('stats_subtitle')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: t('stat_tvl'), value: stats ? `$${stats.totalTVL.toLocaleString()}` : '...', change: stats?.trends?.staked ? `${stats.trends.staked > 0 ? '+' : ''}${stats.trends.staked.toFixed(1)}%` : '' },
                { label: t('stat_stakers'), value: stats ? stats.totalStakers.toLocaleString() : '...', change: stats?.trends?.users ? `${stats.trends.users > 0 ? '+' : ''}${stats.trends.users.toFixed(1)}%` : '' },
                { label: t('stat_rewards'), value: stats ? `$${stats.totalRewardsDistributed.toLocaleString()}` : '...', change: stats?.trends?.rewards ? `${stats.trends.rewards > 0 ? '+' : ''}${stats.trends.rewards.toFixed(1)}%` : '' },
                { label: t('stat_avg_daily_yield'), value: stats ? `${(stats.averageAPY / 365).toFixed(2)}%` : '...', change: stats?.averageAPY ? `${stats.averageAPY}% APY` : '' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-poly mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 mb-1">{stat.label}</p>
                  <span className="text-xs text-emerald-400 font-medium">{stat.change}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="py-20 sm:py-28 px-4 relative section-transition poly-gradient-bg">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="border-[#8247E5]/30 text-[#8247E5] gap-1.5 text-xs mb-4">
              <Award className="h-3 w-3" />
              {t('leaderboard_title')}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {t('leaderboard_title')}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t('leaderboard_description')}
            </p>
          </motion.div>
          <Leaderboard />
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 sm:py-28 px-4 relative section-transition">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 gap-1.5 text-xs mb-4">
              <ShieldCheck className="h-3 w-3" />
              {t('security_title').split(' ')[0].toUpperCase()}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {t('security_title')}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t('security_subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: t('security_audit_title'),
                desc: t('security_audit_desc'),
              },
              {
                icon: Lock,
                title: t('security_noncustodial_title'),
                desc: t('security_noncustodial_desc'),
              },
              {
                icon: ShieldCheck,
                title: t('security_multisig_title'),
                desc: t('security_multisig_desc'),
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              {t('cta_title')}
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
              {t('cta_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => setPage('dashboard')}
                className="btn-poly h-14 px-10 rounded-2xl text-base gap-2"
              >
                <Zap className="h-5 w-5" />
                {t('cta_button')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#8247E5] to-[#6B33D4] flex items-center justify-center">
              <Zap className="h-3 w-3 text-[#0a0a0f]" />
            </div>
            <span className="text-sm text-gray-500">PolyStake &copy; 2024</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <span>{t('bnb_chain')}</span>
            <span className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t('network_active')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ===== APP SIDEBAR =====
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { currentPage, setPage, isAdmin } = useAppStore()
  const { t } = useTranslation()

  return (
    <nav className="space-y-1 px-3">
      {navItemConfigs
        .filter(item => !item.adminOnly || isAdmin)
        .map(item => {
          const isActive = currentPage === item.page
          return (
            <Button
              key={item.page}
              variant="ghost"
              onClick={() => {
                setPage(item.page)
                onNavigate?.()
              }}
              className={`w-full justify-start gap-3 rounded-xl h-11 transition-all ${
                isActive
                  ? 'bg-[#8247E5]/10 text-[#8247E5] hover:bg-[#8247E5]/15 hover:text-[#8247E5]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-[#8247E5]' : ''}`} />
              <span className="font-medium">{t(item.labelKey)}</span>
            </Button>
          )
        })}
    </nav>
  )
}

// ===== MOBILE BOTTOM NAV =====
function MobileBottomNav() {
  const { currentPage, setPage, isAdmin } = useAppStore()
  const { t } = useTranslation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong pb-safe border-t border-[#8247E5]/10">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {mobileNavItemConfigs
          .filter(item => !item.adminOnly || isAdmin)
          .map(item => {
            const isActive = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 transition-colors"
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-[#8247E5]' : 'text-gray-500'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#8247E5]' : 'text-gray-500'}`}>
                  {t(item.labelKey)}
                </span>
              </button>
            )
          })}
      </div>
    </nav>
  )
}

// ===== PAGE CONTENT =====
function PageContent() {
  const { currentPage } = useAppStore()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'staking' && <StakingPage />}
        {currentPage === 'network' && <NetworkPage />}
        {currentPage === 'commissions' && <CommissionsPage />}
        {currentPage === 'achievements' && <AchievementsPage />}
        {currentPage === 'admin' && <AdminPage />}
      </motion.div>
    </AnimatePresence>
  )
}

// ===== APP DASHBOARD LAYOUT =====
function AppLayout() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#8247E5]/8 glass-strong">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-gray-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#0a0a0f] border-[#8247E5]/10 p-0 w-64">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 px-6 h-14 border-b border-[#8247E5]/10">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#8247E5] to-[#6B33D4] flex items-center justify-center">
                      <Zap className="h-4 w-4 text-[#0a0a0f]" />
                    </div>
                    <span className="font-bold text-lg text-gradient-poly">PolyStake</span>
                  </div>
                  <div className="flex-1 py-4">
                    <SidebarNav onNavigate={() => setSidebarOpen(false)} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#8247E5] to-[#6B33D4] flex items-center justify-center">
                <Zap className="h-4 w-4 text-[#0a0a0f]" />
              </div>
              <span className="font-bold text-lg text-gradient-poly hidden sm:inline">PolyStake</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Badge variant="outline" className="border-[#8247E5]/20 text-[#8247E5] gap-1.5 text-xs hidden sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-[#8247E5] animate-pulse" />
              {t('bnb_chain')}
            </Badge>
            <WalletConnect />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-[#8247E5]/8 bg-[#0a0a0f]/50 shrink-0">
          <div className="flex-1 py-4">
            <SidebarNav />
          </div>
          <div className="p-4 border-t border-[#8247E5]/8 space-y-4">
            <LiveFeed variant="feed" />
            <div className="p-3 rounded-xl glass-card space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ExternalLink className="h-4 w-4" />
                <span>{t('bnb_chain')}</span>
              </div>
              <p className="text-xs text-gray-600">{t('bnb_chain')}</p>
              <p className="text-xs text-emerald-500 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />{t('network_active')}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <PageContent />
          </div>
        </main>
      </div>

      {/* Desktop Footer */}
      <footer className="hidden lg:block border-t border-[#8247E5]/8 bg-[#0a0a0f] mt-auto">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-[#8247E5]" />
              <span>PolyStake &copy; 2024</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{t('bnb_chain')}</span>
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('network_active')}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  )
}

// ===== MAIN PAGE =====
export default function HomePage() {
  const isConnected = useAppStore(s => s.isConnected)

  // Show landing page when not connected, app when connected
  // Use useMemo instead of useState+useEffect to avoid the lint warning
  const showApp = useMemo(() => isConnected, [isConnected])

  return (
    <>
      <LiveToast />
      {showApp ? <AppLayout /> : <LandingPage />}
    </>
  )
}
