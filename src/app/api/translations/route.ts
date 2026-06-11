import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/translations?locale=en&category=general - Get translations by locale
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";
    const category = searchParams.get("category");

    const validLocales = ["en", "es", "pt"];
    if (!validLocales.includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale. Use: en, es, or pt" },
        { status: 400 }
      );
    }

    const where: { locale: string; category?: string } = { locale };
    if (category) {
      where.category = category;
    }

    const translations = await db.translation.findMany({ where });

    // Convert to key-value map for easy lookup
    const translationsMap: Record<string, string> = {};
    const categories: Record<string, Record<string, string>> = {};

    translations.forEach((t) => {
      translationsMap[t.key] = t.value;
      if (!categories[t.category]) {
        categories[t.category] = {};
      }
      categories[t.category][t.key] = t.value;
    });

    return NextResponse.json({
      locale,
      translations: translationsMap,
      categories,
      count: translations.length,
    });
  } catch (error) {
    console.error("Translations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch translations" },
      { status: 500 }
    );
  }
}

// PUT /api/translations - Update a translation (admin only)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, locale, value, adminWallet } = body;

    if (!key || !locale || !value) {
      return NextResponse.json(
        { error: "Key, locale, and value are required" },
        { status: 400 }
      );
    }

    // Admin check
    if (adminWallet) {
      const admin = await db.user.findFirst({
        where: { walletAddress: adminWallet, isAdmin: true },
      });
      if (!admin) {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }
    }

    const validLocales = ["en", "es", "pt"];
    if (!validLocales.includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale. Use: en, es, or pt" },
        { status: 400 }
      );
    }

    // Try to update existing translation
    const existing = await db.translation.findUnique({
      where: { key_locale: { key, locale } },
    });

    let translation;
    if (existing) {
      translation = await db.translation.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      translation = await db.translation.create({
        data: { key, locale, value, category: "general" },
      });
    }

    return NextResponse.json({
      message: "Translation updated successfully",
      translation,
    });
  } catch (error) {
    console.error("Translations PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update translation" },
      { status: 500 }
    );
  }
}
