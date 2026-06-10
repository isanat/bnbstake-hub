import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateWalletAddress, generateReferralCode } from "@/lib/blockchain";

export async function GET() {
  try {
    // Check if already seeded
    const existingAdmin = await db.user.findFirst({
      where: { walletAddress: "0xAdmin0000000000000000000000000000000001" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { message: "Database already seeded", adminId: existingAdmin.id },
        { status: 200 }
      );
    }

    // 1. Create admin user
    const admin = await db.user.create({
      data: {
        walletAddress: "0xAdmin0000000000000000000000000000000001",
        referralCode: "ADMIN01",
        isAdmin: true,
        isActive: true,
      },
    });

    // 2. Create 5 demo users with binary tree placement
    const demoUsers = [];
    const wallet1 = generateWalletAddress();
    const user1 = await db.user.create({
      data: {
        walletAddress: wallet1,
        referralCode: generateReferralCode(),
        referrerId: admin.id,
        binaryParentId: admin.id,
        binarySide: "left",
        isActive: true,
        totalStaked: 1000,
        leftVolume: 500,
        rightVolume: 300,
      },
    });
    demoUsers.push(user1);

    const wallet2 = generateWalletAddress();
    const user2 = await db.user.create({
      data: {
        walletAddress: wallet2,
        referralCode: generateReferralCode(),
        referrerId: admin.id,
        binaryParentId: admin.id,
        binarySide: "right",
        isActive: true,
        totalStaked: 2000,
        leftVolume: 200,
        rightVolume: 800,
      },
    });
    demoUsers.push(user2);

    const wallet3 = generateWalletAddress();
    const user3 = await db.user.create({
      data: {
        walletAddress: wallet3,
        referralCode: generateReferralCode(),
        referrerId: user1.id,
        binaryParentId: user1.id,
        binarySide: "left",
        isActive: true,
        totalStaked: 500,
      },
    });
    demoUsers.push(user3);

    const wallet4 = generateWalletAddress();
    const user4 = await db.user.create({
      data: {
        walletAddress: wallet4,
        referralCode: generateReferralCode(),
        referrerId: user1.id,
        binaryParentId: user1.id,
        binarySide: "right",
        isActive: true,
        totalStaked: 1500,
      },
    });
    demoUsers.push(user4);

    const wallet5 = generateWalletAddress();
    const user5 = await db.user.create({
      data: {
        walletAddress: wallet5,
        referralCode: generateReferralCode(),
        referrerId: user2.id,
        binaryParentId: user2.id,
        binarySide: "left",
        isActive: true,
        totalStaked: 3000,
      },
    });
    demoUsers.push(user5);

    // 3. Create staking plans
    const flexPlan = await db.stakingPlan.create({
      data: {
        name: "Flex Staking",
        description: "Flexible staking with moderate returns. Withdraw anytime with a small penalty.",
        durationDays: 30,
        apy: 12,
        minAmount: 100,
        maxAmount: 10000,
        isActive: true,
        earlyWithdrawPenalty: 5,
      },
    });

    const proPlan = await db.stakingPlan.create({
      data: {
        name: "Pro Staking",
        description: "Professional staking with higher returns and longer lock period.",
        durationDays: 90,
        apy: 18,
        minAmount: 1000,
        maxAmount: 50000,
        isActive: true,
        earlyWithdrawPenalty: 10,
      },
    });

    const elitePlan = await db.stakingPlan.create({
      data: {
        name: "Elite Staking",
        description: "Elite staking with the highest returns for serious investors.",
        durationDays: 180,
        apy: 25,
        minAmount: 5000,
        maxAmount: 200000,
        isActive: true,
        earlyWithdrawPenalty: 15,
      },
    });

    // 4. Create Unilevel configs for levels 1-5
    const unilevelConfigs = await Promise.all([
      db.unilevelConfig.create({
        data: { level: 1, percentage: 10, isActive: true },
      }),
      db.unilevelConfig.create({
        data: { level: 2, percentage: 5, isActive: true },
      }),
      db.unilevelConfig.create({
        data: { level: 3, percentage: 3, isActive: true },
      }),
      db.unilevelConfig.create({
        data: { level: 4, percentage: 2, isActive: true },
      }),
      db.unilevelConfig.create({
        data: { level: 5, percentage: 1, isActive: true },
      }),
    ]);

    // 5. Create Binary config
    const binaryConfig = await db.binaryConfig.create({
      data: {
        percentage: 10,
        dailyCap: 1000,
        flushOutThreshold: 10000,
        isActive: true,
      },
    });

    // 6. Create SystemConfig entries
    const systemConfigs = await Promise.all([
      db.systemConfig.create({
        data: {
          key: "platformFeePercentage",
          value: "2",
          description: "Platform fee percentage on withdrawals",
        },
      }),
      db.systemConfig.create({
        data: {
          key: "minWithdrawal",
          value: "50",
          description: "Minimum withdrawal amount in USD",
        },
      }),
      db.systemConfig.create({
        data: {
          key: "maxWithdrawal",
          value: "100000",
          description: "Maximum withdrawal amount in USD",
        },
      }),
      db.systemConfig.create({
        data: {
          key: "referralBonus",
          value: "50",
          description: "Bonus for referring a new active user",
        },
      }),
      db.systemConfig.create({
        data: {
          key: "systemStatus",
          value: "active",
          description: "System status: active, maintenance, paused",
        },
      }),
    ]);

    // Create some sample stakes for demo users
    const now = new Date();
    await Promise.all([
      db.stake.create({
        data: {
          userId: user1.id,
          planId: flexPlan.id,
          amount: 1000,
          startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          status: "active",
        },
      }),
      db.stake.create({
        data: {
          userId: user2.id,
          planId: proPlan.id,
          amount: 2000,
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          status: "active",
        },
      }),
      db.stake.create({
        data: {
          userId: user5.id,
          planId: elitePlan.id,
          amount: 5000,
          startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 170 * 24 * 60 * 60 * 1000),
          status: "active",
        },
      }),
    ]);

    // Create sample transactions
    await Promise.all([
      db.transaction.create({
        data: {
          userId: user1.id,
          type: "stake",
          amount: 1000,
          status: "completed",
          description: "Initial staking - Flex Staking",
        },
      }),
      db.transaction.create({
        data: {
          userId: user2.id,
          type: "stake",
          amount: 2000,
          status: "completed",
          description: "Initial staking - Pro Staking",
        },
      }),
      db.transaction.create({
        data: {
          userId: user5.id,
          type: "stake",
          amount: 5000,
          status: "completed",
          description: "Initial staking - Elite Staking",
        },
      }),
    ]);

    return NextResponse.json({
      message: "Database seeded successfully",
      summary: {
        admin: { id: admin.id, walletAddress: admin.walletAddress },
        demoUsers: demoUsers.map((u) => ({
          id: u.id,
          walletAddress: u.walletAddress,
          referralCode: u.referralCode,
        })),
        stakingPlans: [flexPlan.name, proPlan.name, elitePlan.name],
        unilevelConfigs: unilevelConfigs.length,
        binaryConfig: binaryConfig.id,
        systemConfigs: systemConfigs.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
