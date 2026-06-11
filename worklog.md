---
Task ID: 1
Agent: Main Agent
Task: Fix admin data not reflecting dynamically on user dashboard and landing page

Work Log:
- Investigated full codebase - identified all hardcoded/mock data locations
- Created `/api/stats` endpoint for platform-wide statistics (TVL, stakers, rewards, APY, plans)
- Fixed LandingPage to fetch stats from `/api/stats` instead of hardcoded values ($12.5M+, 8,420+, etc.)
- Fixed DashboardPage - replaced hardcoded trend percentages, added "Daily Earnings" card
- Fixed StakingPage - added daily earnings display prominently on plan cards (~$X.XX/day per $1,000 staked)
- Fixed AdminPage - added query invalidation for `['staking']`, `['plans']`, `['platform-stats']` when admin saves plans/config
- Fixed AdminPage - replaced mockDepositData chart with real data from admin stats API
- Fixed sidebar - removed hardcoded blockchain info (block number, gas price)
- Added `daily_earnings` translation key to defaultTranslations.ts
- Made `/api/stats` resilient to DB connection issues with fallback data
- Tested API - confirmed it returns real data from Neon PostgreSQL: TVL=$8,000, 6 stakers, 18.3% avg APY, 3 plans
- Tested page rendering via Agent Browser - page loads, calculator works with DB-fetched plans
- Neon database is intermittently reachable from sandbox (causes stats to show "..." when DB is unreachable)

Stage Summary:
- Core fix: Admin plan/config mutations now invalidate user-facing query caches (staking, plans, platform-stats)
- Landing page stats now fetched dynamically from /api/stats instead of hardcoded
- Dashboard now shows "Daily Earnings" prominently instead of just total earned
- Staking plan cards now show "~$X.XX/day per $1,000 staked" below the APY
- Admin reports chart uses real data instead of mock monthly deposits
- All lint checks pass
- Dev server intermittent connectivity issue (Neon DB from sandbox) - works when DB is reachable
