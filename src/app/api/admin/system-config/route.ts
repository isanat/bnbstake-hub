import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// GET /api/admin/system-config - Get all SystemConfig entries (admin only)
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const configs = await db.systemConfig.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("Get system config error:", error);
    return NextResponse.json(
      { error: "Failed to fetch system config" },
      { status: 500 }
    );
  }
}

const upsertConfigSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
});

// PUT /api/admin/system-config - Upsert a SystemConfig entry (admin only)
export async function PUT(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = upsertConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { key, value, description } = parsed.data;

    const config = await db.systemConfig.upsert({
      where: { key },
      update: { value, description: description ?? undefined },
      create: {
        key,
        value,
        description: description ?? "",
      },
    });

    return NextResponse.json({
      message: "System config updated successfully",
      config,
    });
  } catch (error) {
    console.error("Update system config error:", error);
    return NextResponse.json(
      { error: "Failed to update system config" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/system-config - Delete a SystemConfig entry (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await db.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    await db.systemConfig.delete({ where: { key } });

    return NextResponse.json({
      message: "System config deleted successfully",
    });
  } catch (error) {
    console.error("Delete system config error:", error);
    return NextResponse.json(
      { error: "Failed to delete system config" },
      { status: 500 }
    );
  }
}
