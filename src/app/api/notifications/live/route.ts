import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper: Generate a random masked wallet address
function randomWallet(): string {
  const hex = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += hex[Math.floor(Math.random() * hex.length)];
  }
  return addr;
}

function maskWallet(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Helper: Random amount within a range
function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Helper: Random timestamp within the last hour
function randomTimestamp(): Date {
  const now = Date.now();
  const offset = Math.floor(Math.random() * 60 * 60 * 1000); // up to 1 hour ago
  return new Date(now - offset);
}

// GET /api/notifications/live - Simulated live transaction feed
export async function GET() {
  try {
    const types = ["stake", "commission", "referral", "withdraw"];

    // Try to get real templates from database for messages
    let templates: { type: string; messageEn: string }[] = [];
    try {
      templates = await db.notificationTemplate.findMany({
        where: { isActive: true },
        select: { type: true, messageEn: true },
      });
    } catch {
      // Templates might not exist yet, use defaults
    }

    const templateMap: Record<string, string> = {};
    templates.forEach((t) => {
      templateMap[t.type] = t.messageEn;
    });

    // Default messages if no templates
    const defaultMessages: Record<string, (amount: number) => string> = {
      stake: (amt) => `just deposited ${amt} USDT`,
      commission: (amt) => `earned ${amt} USDT commission`,
      referral: () => `joined the platform via referral`,
      withdraw: (amt) => `withdrew ${amt} USDT successfully`,
    };

    const amountRanges: Record<string, [number, number]> = {
      stake: [100, 50000],
      commission: [5, 5000],
      referral: [0, 0],
      withdraw: [50, 25000],
    };

    // Generate 10-15 random mock transactions
    const count = Math.floor(Math.random() * 6) + 10; // 10-15
    const transactions = [];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const wallet = randomWallet();
      const [minAmt, maxAmt] = amountRanges[type];
      const amount = type === "referral" ? 0 : randomAmount(minAmt, maxAmt);

      const template = templateMap[type];
      let message: string;
      if (template) {
        message = template.replace("{amount}", amount.toLocaleString());
      } else {
        message = defaultMessages[type](amount);
      }

      transactions.push({
        id: `live_${i}_${Date.now()}`,
        type,
        wallet: maskWallet(wallet),
        fullWallet: wallet,
        amount: type === "referral" ? undefined : amount,
        message: `${maskWallet(wallet)} ${message}`,
        timestamp: randomTimestamp(),
      });
    }

    // Sort by timestamp descending (most recent first)
    transactions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return NextResponse.json({
      transactions,
      count: transactions.length,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Notifications Live GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate live feed" },
      { status: 500 }
    );
  }
}
