import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateUnilevelSchema = z.object({
  level: z.number().int().min(1).max(5, "Level must be 1-5"),
  percentage: z.number().min(0).max(100, "Percentage must be 0-100"),
  isActive: z.boolean().optional(),
});

const updateBinarySchema = z.object({
  percentage: z.number().min(0).max(100, "Percentage must be 0-100").optional(),
  dailyCap: z.number().min(0, "Daily cap must be non-negative").optional(),
  flushOutThreshold: z.number().min(0, "Flush threshold must be non-negative").optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const unilevelConfigs = await db.unilevelConfig.findMany({
      orderBy: { level: "asc" },
    });

    const binaryConfigs = await db.binaryConfig.findMany();

    return NextResponse.json({
      unilevel: unilevelConfigs,
      binary: binaryConfigs,
    });
  } catch (error) {
    console.error("Get MLM config error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MLM config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const configType = body.configType; // "unilevel" or "binary"

    if (configType === "unilevel") {
      const parsed = updateUnilevelSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { level, percentage, isActive } = parsed.data;

      // Upsert the unilevel config for the given level
      const config = await db.unilevelConfig.upsert({
        where: { level },
        update: {
          percentage,
          ...(isActive !== undefined ? { isActive } : {}),
        },
        create: {
          level,
          percentage,
          isActive: isActive ?? true,
        },
      });

      return NextResponse.json({
        message: `Unilevel level ${level} config updated successfully`,
        config,
      });
    } else if (configType === "binary") {
      const parsed = updateBinarySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { percentage, dailyCap, flushOutThreshold, isActive } = parsed.data;

      // Get the first binary config or create one
      const existingConfig = await db.binaryConfig.findFirst();

      let config;
      if (existingConfig) {
        config = await db.binaryConfig.update({
          where: { id: existingConfig.id },
          data: {
            ...(percentage !== undefined ? { percentage } : {}),
            ...(dailyCap !== undefined ? { dailyCap } : {}),
            ...(flushOutThreshold !== undefined ? { flushOutThreshold } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
          },
        });
      } else {
        config = await db.binaryConfig.create({
          data: {
            percentage: percentage ?? 10,
            dailyCap: dailyCap ?? 1000,
            flushOutThreshold: flushOutThreshold ?? 10000,
            isActive: isActive ?? true,
          },
        });
      }

      return NextResponse.json({
        message: "Binary config updated successfully",
        config,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid configType. Must be 'unilevel' or 'binary'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Update MLM config error:", error);
    return NextResponse.json(
      { error: "Failed to update MLM config" },
      { status: 500 }
    );
  }
}
