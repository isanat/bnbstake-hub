# Task 3: StakingPage BNB Gold DeFi Aesthetic Rewrite

## Agent
Frontend Subagent

## Task
Rewrite StakingPage.tsx with professional BNB Chain DeFi aesthetic, converting from emerald theme to BNB gold (#F0B90B) theme.

## Work Log

### 1. Updated StatsCard Component (`src/components/shared/StatsCard.tsx`)
- Added `theme` prop supporting `'emerald' | 'bnb'` options
- Created `themeConfig` object with all theme-specific color mappings
- BNB theme uses: `#F0B90B` (gold), `#F8D12F` (light gold), `#F0B90B/10` (gold bg), `#F0B90B/30` (gold border)
- BNB theme cards use `glass-card` class instead of `bg-gray-900/80`
- BNB theme value text uses `text-gradient-bnb` CSS class
- Backward compatible - existing emerald theme unchanged

### 2. Rewrote StakingPage (`src/components/web3/StakingPage.tsx`)
All visual changes applied while preserving identical data interfaces, mutations, and API calls:

**Staking Plan Cards:**
- Wrapped in `gradient-border` class for golden gradient border effect
- Inner card uses `glass-card` class for glassmorphism
- Added `whileHover={{ scale: 1.03, y: -4 }}` with spring animation
- APY displayed at `text-5xl sm:text-6xl font-black` with `text-gradient-bnb`
- APY area has subtle gold background (`bg-[#F0B90B]/3`)
- Duration badge uses golden border (`border-[#F0B90B]/30 text-[#F0B90B]`)
- "Stake Now" button uses `btn-bnb` class with Sparkles icon
- Separator line uses golden gradient (`from-transparent via-[#F0B90B]/15 to-transparent`)
- Grid layout: `1 → sm:2 → lg:3 → xl:4` columns

**Active Stakes:**
- Glass cards with `border-l-[3px]` accent: gold for active, gray for withdrawn, amber for other
- Progress bar custom styled with golden gradient fill (`from-[#C99A00] via-[#F0B90B] to-[#F8D12F]`)
- Progress bar animated with Framer Motion `initial={{ width: 0 }}` animation
- Claim button: gold accent with `bg-[#F0B90B]/15 text-[#F0B90B] border-[#F0B90B]/20`
- Pending rewards shown in `text-[#F8D12F]` (light gold)

**Deposit Dialog:**
- Dialog uses `glass-strong` class with `border-[#F0B90B]/15`
- Title uses `text-gradient-bnb` with `text-3xl font-black`
- Step indicators (Approve → Confirm → Done) with:
  - Circular step indicators with golden glow on active
  - Connecting lines that turn gold when step completed
  - Done steps show CheckCircle2 icon in gold
- Input/select fields: gold border on focus (`focus:ring-[#F0B90B]/30 focus:border-[#F0B90B]/30`)
- USDT badge indicator in input field
- Estimated daily reward shown with Sparkles icon in gold
- Approval success message in gold-tinted alert box
- Confirm step shows "Confirming on BNB Chain..." with loader
- Done step shows success message with `glow-bnb` effect
- Plan preview card uses `glass` class with gold border

**Summary Stats:**
- All 4 StatsCard components now use `theme="bnb"`
- Wrapped in Framer Motion staggered animation container

**All Color Conversions:**
- `emerald-500` → `#F0B90B`
- `emerald-400` → `#F8D12F` (lighter gold)
- `emerald-600` → `#C99A00` (darker gold)
- `bg-gray-900/80 border-gray-800` → `glass-card` / `glass-strong`
- `bg-emerald-600 hover:bg-emerald-700` → `btn-bnb` class

**Animations:**
- `containerVariants` / `itemVariants` for staggered entry
- `stakeItemVariants` for slide-in from left
- Plan cards: `whileHover={{ scale: 1.03, y: -4 }}` with spring physics
- Progress bars: Framer Motion width animation with delay
- All transitions use smooth easing `[0.25, 0.46, 0.45, 0.94]`

**Mobile-first:**
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Stakes layout: `flex-col sm:flex-row`
- Stake details: `grid-cols-2 sm:grid-cols-4`
- Touch-friendly: `h-11` buttons, adequate spacing

## Stage Summary
- StakingPage fully rewritten with BNB gold DeFi aesthetic
- StatsCard made themeable with backward-compatible `theme` prop
- Zero new lint errors introduced
- All data interfaces, mutations, and API calls preserved
- Dev server running correctly with all API endpoints functional
