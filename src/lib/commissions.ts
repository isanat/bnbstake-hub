import { db } from "./db";

/**
 * Walk up the unilevel (referral) chain and create commission records.
 * Up to 5 levels deep.
 */
export async function distributeUnilevelCommissions(
  userId: string,
  amount: number
): Promise<void> {
  // Get the unilevel configs
  const unilevelConfigs = await db.unilevelConfig.findMany({
    where: { isActive: true },
    orderBy: { level: "asc" },
  });

  if (unilevelConfigs.length === 0) return;

  // Walk up the referral chain
  let currentUserId = userId;
  let level = 1;

  while (level <= 5) {
    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { referrerId: true },
    });

    if (!currentUser || !currentUser.referrerId) break;

    const config = unilevelConfigs.find((c) => c.level === level);
    if (!config || !config.isActive) {
      level++;
      currentUserId = currentUser.referrerId;
      continue;
    }

    const commissionAmount = amount * (config.percentage / 100);
    const roundedAmount = Math.round(commissionAmount * 1e8) / 1e8;

    if (roundedAmount > 0) {
      await db.commission.create({
        data: {
          userId: currentUser.referrerId,
          fromUserId: userId,
          amount: roundedAmount,
          type: "unilevel",
          level: config.level,
          status: "pending",
          description: `Level ${config.level} unilevel commission from staking`,
        },
      });

      // Update referrer's totalEarned
      await db.user.update({
        where: { id: currentUser.referrerId },
        data: { totalEarned: { increment: roundedAmount } },
      });
    }

    currentUserId = currentUser.referrerId;
    level++;
  }
}

/**
 * Walk up the binary tree and update left/right volumes for each ancestor.
 */
export async function updateBinaryVolumes(
  userId: string,
  amount: number
): Promise<void> {
  let currentId: string | null = userId;

  while (currentId) {
    const user = await db.user.findUnique({
      where: { id: currentId },
      select: { binaryParentId: true, binarySide: true },
    });

    if (!user || !user.binaryParentId) break;

    // The user's binarySide tells us which side of the parent they are on
    const side = user.binarySide?.toLowerCase();
    if (side === "left") {
      await db.user.update({
        where: { id: user.binaryParentId },
        data: { leftVolume: { increment: amount } },
      });
    } else if (side === "right") {
      await db.user.update({
        where: { id: user.binaryParentId },
        data: { rightVolume: { increment: amount } },
      });
    }

    currentId = user.binaryParentId;
  }
}
