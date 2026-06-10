import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateTxHash, calculateRewards } from "@/lib/blockchain";
import {
  distributeUnilevelCommissions,
  updateBinaryVolumes,
} from "@/lib/commissions";
import { z } from "zod";

const createStakeSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
  planId: z.string().min(1, "Plan ID is required"),
  amount: z.number().positive("Amount must be positive"),
});

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

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

    // Get available staking plans
    const plans = await db.stakingPlan.findMany({
      where: { isActive: true },
      orderBy: { apy: "asc" },
    });

    // Get user's stakes with plan details
    const stakes = await db.stake.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    // Calculate pending rewards for active stakes
    const stakesWithRewards = stakes.map((stake) => {
      let pendingRewards = 0;
      if (stake.status === "active") {
        pendingRewards = calculateRewards(stake);
      }
      return {
        ...stake,
        pendingRewards,
      };
    });

    const activeStakes = stakes.filter((s) => s.status === "active");
    const totalStaked = activeStakes.reduce((sum, s) => sum + s.amount, 0);
    const totalPendingRewards = stakesWithRewards
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.pendingRewards, 0);

    return NextResponse.json({
      plans,
      stakes: stakesWithRewards,
      summary: {
        totalStaked: Math.round(totalStaked * 100) / 100,
        totalPendingRewards: Math.round(totalPendingRewards * 1e8) / 1e8,
        activeStakesCount: activeStakes.length,
        totalStakesCount: stakes.length,
      },
    });
  } catch (error) {
    console.error("Get staking data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staking data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createStakeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { walletAddress, planId, amount } = parsed.data;

    // Verify user exists
    const user = await db.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify plan exists and is active
    const plan = await db.stakingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Staking plan not found" },
        { status: 404 }
      );
    }

    if (!plan.isActive) {
      return NextResponse.json(
        { error: "Staking plan is not active" },
        { status: 400 }
      );
    }

    // Validate amount against plan limits
    if (amount < plan.minAmount) {
      return NextResponse.json(
        { error: `Minimum amount for ${plan.name} is ${plan.minAmount}` },
        { status: 400 }
      );
    }

    if (amount > plan.maxAmount) {
      return NextResponse.json(
        { error: `Maximum amount for ${plan.name} is ${plan.maxAmount}` },
        { status: 400 }
      );
    }

    // Create stake
    const now = new Date();
    const endDate = new Date(
      now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
    );
    const txHash = generateTxHash();

    const stake = await db.stake.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amount,
        startDate: now,
        endDate,
        status: "active",
      },
      include: { plan: true },
    });

    // Update user's totalStaked and isActive
    await db.user.update({
      where: { id: user.id },
      data: {
        totalStaked: { increment: amount },
        isActive: true,
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        userId: user.id,
        stakeId: stake.id,
        type: "stake",
        amount,
        status: "completed",
        txHash,
        description: `Staked ${amount} USD in ${plan.name} plan`,
      },
    });

    // Distribute unilevel commissions up the referral chain
    await distributeUnilevelCommissions(user.id, amount);

    // Update binary volumes up the tree
    await updateBinaryVolumes(user.id, amount);

    return NextResponse.json(
      {
        message: "Stake created successfully",
        stake: {
          id: stake.id,
          amount: stake.amount,
          plan: stake.plan.name,
          startDate: stake.startDate,
          endDate: stake.endDate,
          status: stake.status,
          txHash,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create stake error:", error);
    return NextResponse.json(
      { error: "Failed to create stake" },
      { status: 500 }
    );
  }
}
