'use client'

import { create } from 'zustand'

export type PageType = 'dashboard' | 'staking' | 'network' | 'commissions' | 'achievements' | 'admin'

interface AppState {
  currentWallet: string | null
  isConnected: boolean
  isAdmin: boolean
  currentPage: PageType
  sidebarOpen: boolean
  polBalance: number
  usdtBalance: number

  connectWallet: (address: string) => void
  disconnectWallet: () => void
  setPage: (page: PageType) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

const ADMIN_WALLET = '0xAdmin0000000000000000000000000000000001'

export const useAppStore = create<AppState>((set) => ({
  currentWallet: null,
  isConnected: false,
  isAdmin: false,
  currentPage: 'dashboard',
  sidebarOpen: false,
  polBalance: 0,
  usdtBalance: 0,

  connectWallet: (address: string) => {
    const isAdmin = address.toLowerCase() === ADMIN_WALLET.toLowerCase()
    set({
      currentWallet: address,
      isConnected: true,
      isAdmin,
      polBalance: Math.random() * 50 + 5,
      usdtBalance: Math.random() * 10000 + 500,
    })
  },

  disconnectWallet: () => {
    set({
      currentWallet: null,
      isConnected: false,
      isAdmin: false,
      currentPage: 'dashboard',
      polBalance: 0,
      usdtBalance: 0,
    })
  },

  setPage: (page: PageType) => {
    set({ currentPage: page, sidebarOpen: false })
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },
}))

// Expose store to window for testing/debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__APP_STORE__ = useAppStore
}
