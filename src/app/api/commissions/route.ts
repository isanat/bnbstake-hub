import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateTxHash } from "@/lib/blockchain";
import { z } from "zod";

const claimCommissionsSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
});

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");
    const type = request.nextUrl.searchParams.get("type"); // "unilevel" | "binary"
    const status = request.nextUrl.searchParams.get("status"); // "pending" | "distributed" | "flushed"
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build filter
    const where: Record<string, unknown> = { userId: user.id };
    if (type) where.type = type;
    if (status) where.status = status;

    // Get commissions with pagination
    const commissions = await db.commission.findMany({
      where,
      include: {
        fromUser: {
          select: {
            walletAddress: true,
            referralCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.commission.count({ where });

    // Get summary totals
    const summaryRaw = await db.commission.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
      _count: true,
    });

    const pendingRaw = await db.commission.aggregate({
      where: { userId: user.id, status: "pending" },
      _sum: { amount: true },
      _count: true,
    });

    const distributedRaw = await db.commission.aggregate({
      where: { userId: user.id, status: "distributed" },
      _sum: { amount: true },
      _count: true,
    });

    const flushedRaw = await db.commission.aggregate({
      where: { userId: user.id, status: "flushed" },
      _sum: { amount: true },
      _count: true,
    });

    const unilevelRaw = await db.commission.aggregate({
      where: { userId: user.id, type: "unilevel" },
      _sum: { amount: true },
      _count: true,
    });

    const binaryRaw = await db.commission.aggregate({
      where: { userId: user.id, type: "binary" },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      commissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total: {
          amount: summaryRaw._sum.amount ?? 0,
          count: summaryRaw._count,
        },
        pending: {
          amount: pendingRaw._sum.amount ?? 0,
          count: pendingRaw._count,
        },
        distributed: {
          amount: distributedRaw._sum.amount ?? 0,
          count: distributedRaw._count,
        },
        flushed: {
          amount: flushedRaw._sum.amount ?? 0,
          count: flushedRaw._count,
        },
        unilevel: {
          amount: unilevelRaw._sum.amount ?? 0,
          count: unilevelRaw._count,
        },
        binary: {
          amount: binaryRaw._sum.amount ?? 0,
          count: binaryRaw._count,
        },
      },
    });
  } catch (error) {
    console.error("Get commissions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch commissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = claimCommissionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { walletAddress } = parsed.data;

    const user = await db.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get all pending commissions
    const pendingCommissions = await db.commission.findMany({
      where: {
        userId: user.id,
        status: "pending",
      },
    });

    if (pendingCommissions.length === 0) {
      return NextResponse.json(
        { error: "No pending commissions to claim" },
        { status: 400 }
      );
    }

    const totalAmount = pendingCommissions.reduce(
      (sum, c) => sum + c.amount,
      0
    );
    const roundedTotal = Math.round(totalAmount * 1e8) / 1e8;
    const txHash = generateTxHash();

    // Update all pending commissions to "distributed"
    await db.commission.updateMany({
      where: {
        userId: user.id,
        status: "pending",
      },
      data: { status: "distributed" },
    });

    // Update user's totalWithdrawn
    await db.user.update({
      where: { id: user.id },
      data: {
        totalWithdrawn: { increment: roundedTotal },
      },
    });

    // Create transaction for claimed commissions
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "commission_claim",
        amount: roundedTotal,
        status: "completed",
        txHash,
        description: `Claimed ${pendingCommissions.length} pending commissions`,
      },
    });

    return NextResponse.json({
      message: "Commissions claimed successfully",
      claimedAmount: roundedTotal,
      commissionsCount: pendingCommissions.length,
      txHash,
    });
  } catch (error) {
    console.error("Claim commissions error:", error);
    return NextResponse.json(
      { error: "Failed to claim commissions" },
      { status: 500 }
    );
  }
}
