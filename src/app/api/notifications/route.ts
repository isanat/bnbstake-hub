import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/notifications - Get all notification templates
export async function GET() {
  try {
    const templates = await db.notificationTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification templates" },
      { status: 500 }
    );
  }
}
