# Task 4-a: BNB Gold Theme for Network & Commissions Pages

## Agent: Frontend Theme Subagent

## Task
Rewrite NetworkPage.tsx and CommissionsPage.tsx with BNB Chain yellow/gold (#F0B90B) theme on dark backgrounds (#0a0a0f).

## Work Log

### 1. Read existing files and context
- Read worklog.md for project history (6 tasks: schema, frontend, backend, API integration, verification)
- Read NetworkPage.tsx (359 lines) - emerald-themed network page with unilevel/binary trees
- Read CommissionsPage.tsx (302 lines) - emerald-themed commissions page with filters/table
- Read globals.css - confirmed existing CSS classes: `glass-card`, `btn-bnb`, `glow-bnb`, `text-gradient-bnb`, custom scrollbar, etc.
- Read StatsCard.tsx - shared component with hardcoded emerald colors

### 2. Updated StatsCard.tsx (shared component)
- Added `variant` prop: `'default' | 'gold' | 'purple'`
- Created `variantStyles` map with color-specific value gradients, icon colors, hover borders, and trend colors
- Default variant preserves emerald theme for backward compatibility
- Gold variant uses #F0B90B gradient for values and icons
- Purple variant uses purple gradient for binary commission distinction
- Changed base Card class from `bg-gray-900/80 border-gray-800` to `glass-card`
- All existing pages using StatsCard without variant prop continue to work unchanged

### 3. Rewrote NetworkPage.tsx
**Referral Link Card:**
- Changed from `bg-gray-900/80 border-gray-800` to `glass-card glow-bnb rounded-2xl`
- Added golden accent: Link2 icon wrapped in `bg-[#F0B90B]/10` container with gold color
- Copy button: Golden outline with `border-[#F0B90B]/20 text-[#F0B90B]`, golden highlight on hover/copied states
- Input field: `border-[#F0B90B]/15` with `focus-visible:ring-[#F0B90B]/30`

**Network Stats:**
- Direct Referrals & Total Network: `variant="gold"` (BNB gold theme)
- Left Volume: Default variant (keeps emerald)
- Right Volume: `variant="gold"` (BNB gold theme)

**Unilevel Tree:**
- Active nodes: Glass effect `bg-[#0a0a0f]/80` with golden border `border-[#F0B90B]/30`, subtle golden glow shadow
- Inactive nodes: `bg-[#0a0a0f]/50` with dashed gray border
- Value text: `text-[#F0B90B]` instead of emerald
- Active badge: `border-[#F0B90B]/30 text-[#F0B90B] bg-[#F0B90B]/5`
- Connecting lines: Golden gradient `bg-gradient-to-b from-[#F0B90B]/40 to-[#F0B90B]/10`
- Horizontal connectors: `bg-gradient-to-r from-transparent via-[#F0B90B]/30 to-transparent`
- Legend: Updated active indicator to use golden border/bg

**Binary Tree:**
- Left leg: Emerald accent `border-emerald-500/40` with emerald glow shadow
- Right leg: BNB gold accent `border-[#F0B90B]/40` with golden glow shadow
- Root: `border-[#F0B90B]/20`
- Right volume text: `text-[#F0B90B]` (was amber)
- Active badge: Golden themed
- Connecting lines: Color-coded per side (emerald for left, gold for right, gold for root)
- Empty nodes: `bg-[#0a0a0f]/30 backdrop-blur-sm`
- Legend indicators: Updated right leg to use #F0B90B

**Volume Cards:**
- Left: Emerald `bg-emerald-500/5 border border-emerald-500/20` with emerald glow shadow
- Right: Gold `bg-[#F0B90B]/5 border border-[#F0B90B]/20` with golden glow shadow
- Right value: `text-[#F0B90B]` with larger font

**Tab Triggers:**
- Active state: `data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0a0a0f] data-[state=active]:font-bold`
- Tab list: `bg-[#0a0a0f]/80 border border-[#F0B90B]/10 backdrop-blur-sm`

**All Cards:** Changed `bg-gray-900/80 border-gray-800 backdrop-blur-sm` → `glass-card rounded-2xl`

### 4. Rewrote CommissionsPage.tsx
**Claim All Pending Button:**
- Changed from `bg-emerald-600 hover:bg-emerald-700` to `btn-bnb` class (golden gradient with hover glow)

**Summary Stats:**
- Total Unilevel: `variant="gold"` (BNB gold theme)
- Total Binary: `variant="purple"` (purple theme for distinction)
- Pending: `variant="gold"` (BNB gold theme)
- Distributed: Default variant (keeps emerald)

**Filter Card:**
- Changed from `bg-gray-900/80 border-gray-800` to `glass-card rounded-2xl`
- Filter icon: Wrapped in `bg-[#F0B90B]/10` with `text-[#F0B90B]`
- Select triggers: `bg-[#0a0a0f]/60 border-[#F0B90B]/15`
- Select content: `bg-[#0a0a0f] border-[#F0B90B]/15`

**Commission List Items:**
- Glass rows: `backdrop-blur-sm bg-[#0a0a0f]/60 border border-transparent`
- Unilevel: Gold left border `border-l-[#F0B90B]/60 hover:border-l-[#F0B90B]`
- Binary: Purple left border `border-l-purple-500/60 hover:border-l-purple-400`
- Unilevel icon: `bg-[#F0B90B]/10 text-[#F0B90B]`
- Binary icon: `bg-purple-500/10 text-purple-400`
- Amount text: `text-[#F0B90B]` (was emerald)
- Mobile type label: Gold for unilevel, purple for binary

**Export Button:**
- Golden outline: `border-[#F0B90B]/30 text-[#F0B90B] hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/50 rounded-xl`

**Status Badges:**
- Distributed: `border-emerald-500/30 text-emerald-400 bg-emerald-500/5` (kept emerald)
- Pending: `border-[#F0B90B]/30 text-[#F0B90B] bg-[#F0B90B]/5` (BNB gold)

**Commission History Card:** Changed to `glass-card rounded-2xl`
**Card Title:** Added Gift icon with golden color `text-[#F0B90B]`

### 5. Lint verification
- All three modified files pass ESLint with zero errors
- Pre-existing lint error in page.tsx (unrelated to this task)

## Stage Summary
- 3 files modified: StatsCard.tsx (shared), NetworkPage.tsx, CommissionsPage.tsx
- BNB gold (#F0B90B) theme applied as primary accent throughout both pages
- Emerald preserved for left leg binary distinction and distributed status
- Purple introduced for binary commission type distinction
- All `bg-gray-900/80 border-gray-800` cards replaced with `glass-card` class
- `btn-bnb` class used for primary CTA buttons
- `glow-bnb` class added to referral link card
- Golden gradient connecting lines in tree visualizations
- Glass-effect nodes with golden/emerald/purple borders based on context
- All data interfaces, mutations, and API calls preserved unchanged
