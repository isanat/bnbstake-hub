import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/plans - Get all active staking plans (no auth required)
export async function GET() {
  try {
    const plans = await db.stakingPlan.findMany({
      where: { isActive: true },
      orderBy: { apy: "asc" },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Plans GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
