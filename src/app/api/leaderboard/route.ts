import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leaderboard?type=earners|stakers|referrers&period=week|all&limit=20
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "earners";
    const period = searchParams.get("period") || "all";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const wallet = searchParams.get("wallet");

    const validTypes = ["earners", "stakers", "referrers"];
    const validPeriods = ["week", "all"];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use: earners, stakers, or referrers" },
        { status: 400 }
      );
    }

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: week or all" },
        { status: 400 }
      );
    }

    // Calculate date filter for weekly period
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let leaderboard = [];

    switch (type) {
      case "earners": {
        if (period === "week") {
          // For weekly, sum commissions earned in the last 7 days
          const weeklyEarners = await db.user.findMany({
            where: {
              isActive: true,
              commissions: {
                some: {
                  createdAt: { gte: weekAgo },
                  status: "distributed",
                },
              },
            },
            select: {
              id: true,
              walletAddress: true,
              totalEarned: true,
              level: true,
              xp: true,
              commissions: {
                where: {
                  createdAt: { gte: weekAgo },
                  status: "distributed",
                },
                select: { amount: true },
              },
            },
          });

          leaderboard = weeklyEarners
            .map((user) => ({
              id: user.id,
              walletAddress: user.walletAddress,
              value: user.commissions.reduce((sum, c) => sum + c.amount, 0),
              level: user.level,
              xp: user.xp,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);
        } else {
          // All time - order by totalEarned
          const topEarners = await db.user.findMany({
            where: {
              isActive: true,
              totalEarned: { gt: 0 },
            },
            select: {
              id: true,
              walletAddress: true,
              totalEarned: true,
              level: true,
              xp: true,
            },
            orderBy: { totalEarned: "desc" },
            take: limit,
          });

          leaderboard = topEarners.map((user) => ({
            id: user.id,
            walletAddress: user.walletAddress,
            value: user.totalEarned,
            level: user.level,
            xp: user.xp,
          }));
        }
        break;
      }

      case "stakers": {
        if (period === "week") {
          // Users who staked in the last 7 days
          const weeklyStakers = await db.user.findMany({
            where: {
              isActive: true,
              stakes: {
                some: {
                  createdAt: { gte: weekAgo },
                },
              },
            },
            select: {
              id: true,
              walletAddress: true,
              totalStaked: true,
              level: true,
              xp: true,
              stakes: {
                where: {
                  createdAt: { gte: weekAgo },
                },
                select: { amount: true },
              },
            },
          });

          leaderboard = weeklyStakers
            .map((user) => ({
              id: user.id,
              walletAddress: user.walletAddress,
              value: user.stakes.reduce((sum, s) => sum + s.amount, 0),
              totalStaked: user.totalStaked,
              level: user.level,
              xp: user.xp,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);
        } else {
          // All time - order by totalStaked
          const topStakers = await db.user.findMany({
            where: {
              isActive: true,
              totalStaked: { gt: 0 },
            },
            select: {
              id: true,
              walletAddress: true,
              totalStaked: true,
              level: true,
              xp: true,
            },
            orderBy: { totalStaked: "desc" },
            take: limit,
          });

          leaderboard = topStakers.map((user) => ({
            id: user.id,
            walletAddress: user.walletAddress,
            value: user.totalStaked,
            level: user.level,
            xp: user.xp,
          }));
        }
        break;
      }

      case "referrers": {
        // Count referrals for each user
        const allUsers = await db.user.findMany({
          where: { isActive: true },
          select: {
            id: true,
            walletAddress: true,
            level: true,
            xp: true,
            _count: {
              select: { referrals: true },
            },
          },
        });

        leaderboard = allUsers
          .filter((u) => u._count.referrals > 0)
          .map((user) => ({
            id: user.id,
            walletAddress: user.walletAddress,
            value: user._count.referrals,
            level: user.level,
            xp: user.xp,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, limit);
        break;
      }
    }

    // Find user's rank if wallet is provided
    let userRank = null;
    if (wallet) {
      const userEntry = leaderboard.find(
        (entry) => entry.walletAddress.toLowerCase() === wallet.toLowerCase()
      );
      if (userEntry) {
        userRank = leaderboard.indexOf(userEntry) + 1;
      }
    }

    return NextResponse.json({
      type,
      period,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry,
        walletAddress:
          entry.walletAddress.slice(0, 6) +
          "..." +
          entry.walletAddress.slice(-4),
      })),
      userRank,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
