import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateTxHash, calculateRewards } from "@/lib/blockchain";
import { z } from "zod";

const claimSchema = z.object({
  stakeId: z.string().min(1, "Stake ID is required"),
  walletAddress: z.string().min(1, "Wallet address is required"),
});

const withdrawSchema = z.object({
  stakeId: z.string().min(1, "Stake ID is required"),
  walletAddress: z.string().min(1, "Wallet address is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  if (action === "claim") {
    return handleClaim(request);
  } else if (action === "withdraw") {
    return handleWithdraw(request);
  } else {
    return NextResponse.json(
      { error: `Unknown action: ${action}. Valid actions: claim, withdraw` },
      { status: 400 }
    );
  }
}

async function handleClaim(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = claimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { stakeId, walletAddress } = parsed.data;

    // Verify user
    const user = await db.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify stake belongs to user and is active
    const stake = await db.stake.findUnique({
      where: { id: stakeId },
      include: { plan: true },
    });

    if (!stake) {
      return NextResponse.json(
        { error: "Stake not found" },
        { status: 404 }
      );
    }

    if (stake.userId !== user.id) {
      return NextResponse.json(
        { error: "Stake does not belong to this user" },
        { status: 403 }
      );
    }

    if (stake.status !== "active") {
      return NextResponse.json(
        { error: "Only active stakes can claim rewards" },
        { status: 400 }
      );
    }

    // Calculate pending rewards
    const pendingRewards = calculateRewards(stake);

    if (pendingRewards <= 0) {
      return NextResponse.json(
        { error: "No pending rewards to claim" },
        { status: 400 }
      );
    }

    const txHash = generateTxHash();

    // Update stake rewardsClaimed and rewardsEarned
    await db.stake.update({
      where: { id: stakeId },
      data: {
        rewardsClaimed: { increment: pendingRewards },
        rewardsEarned: { increment: pendingRewards },
      },
    });

    // Update user's totalEarned
    await db.user.update({
      where: { id: user.id },
      data: {
        totalEarned: { increment: pendingRewards },
      },
    });

    // Create transaction
    await db.transaction.create({
      data: {
        userId: user.id,
        stakeId: stake.id,
        type: "claim",
        amount: pendingRewards,
        status: "completed",
        txHash,
        description: `Claimed rewards from ${stake.plan.name} staking plan`,
      },
    });

    return NextResponse.json({
      message: "Rewards claimed successfully",
      claimedAmount: pendingRewards,
      txHash,
    });
  } catch (error) {
    console.error("Claim rewards error:", error);
    return NextResponse.json(
      { error: "Failed to claim rewards" },
      { status: 500 }
    );
  }
}

async function handleWithdraw(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = withdrawSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { stakeId, walletAddress } = parsed.data;

    // Verify user
    const user = await db.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify stake belongs to user and is active
    const stake = await db.stake.findUnique({
      where: { id: stakeId },
      include: { plan: true },
    });

    if (!stake) {
      return NextResponse.json(
        { error: "Stake not found" },
        { status: 404 }
      );
    }

    if (stake.userId !== user.id) {
      return NextResponse.json(
        { error: "Stake does not belong to this user" },
        { status: 403 }
      );
    }

    if (stake.status !== "active") {
      return NextResponse.json(
        { error: "Only active stakes can be withdrawn" },
        { status: 400 }
      );
    }

    const now = new Date();
    const isEarlyWithdrawal = now < stake.endDate;
    let penaltyRate = 0;
    let penaltyAmount = 0;
    let withdrawnAmount = stake.amount;

    if (isEarlyWithdrawal) {
      penaltyRate = stake.plan.earlyWithdrawPenalty;
      penaltyAmount = stake.amount * (penaltyRate / 100);
      withdrawnAmount = stake.amount - penaltyAmount;
    }

    // Calculate and include any unclaimed rewards
    const pendingRewards = calculateRewards(stake);

    const txHash = generateTxHash();

    // Update stake status
    await db.stake.update({
      where: { id: stakeId },
      data: {
        status: isEarlyWithdrawal ? "penalized" : "withdrawn",
        rewardsEarned: { increment: pendingRewards },
        rewardsClaimed: { increment: pendingRewards },
      },
    });

    // Update user totals
    await db.user.update({
      where: { id: user.id },
      data: {
        totalStaked: { decrement: stake.amount },
        totalWithdrawn: { increment: withdrawnAmount },
        totalEarned: { increment: pendingRewards },
      },
    });

    // Create transaction for withdrawal
    await db.transaction.create({
      data: {
        userId: user.id,
        stakeId: stake.id,
        type: "withdraw",
        amount: withdrawnAmount,
        status: "completed",
        txHash,
        description: isEarlyWithdrawal
          ? `Early withdrawal from ${stake.plan.name}. Penalty: ${penaltyRate}% (${penaltyAmount} USD)`
          : `Matured withdrawal from ${stake.plan.name}`,
      },
    });

    // Create transaction for penalty if applicable
    if (isEarlyWithdrawal && penaltyAmount > 0) {
      await db.transaction.create({
        data: {
          userId: user.id,
          stakeId: stake.id,
          type: "penalty",
          amount: penaltyAmount,
          status: "completed",
          description: `Early withdrawal penalty: ${penaltyRate}%`,
        },
      });
    }

    // Create transaction for claimed rewards if any
    if (pendingRewards > 0) {
      await db.transaction.create({
        data: {
          userId: user.id,
          stakeId: stake.id,
          type: "claim",
          amount: pendingRewards,
          status: "completed",
          description: `Claimed remaining rewards from ${stake.plan.name}`,
        },
      });
    }

    return NextResponse.json({
      message: isEarlyWithdrawal
        ? "Stake withdrawn with early withdrawal penalty"
        : "Stake withdrawn successfully",
      withdrawnAmount: Math.round(withdrawnAmount * 1e8) / 1e8,
      penaltyAmount: Math.round(penaltyAmount * 1e8) / 1e8,
      penaltyRate,
      claimedRewards: pendingRewards,
      isEarlyWithdrawal,
      txHash,
    });
  } catch (error) {
    console.error("Withdraw stake error:", error);
    return NextResponse.json(
      { error: "Failed to withdraw stake" },
      { status: 500 }
    );
  }
}
