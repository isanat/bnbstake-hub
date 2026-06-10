'use client'

import { useAppStore, PageType } from '@/store/useAppStore'
import { WalletConnect } from '@/components/web3/WalletConnect'
import { DashboardPage } from '@/components/web3/DashboardPage'
import { StakingPage } from '@/components/web3/StakingPage'
import { NetworkPage } from '@/components/web3/NetworkPage'
import { CommissionsPage } from '@/components/web3/CommissionsPage'
import { AdminPage } from '@/components/web3/AdminPage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard, Coins, Users, Gift, Shield, Menu,
  Zap, ExternalLink, ChevronDown, ArrowRight, Globe,
  Lock, TrendingUp, Award, Layers, ShieldCheck, Rocket, Star
} from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useRef, useMemo } from 'react'

const navItems: { page: PageType; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'staking', label: 'Staking', icon: Coins },
  { page: 'network', label: 'Network', icon: Users },
  { page: 'commissions', label: 'Commissions', icon: Gift },
  { page: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
]

const mobileNavItems: { page: PageType; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { page: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { page: 'staking', label: 'Stake', icon: Coins },
  { page: 'network', label: 'Network', icon: Users },
  { page: 'commissions', label: 'Rewards', icon: Gift },
  { page: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
]

// ===== LANDING PAGE =====
function LandingPage() {
  const { isConnected, setPage } = useAppStore()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#C99A00] flex items-center justify-center shadow-lg shadow-[#F0B90B]/20">
              <Zap className="h-5 w-5 text-[#0a0a0f]" />
            </div>
            <span className="font-bold text-xl text-gradient-bnb">StakeBNB</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-[#F0B90B] transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-[#F0B90B] transition-colors">How it Works</a>
            <a href="#stats" className="text-sm text-gray-400 hover:text-[#F0B90B] transition-colors">Stats</a>
            <a href="#security" className="text-sm text-gray-400 hover:text-[#F0B90B] transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-[#F0B90B]/30 text-[#F0B90B] gap-1.5 text-xs hidden sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-[#F0B90B] animate-pulse" />
              BNB Chain
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
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-[#F0B90B]/30 animate-particle" />
        <div className="absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-[#F0B90B]/20 animate-particle" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 h-1 w-1 rounded-full bg-[#F0B90B]/25 animate-particle" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/4 h-2.5 w-2.5 rounded-full bg-[#F0B90B]/15 animate-particle" style={{ animationDelay: '0.5s' }} />

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <div className="h-2 w-2 rounded-full bg-[#F0B90B] animate-pulse" />
            <span className="text-xs font-medium text-[#F0B90B]">Live on BNB Smart Chain</span>
            <ChevronDown className="h-3 w-3 text-[#F0B90B] rotate-180" />
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight mb-6"
          >
            <span className="text-white">Stake USDT.</span>
            <br />
            <span className="text-gradient-bnb glow-bnb-text">Earn Rewards.</span>
            <br />
            <span className="text-white">Grow Your </span>
            <span className="text-gradient-bnb">Network.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The most powerful DeFi staking and MLM platform on BNB Smart Chain.
            Earn up to <span className="text-[#F0B90B] font-semibold">25% APY</span> plus
            multi-level commissions from your growing network.
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
                className="btn-bnb h-14 px-8 rounded-2xl text-base gap-2"
              >
                <Rocket className="h-5 w-5" />
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setPage('dashboard')}
                  className="btn-bnb h-14 px-8 rounded-2xl text-base gap-2"
                >
                  <Zap className="h-5 w-5" />
                  Start Earning Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-14 px-8 rounded-2xl text-base border-[#F0B90B]/20 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/30 gap-2"
                >
                  <Globe className="h-5 w-5" />
                  View on BscScan
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
              { label: 'Total Value Locked', value: '$12.5M+', icon: Lock },
              { label: 'Active Stakers', value: '8,420+', icon: Users },
              { label: 'Rewards Distributed', value: '$3.2M+', icon: TrendingUp },
              { label: 'Network Size', value: '24K+', icon: Globe },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <stat.icon className="h-5 w-5 text-[#F0B90B] mx-auto mb-2" />
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
            <Badge variant="outline" className="border-[#F0B90B]/30 text-[#F0B90B] gap-1.5 text-xs mb-4">
              <Star className="h-3 w-3" />
              FEATURES
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Why Choose <span className="text-gradient-bnb">StakeBNB</span>?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built on BNB Smart Chain for speed, security, and maximum rewards
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: TrendingUp,
                title: 'High-Yield Staking',
                desc: 'Earn up to 25% APY with flexible staking plans. Choose from 30 to 365 day lock periods with competitive returns.',
                color: '#F0B90B'
              },
              {
                icon: Users,
                title: 'Unilevel Commissions',
                desc: 'Earn from 5 levels of referrals. Get up to 10% commission on your direct network\'s staking activity.',
                color: '#10b981'
              },
              {
                icon: Layers,
                title: 'Binary Structure',
                desc: 'Build your binary tree and earn matching bonuses from your weaker leg volume with daily caps.',
                color: '#8b5cf6'
              },
              {
                icon: ShieldCheck,
                title: 'Audited Smart Contracts',
                desc: 'All contracts are fully audited and open-source. Your funds are secured by battle-tested code on BNB Chain.',
                color: '#06b6d4'
              },
              {
                icon: Zap,
                title: 'Instant Rewards',
                desc: 'Rewards accrue in real-time and can be claimed instantly. No waiting periods or complicated processes.',
                color: '#f43f5e'
              },
              {
                icon: Globe,
                title: 'Global Community',
                desc: 'Join thousands of stakers worldwide building wealth together on the fastest growing DeFi ecosystem.',
                color: '#F0B90B'
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
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#F0B90B] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 relative section-transition bnb-gradient-bg">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="border-[#F0B90B]/30 text-[#F0B90B] gap-1.5 text-xs mb-4">
              <Rocket className="h-3 w-3" />
              GET STARTED
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Start Earning in <span className="text-gradient-bnb">3 Steps</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From wallet connection to earning rewards in minutes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect & Register',
                desc: 'Connect your BNB Smart Chain wallet. You\'ll be automatically registered with a unique referral code.',
                icon: Lock,
              },
              {
                step: '02',
                title: 'Stake USDT',
                desc: 'Choose a staking plan that fits your goals. Approve USDT and confirm your stake on-chain.',
                icon: Coins,
              },
              {
                step: '03',
                title: 'Earn & Grow',
                desc: 'Watch your rewards grow in real-time. Build your network and earn multi-level commissions.',
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
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 flex items-center justify-center animate-pulse-glow">
                    <item.icon className="h-8 w-8 text-[#F0B90B]" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-[#F0B90B] text-[#0a0a0f] text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 -right-4 w-8">
                    <ArrowRight className="h-5 w-5 text-[#F0B90B]/30" />
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
            className="glass-card rounded-3xl p-8 sm:p-12 glow-bnb"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Platform <span className="text-gradient-bnb">Statistics</span>
              </h2>
              <p className="text-gray-400">Real-time metrics from the StakeBNB protocol</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Value Locked', value: '$12,547,832', change: '+12.5%' },
                { label: 'Total Stakers', value: '8,421', change: '+8.3%' },
                { label: 'Commissions Paid', value: '$3,241,567', change: '+15.2%' },
                { label: 'Avg. APY', value: '18.7%', change: '+2.1%' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-bnb mb-1">
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
              SECURITY
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Built for <span className="text-gradient-bnb">Trust</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Security is our top priority. Every transaction is transparent and verifiable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: 'Smart Contract Audited',
                desc: 'All contracts undergo rigorous third-party audits before deployment. Code is open-source and verifiable on BscScan.',
              },
              {
                icon: Lock,
                title: 'Non-Custodial',
                desc: 'Your keys, your crypto. We never hold your funds. All staking operations are executed directly on-chain.',
              },
              {
                icon: ShieldCheck,
                title: 'Multi-Sig Admin',
                desc: 'Admin functions require multi-signature authorization. No single point of failure in protocol governance.',
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
              Ready to Start <span className="text-gradient-bnb">Earning</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
              Join thousands of stakers earning passive income on BNB Smart Chain.
              Your future wealth starts with a single stake.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => setPage('dashboard')}
                className="btn-bnb h-14 px-10 rounded-2xl text-base gap-2"
              >
                <Zap className="h-5 w-5" />
                Connect & Stake Now
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
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#F0B90B] to-[#C99A00] flex items-center justify-center">
              <Zap className="h-3 w-3 text-[#0a0a0f]" />
            </div>
            <span className="text-sm text-gray-500">StakeBNB &copy; 2024</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <span>BNB Smart Chain</span>
            <span className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Network Active
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

  return (
    <nav className="space-y-1 px-3">
      {navItems
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
                  ? 'bg-[#F0B90B]/10 text-[#F0B90B] hover:bg-[#F0B90B]/15 hover:text-[#F0B90B]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-[#F0B90B]' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </Button>
          )
        })}
    </nav>
  )
}

// ===== MOBILE BOTTOM NAV =====
function MobileBottomNav() {
  const { currentPage, setPage, isAdmin } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong pb-safe border-t border-[#F0B90B]/10">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {mobileNavItems
          .filter(item => !item.adminOnly || isAdmin)
          .map(item => {
            const isActive = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 transition-colors"
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-[#F0B90B]' : 'text-gray-500'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#F0B90B]' : 'text-gray-500'}`}>
                  {item.label}
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
        {currentPage === 'admin' && <AdminPage />}
      </motion.div>
    </AnimatePresence>
  )
}

// ===== APP DASHBOARD LAYOUT =====
function AppLayout() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#F0B90B]/8 glass-strong">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-gray-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#0a0a0f] border-[#F0B90B]/10 p-0 w-64">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 px-6 h-14 border-b border-[#F0B90B]/10">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#C99A00] flex items-center justify-center">
                      <Zap className="h-4 w-4 text-[#0a0a0f]" />
                    </div>
                    <span className="font-bold text-lg text-gradient-bnb">StakeBNB</span>
                  </div>
                  <div className="flex-1 py-4">
                    <SidebarNav onNavigate={() => setSidebarOpen(false)} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#F0B90B] to-[#C99A00] flex items-center justify-center">
                <Zap className="h-4 w-4 text-[#0a0a0f]" />
              </div>
              <span className="font-bold text-lg text-gradient-bnb hidden sm:inline">StakeBNB</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="border-[#F0B90B]/20 text-[#F0B90B] gap-1.5 text-xs hidden sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-[#F0B90B] animate-pulse" />
              BNB Chain
            </Badge>
            <WalletConnect />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-[#F0B90B]/8 bg-[#0a0a0f]/50 shrink-0">
          <div className="flex-1 py-4">
            <SidebarNav />
          </div>
          <div className="p-4 border-t border-[#F0B90B]/8">
            <div className="p-3 rounded-xl glass-card space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ExternalLink className="h-4 w-4" />
                <span>BNB Smart Chain</span>
              </div>
              <p className="text-xs text-gray-600">Block: #38,521,847</p>
              <p className="text-xs text-gray-600">Gas: 3 Gwei</p>
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
      <footer className="hidden lg:block border-t border-[#F0B90B]/8 bg-[#0a0a0f] mt-auto">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-[#F0B90B]" />
              <span>StakeBNB &copy; 2024</span>
            </div>
            <div className="flex items-center gap-4">
              <span>BNB Smart Chain Mainnet</span>
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Network Active
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

  if (showApp) {
    return <AppLayout />
  }

  return <LandingPage />
}
