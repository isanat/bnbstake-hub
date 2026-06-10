import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Get system stats
    const [
      totalUsers,
      activeUsers,
      totalStakedResult,
      totalEarnedResult,
      totalWithdrawnResult,
      totalCommissionsResult,
      pendingCommissionsResult,
      activeStakesCount,
      totalStakesCount,
      totalTransactions,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.aggregate({ _sum: { totalStaked: true } }),
      db.user.aggregate({ _sum: { totalEarned: true } }),
      db.user.aggregate({ _sum: { totalWithdrawn: true } }),
      db.commission.aggregate({ _sum: { amount: true } }),
      db.commission.aggregate({
        where: { status: "pending" },
        _sum: { amount: true },
      }),
      db.stake.count({ where: { status: "active" } }),
      db.stake.count(),
      db.transaction.count(),
    ]);

    // Recent activity (last 10 transactions)
    const recentActivity = await db.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            walletAddress: true,
            referralCode: true,
          },
        },
      },
    });

    // Recent users (last 5)
    const recentUsers = await db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        walletAddress: true,
        referralCode: true,
        totalStaked: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { referrals: true, stakes: true },
        },
      },
    });

    // Staking plan stats
    const planStats = await db.stakingPlan.findMany({
      include: {
        _count: { select: { stakes: true } },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalStaked: totalStakedResult._sum.totalStaked ?? 0,
        totalEarned: totalEarnedResult._sum.totalEarned ?? 0,
        totalWithdrawn: totalWithdrawnResult._sum.totalWithdrawn ?? 0,
        totalCommissions: totalCommissionsResult._sum.amount ?? 0,
        pendingCommissions: pendingCommissionsResult._sum.amount ?? 0,
        activeStakes: activeStakesCount,
        totalStakes: totalStakesCount,
        totalTransactions,
      },
      planStats: planStats.map((p) => ({
        id: p.id,
        name: p.name,
        apy: p.apy,
        durationDays: p.durationDays,
        isActive: p.isActive,
        stakeCount: p._count.stakes,
      })),
      recentActivity: recentActivity.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        user: t.user.walletAddress,
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        walletAddress: u.walletAddress,
        referralCode: u.referralCode,
        totalStaked: u.totalStaked,
        isActive: u.isActive,
        createdAt: u.createdAt,
        referrals: u._count.referrals,
        stakes: u._count.stakes,
      })),
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}
