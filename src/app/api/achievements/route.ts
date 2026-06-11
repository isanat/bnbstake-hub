import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/achievements?wallet=0x... - Get all achievements for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    // Get all active achievements
    const achievements = await db.achievement.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    if (!wallet) {
      // Return just the achievement definitions if no wallet provided
      return NextResponse.json({
        achievements: achievements.map((a) => ({
          ...a,
          condition: JSON.parse(a.condition),
          reward: JSON.parse(a.reward),
        })),
        userAchievements: [],
        xp: 0,
        level: 1,
      });
    }

    // Find the user by wallet address
    const user = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({
        achievements: achievements.map((a) => ({
          ...a,
          condition: JSON.parse(a.condition),
          reward: JSON.parse(a.reward),
        })),
        userAchievements: [],
        xp: 0,
        level: 1,
      });
    }

    // Get user's unlocked achievements
    const userAchievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
    });

    // Calculate progress for each achievement
    const stakeCount = await db.stake.count({
      where: { userId: user.id },
    });

    const achievementsWithProgress = achievements.map((a) => {
      const condition = JSON.parse(a.condition);
      const reward = JSON.parse(a.reward);
      const userAch = userAchievements.find((ua) => ua.achievementId === a.id);

      // Calculate progress based on condition type
      let progress = 0;
      let current = 0;
      let target = condition.value || 0;

      switch (condition.type) {
        case "stake_count":
          current = stakeCount;
          target = Number(condition.value);
          progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          break;
        case "total_staked":
          current = user.totalStaked;
          target = Number(condition.value);
          progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          break;
        case "total_earned":
          current = user.totalEarned;
          target = Number(condition.value);
          progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          break;
        case "referral_count":
          current = userAchievements.length > 0 ? 0 : 0; // Would need referral count query
          // Count referrals
          progress = 0;
          break;
        case "stake_duration":
          progress = 0; // Would need to check longest active stake
          break;
        case "special":
          progress = condition.value === "early" ? 100 : 0;
          break;
        default:
          progress = 0;
      }

      return {
        ...a,
        condition,
        reward,
        unlocked: !!userAch,
        claimed: userAch?.claimed || false,
        claimedAt: userAch?.claimedAt || null,
        unlockedAt: userAch?.unlockedAt || null,
        progress: Math.round(progress),
        currentValue: current,
        targetValue: target,
      };
    });

    // Also get referral count for progress
    const referralCount = await db.user.count({
      where: { referrerId: user.id, isActive: true },
    });

    // Update referral-based achievements with real count
    const finalAchievements = achievementsWithProgress.map((a) => {
      if (a.condition.type === "referral_count") {
        const target = Number(a.condition.value);
        const progress = target > 0 ? Math.min((referralCount / target) * 100, 100) : 0;
        return { ...a, currentValue: referralCount, progress: Math.round(progress) };
      }
      return a;
    });

    // Calculate level from XP
    // Level formula: level = floor(xp / 100) + 1
    const xpForNextLevel = (user.level) * 100;
    const xpProgress = user.xp / xpForNextLevel * 100;

    return NextResponse.json({
      achievements: finalAchievements,
      userAchievements: userAchievements.map((ua) => ({
        id: ua.id,
        achievementId: ua.achievementId,
        unlockedAt: ua.unlockedAt,
        claimed: ua.claimed,
        claimedAt: ua.claimedAt,
      })),
      xp: user.xp,
      level: user.level,
      xpForNextLevel,
      xpProgress: Math.round(xpProgress),
      unlockedCount: userAchievements.length,
      totalCount: achievements.length,
    });
  } catch (error) {
    console.error("Achievements GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

// POST /api/achievements - Claim an achievement reward
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wallet, achievementId } = body;

    if (!wallet || !achievementId) {
      return NextResponse.json(
        { error: "Wallet address and achievement ID are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the user achievement
    const userAchievement = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId,
        },
      },
      include: { achievement: true },
    });

    if (!userAchievement) {
      return NextResponse.json(
        { error: "Achievement not unlocked yet" },
        { status: 400 }
      );
    }

    if (userAchievement.claimed) {
      return NextResponse.json(
        { error: "Reward already claimed" },
        { status: 400 }
      );
    }

    // Claim the reward
    const updated = await db.userAchievement.update({
      where: { id: userAchievement.id },
      data: {
        claimed: true,
        claimedAt: new Date(),
      },
    });

    // Add XP to user
    await db.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: userAchievement.achievement.xpReward },
      },
    });

    // Recalculate level
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (updatedUser) {
      const newLevel = Math.floor(updatedUser.xp / 100) + 1;
      if (newLevel !== updatedUser.level) {
        await db.user.update({
          where: { id: user.id },
          data: { level: newLevel },
        });
      }
    }

    return NextResponse.json({
      message: "Reward claimed successfully",
      reward: JSON.parse(userAchievement.achievement.reward),
      xpEarned: userAchievement.achievement.xpReward,
    });
  } catch (error) {
    console.error("Achievements POST error:", error);
    return NextResponse.json(
      { error: "Failed to claim achievement reward" },
      { status: 500 }
    );
  }
}
