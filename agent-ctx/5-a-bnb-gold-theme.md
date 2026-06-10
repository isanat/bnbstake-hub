# Task 5-a: Rewrite AdminPage and WalletConnect with BNB Gold Theme

## Task Summary
Rewrote two components to replace emerald/green accent colors with BNB Chain gold (#F0B90B) theme, using existing CSS utility classes (glass-card, glass-strong, btn-bnb, text-gradient-bnb).

## Files Modified

### 1. `/home/z/my-project/src/components/web3/AdminPage.tsx`
**Changes:**
- **Tab triggers**: Active state changed from `bg-emerald-600 text-white` → `bg-[#F0B90B] text-[#0a0a0f] font-bold`
- **Tab list**: Border updated to `border-[#F0B90B]/10` with backdrop blur
- **All Cards**: Replaced `bg-gray-900/80 border-gray-800 backdrop-blur-sm` → `glass-card backdrop-blur-xl`
- **Admin badge**: Changed from `bg-amber-500/10 text-amber-400 border-amber-500/20` → `bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20`
- **All buttons**: Changed from `bg-emerald-600 hover:bg-emerald-700 text-white` → `btn-bnb` class (golden gradient with hover glow)
- **Input fields**: Changed from `bg-gray-800 border-gray-700` → `bg-gray-800/60 border-[#F0B90B]/20 focus:ring-[#F0B90B]/50 focus:border-[#F0B90B]/50`
- **Accent colors**: All `text-emerald-400` → `text-[#F0B90B]`
- **Badge borders**: `border-emerald-500/30` → `border-[#F0B90B]/30`
- **Row hover**: `hover:bg-gray-800` → `hover:bg-[#F0B90B]/5 border-transparent hover:border-[#F0B90B]/10`
- **Unilevel level badges**: `bg-emerald-500/10 text-emerald-400` → `bg-[#F0B90B]/10 text-[#F0B90B]`
- **Warning box**: Updated to use `bg-[#F0B90B]/5 border-[#F0B90B]/20` with golden accent
- **Report stats**: Values changed from `text-white` → `text-[#F0B90B]`, pending commissions in `text-[#F8D12F]`
- **Bar chart**: Deposits fill `#F0B90B` (gold), withdrawals fill `#F8D12F` (lighter gold)
- **Tooltip**: Glass background with golden border
- **Plan dialog**: `glass-strong` with `border-[#F0B90B]/15`, title uses `text-gradient-bnb`

### 2. `/home/z/my-project/src/components/web3/WalletConnect.tsx`
**Changes:**
- **Connect button**: Changed from `bg-emerald-600 hover:bg-emerald-700 text-white` → `btn-bnb` class
- **Connected wallet display**: Changed from `bg-gray-800/80 border-gray-700` → `glass-card`
- **Pulse indicator**: Changed from `bg-emerald-500` → `bg-[#F0B90B]` with golden shadow `shadow-[0_0_8px_rgba(240,185,11,0.5)]`
- **Copy button hover**: Changed from `hover:text-emerald-400` → `hover:text-[#F0B90B]`
- **Dividers**: Changed from `border-gray-700` → `border-[#F0B90B]/20`
- **USDT balance**: Changed from `text-emerald-400` → `text-[#F0B90B] font-medium`
- **BNB balance**: Remains `text-gray-400`
- **Wallet dialog**: Changed from `bg-gray-900 border-gray-800` → `glass-strong border-[#F0B90B]/15 backdrop-blur-xl`
- **Dialog title**: Uses `text-gradient-bnb` class
- **Simulated Wallet button**: Changed from emerald → `btn-bnb` class, subtitle uses `opacity-70` instead of `text-emerald-200/70`
- **Admin Wallet button**: Changed from `border-amber-500/30 hover:bg-amber-500/10 text-amber-400` → `border-[#F0B90B]/30 hover:bg-[#F0B90B]/10 text-[#F0B90B]`
- **Admin icon badge**: Changed to `bg-[#F0B90B]/20 text-[#F0B90B]`
- **Admin subtitle**: Changed to `text-[#F0B90B]/60`
- **Custom address input**: Changed from `bg-gray-800 border-gray-700` → `bg-gray-800/60 border-[#F0B90B]/20 focus:ring-[#F0B90B]/50 focus:border-[#F0B90B]/50`
- **Connect button for custom**: Changed from `bg-gray-800 hover:bg-gray-700 text-white` → `bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/20`
- **Chain badge**: Changed from `border-gray-700 text-gray-400 bg-emerald-500` → `border-[#F0B90B]/20 text-[#F0B90B]/70 bg-[#F0B90B]`

## Preserved
- All data interfaces (AdminStats, AdminData, AdminPlan, MlmConfig, AdminUser, AdminUsersData)
- All mutations (savePlanMutation, saveBinaryConfigMutation, saveUnilevelConfigMutation)
- All API calls and query keys
- All business logic (registerUser, handleConnect*, openEditPlan, etc.)
- Component structure and layout

## Verification
- Both files pass ESLint with zero errors
- Dev server compiles successfully
- No emerald color references remain in either file
