import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReferralCode } from "@/lib/blockchain";

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        stakes: {
          where: { status: "active" },
          select: { id: true, amount: true, status: true },
        },
        _count: {
          select: { referrals: true, commissions: true, transactions: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Simple network size count (non-recursive for safety)
    const directReferrals = await db.user.count({
      where: { referrerId: user.id },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        referralCode: user.referralCode,
        referrerId: user.referrerId,
        binaryParentId: user.binaryParentId,
        binarySide: user.binarySide,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        totalStaked: user.totalStaked,
        totalEarned: user.totalEarned,
        totalWithdrawn: user.totalWithdrawn,
        leftVolume: user.leftVolume,
        rightVolume: user.rightVolume,
        createdAt: user.createdAt,
      },
      stats: {
        activeStakes: user.stakes.length,
        totalStakedInActiveStakes: user.stakes.reduce((sum, s) => sum + s.amount, 0),
        networkSize: directReferrals,
        directReferrals: user._count.referrals,
        totalCommissions: user._count.commissions,
        totalTransactions: user._count.transactions,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const { walletAddress, referralCode, binaryParentId, binarySide } = body;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { walletAddress },
    });

    if (existingUser) {
      return NextResponse.json({
        message: "User already exists",
        user: existingUser,
      });
    }

    // Validate referral code if provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await db.user.findUnique({
        where: { referralCode },
      });
      if (!referrer) {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 400 }
        );
      }
      referrerId = referrer.id;
    }

    // Validate binary parent if provided
    if (binaryParentId) {
      const binaryParent = await db.user.findUnique({
        where: { id: binaryParentId },
      });
      if (!binaryParent) {
        return NextResponse.json(
          { error: "Invalid binary parent ID" },
          { status: 400 }
        );
      }

      // Check if the side is already taken
      if (binarySide) {
        const existingChild = await db.user.findFirst({
          where: { binaryParentId, binarySide },
        });
        if (existingChild) {
          return NextResponse.json(
            { error: `Binary ${binarySide} side is already occupied` },
            { status: 400 }
          );
        }
      }
    }

    // Generate unique referral code
    let newReferralCode = generateReferralCode();
    let codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    while (codeExists) {
      newReferralCode = generateReferralCode();
      codeExists = await db.user.findUnique({ where: { referralCode: newReferralCode } });
    }

    // Create the user
    const newUser = await db.user.create({
      data: {
        walletAddress,
        referralCode: newReferralCode,
        referrerId: referrerId || undefined,
        binaryParentId: binaryParentId || undefined,
        binarySide: binarySide || undefined,
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register user error:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
