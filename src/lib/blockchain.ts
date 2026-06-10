/**
 * Generate a simulated transaction hash (0x + 64 hex chars)
 */
export function generateTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

/**
 * Generate an 8-character alphanumeric referral code
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a simulated wallet address (0x + 40 hex chars)
 */
export function generateWalletAddress(): string {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return addr;
}

/**
 * Calculate pending rewards for a stake based on APY and time elapsed
 * Rewards = amount * (apy / 100) * (daysElapsed / 365)
 */
export function calculateRewards(stake: {
  amount: number;
  startDate: Date;
  rewardsClaimed: number;
  plan: { apy: number; durationDays: number };
}): number {
  const now = new Date();
  const start = new Date(stake.startDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.max(0, (now.getTime() - start.getTime()) / msPerDay);
  const cappedDays = Math.min(daysElapsed, stake.plan.durationDays);

  const totalRewards = stake.amount * (stake.plan.apy / 100) * (cappedDays / 365);
  const pendingRewards = Math.max(0, totalRewards - stake.rewardsClaimed);

  return Math.round(pendingRewards * 1e8) / 1e8;
}
