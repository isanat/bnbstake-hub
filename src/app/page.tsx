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
  Zap, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navItems: { page: PageType; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'staking', label: 'Staking', icon: Coins },
  { page: 'network', label: 'Network', icon: Users },
  { page: 'commissions', label: 'Commissions', icon: Gift },
  { page: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
]

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
                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-emerald-500' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </Button>
          )
        })}
    </nav>
  )
}

function PageContent() {
  const { currentPage } = useAppStore()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
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

export default function HomePage() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-gray-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-gray-950 border-gray-800 p-0 w-64">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-800">
                    <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-lg text-white">StakeBNB</span>
                  </div>
                  <div className="flex-1 py-4">
                    <SidebarNav onNavigate={() => setSidebarOpen(false)} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white hidden sm:inline">StakeBNB</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 gap-1.5 text-xs hidden sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              BNB Smart Chain
            </Badge>
            <WalletConnect />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-gray-800 bg-gray-950/50 shrink-0">
          <div className="flex-1 py-4">
            <SidebarNav />
          </div>
          <div className="p-4 border-t border-gray-800">
            <div className="p-3 rounded-xl bg-gray-800/50 space-y-2">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <PageContent />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              <span>StakeBNB &copy; 2024</span>
            </div>
            <div className="flex items-center gap-4">
              <span>BNB Smart Chain Mainnet</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Network Active
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
