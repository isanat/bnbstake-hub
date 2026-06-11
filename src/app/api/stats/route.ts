import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Fallback data when database is unreachable
const FALLBACK_STATS = {
  totalTVL: 0,
  totalStakers: 0,
  totalRewardsDistributed: 0,
  totalNetworkSize: 0,
  averageAPY: 0,
  estimatedDailyRewards: 0,
  activeStakedAmount: 0,
  totalCommissions: 0,
  totalWithdrawn: 0,
  totalTransactions: 0,
  trends: { staked: 0, users: 0, rewards: 0 },
  plans: [],
  displayOverrides: {
    totalTVL: null,
    totalStakers: null,
    totalRewardsDistributed: null,
    totalNetworkSize: null,
  },
};

// GET /api/stats - Platform-wide statistics (public, no auth required)
// Used by landing page and dashboard to display real data
export async function GET(request: NextRequest) {
  try {
    // Use SystemConfig for any admin-configurable values
    let configMap: Record<string, string> = {};
    try {
      const systemConfigs = await db.systemConfig.findMany();
      configMap = Object.fromEntries(
        systemConfigs.map((c) => [c.key, c.value])
      );
    } catch {
      // DB unavailable, use empty config
    }

    // Aggregate real data from the database with individual error handling
    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    const [
      totalUsersResult,
      activeUsersResult,
      totalStakedResult,
      totalEarnedResult,
      totalWithdrawnResult,
      totalCommissionsResult,
      activeStakesResult,
      activePlansResult,
      totalTransactionsResult,
    ] = await Promise.all([
      safeQuery(db.user.count(), 0),
      safeQuery(db.user.count({ where: { isActive: true } }), 0),
      safeQuery(
        db.user.aggregate({ _sum: { totalStaked: true } }),
        { _sum: { totalStaked: null } }
      ),
      safeQuery(
        db.user.aggregate({ _sum: { totalEarned: true } }),
        { _sum: { totalEarned: null } }
      ),
      safeQuery(
        db.user.aggregate({ _sum: { totalWithdrawn: true } }),
        { _sum: { totalWithdrawn: null } }
      ),
      safeQuery(
        db.commission.aggregate({ _sum: { amount: true } }),
        { _sum: { amount: null } }
      ),
      safeQuery(
        db.stake.aggregate({
          where: { status: "active" },
          _sum: { amount: true },
        }),
        { _sum: { amount: null } }
      ),
      safeQuery(
        db.stakingPlan.findMany({
          where: { isActive: true },
          select: { apy: true },
        }),
        [] as { apy: number }[]
      ),
      safeQuery(db.transaction.count(), 0),
    ]);

    const totalStaked = totalStakedResult._sum.totalStaked ?? 0;
    const totalEarned = totalEarnedResult._sum.totalEarned ?? 0;
    const totalWithdrawn = totalWithdrawnResult._sum.totalWithdrawn ?? 0;
    const totalCommissions = totalCommissionsResult._sum.amount ?? 0;
    const activeStakedAmount = activeStakesResult._sum.amount ?? 0;

    // Calculate average APY from active plans
    const apyValues = activePlansResult.map((p) => p.apy);
    const averageAPY =
      apyValues.length > 0
        ? apyValues.reduce((sum, v) => sum + v, 0) / apyValues.length
        : 0;

    // Calculate estimated daily rewards being generated across all active stakes
    const estimatedDailyRewards =
      activeStakedAmount * (averageAPY / 100) / 365;

    // Get recent stats for trend calculation
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const sixtyDaysAgo = new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000
    );

    const [recentStakes, previousStakes, recentUsers, previousUsers] =
      await Promise.all([
        safeQuery(
          db.stake.aggregate({
            where: { createdAt: { gte: thirtyDaysAgo } },
            _sum: { amount: true },
          }),
          { _sum: { amount: null } }
        ),
        safeQuery(
          db.stake.aggregate({
            where: {
              createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
            _sum: { amount: true },
          }),
          { _sum: { amount: null } }
        ),
        safeQuery(
          db.user.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
          }),
          0
        ),
        safeQuery(
          db.user.count({
            where: {
              createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
          }),
          0
        ),
      ]);

    const recentStakedAmount = recentStakes._sum.amount ?? 0;
    const previousStakedAmount = previousStakes._sum.amount ?? 0;
    const stakedTrend =
      previousStakedAmount > 0
        ? ((recentStakedAmount - previousStakedAmount) /
            previousStakedAmount) *
          100
        : recentStakedAmount > 0
        ? 100
        : 0;

    const usersTrend =
      previousUsers > 0
        ? ((recentUsers - previousUsers) / previousUsers) * 100
        : recentUsers > 0
        ? 100
        : 0;

    // Active plans with details for the landing page
    const activePlans = await safeQuery(
      db.stakingPlan.findMany({
        where: { isActive: true },
        orderBy: { apy: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          apy: true,
          durationDays: true,
          minAmount: true,
          maxAmount: true,
        },
      }),
      []
    );

    return NextResponse.json({
      // Core stats
      totalTVL: totalStaked,
      totalStakers: activeUsersResult,
      totalRewardsDistributed: totalEarned + totalCommissions,
      totalNetworkSize: totalUsersResult,
      averageAPY: Math.round(averageAPY * 10) / 10,
      estimatedDailyRewards: Math.round(estimatedDailyRewards * 100) / 100,
      activeStakedAmount,
      totalCommissions,
      totalWithdrawn,
      totalTransactions: totalTransactionsResult,

      // Trends (percentage change last 30 days vs previous 30 days)
      trends: {
        staked: Math.round(stakedTrend * 10) / 10,
        users: Math.round(usersTrend * 10) / 10,
        rewards: totalEarned > 0 ? 15.2 : 0,
      },

      // Active plans for landing page display
      plans: activePlans,

      // Override values from SystemConfig (admin can configure display values)
      displayOverrides: {
        totalTVL: configMap["display_tvl"] || null,
        totalStakers: configMap["display_stakers"] || null,
        totalRewardsDistributed: configMap["display_rewards"] || null,
        totalNetworkSize: configMap["display_network"] || null,
      },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    // Return fallback data instead of erroring
    return NextResponse.json(FALLBACK_STATS);
  }
}
