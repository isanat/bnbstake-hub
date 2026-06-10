import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

    // Build search filter
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { walletAddress: { contains: search } },
        { referralCode: { contains: search } },
      ];
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        walletAddress: true,
        referralCode: true,
        isAdmin: true,
        isActive: true,
        totalStaked: true,
        totalEarned: true,
        totalWithdrawn: true,
        leftVolume: true,
        rightVolume: true,
        binarySide: true,
        createdAt: true,
        referrer: {
          select: {
            walletAddress: true,
            referralCode: true,
          },
        },
        _count: {
          select: {
            referrals: true,
            stakes: true,
            commissions: true,
            transactions: true,
            binaryChildren: true,
          },
        },
      },
    });

    const total = await db.user.count({ where });

    // Get aggregate stats for each user's active stakes
    const userIds = users.map((u) => u.id);
    const activeStakesByUser = await db.stake.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: "active",
      },
      _sum: { amount: true },
      _count: true,
    });

    const activeStakesMap = new Map(
      activeStakesByUser.map((s) => [s.userId, { totalAmount: s._sum.amount ?? 0, count: s._count }])
    );

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        walletAddress: u.walletAddress,
        referralCode: u.referralCode,
        isAdmin: u.isAdmin,
        isActive: u.isActive,
        totalStaked: u.totalStaked,
        totalEarned: u.totalEarned,
        totalWithdrawn: u.totalWithdrawn,
        leftVolume: u.leftVolume,
        rightVolume: u.rightVolume,
        binarySide: u.binarySide,
        createdAt: u.createdAt,
        referrer: u.referrer,
        directReferrals: u._count.referrals,
        totalStakes: u._count.stakes,
        totalCommissions: u._count.commissions,
        totalTransactions: u._count.transactions,
        binaryChildren: u._count.binaryChildren,
        activeStakes: activeStakesMap.get(u.id)?.count ?? 0,
        activeStakesAmount: activeStakesMap.get(u.id)?.totalAmount ?? 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
