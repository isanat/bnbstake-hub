import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  durationDays: z.number().int().positive("Duration must be positive"),
  apy: z.number().positive("APY must be positive"),
  minAmount: z.number().positive("Min amount must be positive"),
  maxAmount: z.number().positive("Max amount must be positive"),
  earlyWithdrawPenalty: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updatePlanSchema = z.object({
  id: z.string().min(1, "Plan ID is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  apy: z.number().positive().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  earlyWithdrawPenalty: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const plans = await db.stakingPlan.findMany({
      orderBy: { apy: "asc" },
      include: {
        _count: { select: { stakes: true } },
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      durationDays,
      apy,
      minAmount,
      maxAmount,
      earlyWithdrawPenalty,
      isActive,
    } = parsed.data;

    // Validate min < max
    if (minAmount >= maxAmount) {
      return NextResponse.json(
        { error: "Min amount must be less than max amount" },
        { status: 400 }
      );
    }

    const plan = await db.stakingPlan.create({
      data: {
        name,
        description: description ?? "",
        durationDays,
        apy,
        minAmount,
        maxAmount,
        earlyWithdrawPenalty: earlyWithdrawPenalty ?? 10,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        message: "Staking plan created successfully",
        plan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateFields } = parsed.data;

    // Check if plan exists
    const existingPlan = await db.stakingPlan.findUnique({ where: { id } });
    if (!existingPlan) {
      return NextResponse.json(
        { error: "Staking plan not found" },
        { status: 404 }
      );
    }

    // Validate min < max if both are provided
    const minAmount = updateFields.minAmount ?? existingPlan.minAmount;
    const maxAmount = updateFields.maxAmount ?? existingPlan.maxAmount;
    if (minAmount >= maxAmount) {
      return NextResponse.json(
        { error: "Min amount must be less than max amount" },
        { status: 400 }
      );
    }

    const plan = await db.stakingPlan.update({
      where: { id },
      data: updateFields,
    });

    return NextResponse.json({
      message: "Staking plan updated successfully",
      plan,
    });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
