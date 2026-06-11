# Task 2-a: Shared UI Components - BNB Chain Visual Identity

## Task Overview
Rebuilt all shared UI components with the BNB Smart Chain visual identity: glassmorphism, golden accents (#F0B90B), dark backgrounds (#0a0a0f), and motion design.

## Files Updated

### 1. StatsCard.tsx
- **Glassmorphism**: Uses `glass-card` class for frosted glass effect with subtle golden border
- **Golden accent icon**: Icon uses `text-bnb` color with `bg-bnb/8` background, scaling to `bg-bnb/15` on hover
- **Value text**: Uses `text-gradient-bnb` class for golden gradient text
- **Trend indicators**: Emerald-400 for positive (with custom SVG arrow), red-400 for negative, with pill badges (`bg-emerald-500/10`, `bg-red-500/10`)
- **Framer Motion**: Staggered entrance animation with `opacity`, `y`, and `scale`, plus `whileHover` scale effect
- **Index prop**: Added `index` prop for staggered delay calculation
- **Hover effects**: Golden border glow (`hover:border-bnb/25`), subtle shadow, decorative bottom accent line on hover
- **Mobile-first**: Responsive sizing (`text-2xl sm:text-3xl`, `p-5 sm:p-6`)
- **Removed**: Card/CardContent imports from shadcn/ui (using custom glass-card class instead)

### 2. PageHeader.tsx
- **Title rendering**: Supports `accentWord` prop to highlight specific words in the title with `text-gradient-bnb` and `glow-bnb-text` classes
- **Description**: Gray-400 color for secondary text, with delayed fade-in animation
- **Actions area**: Motion-animated slide-in from right with delay
- **Framer Motion**: Top-down entrance animation with smooth easing
- **Responsive**: `text-2xl sm:text-3xl` for titles, responsive gap and margin

### 3. EmptyState.tsx
- **Golden glow icon**: Icon wrapped in container with `bg-bnb/8` background, `border-bnb/15` border, and `animate-pulse-glow` outer glow effect
- **Glassmorphism container**: Entire empty state wrapped in `glass-card rounded-2xl` with generous padding
- **Staggered animations**: Icon, title, description, and action each animate in sequence with increasing delays
- **Decorative bottom line**: Golden gradient divider at bottom
- **Responsive**: `p-8 sm:p-10`, `h-10 w-10 sm:h-12 sm:w-12` for icon

### 4. LoadingSkeleton.tsx
- **Custom GoldSkeleton**: Replaced shadcn Skeleton with custom component using `from-bnb/5 via-bnb/10 to-bnb/5` gradient and `animate-shimmer` effect
- **Dark glass backgrounds**: All containers use `glass-card rounded-2xl` instead of `bg-gray-900/80 border-gray-800`
- **Motion entrance**: Each variant has container-level fade-in, individual elements have staggered entrance animations
- **Chart variant**: Added axis placeholder row at bottom for more realistic chart skeleton
- **Removed**: shadcn Skeleton import (using custom GoldSkeleton)

## Design Patterns Used
- `glass-card` - Glassmorphism card backgrounds
- `text-gradient-bnb` - Golden gradient text
- `glow-bnb-text` - Text shadow glow
- `animate-pulse-glow` - Pulsing glow animation
- `animate-shimmer` - Shimmer sweep effect
- `animate-count-up` - Value entrance animation
- `bg-bnb/8`, `border-bnb/15` - BNB color with opacity modifiers
- `text-bnb`, `text-bnb-light` - BNB chain brand colors

## Lint Status
All 4 shared components pass ESLint with zero errors. (Pre-existing error in page.tsx is unrelated.)
