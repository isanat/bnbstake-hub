import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build unilevel tree iteratively (up to 5 levels)
    const unilevelTree = await buildUnilevelTreeIterative(user.id);

    // Build binary tree iteratively (up to 3 levels)
    const binaryTree = await buildBinaryTreeIterative(user.id);

    // Count direct referrals
    const directReferrals = await db.user.count({
      where: { referrerId: user.id },
    });

    // Count binary children
    const binaryChildren = await db.user.count({
      where: { binaryParentId: user.id },
    });

    // Get referrer info
    let referrer = null;
    if (user.referrerId) {
      const referrerUser = await db.user.findUnique({
        where: { id: user.referrerId },
        select: { id: true, walletAddress: true, referralCode: true },
      });
      referrer = referrerUser;
    }

    // Count total network size iteratively
    const totalNetworkSize = await countNetworkIterative(user.id);

    return NextResponse.json({
      referralLink: {
        referralCode: user.referralCode,
        walletAddress: user.walletAddress,
      },
      referrer,
      unilevelTree,
      binaryTree,
      stats: {
        directReferrals,
        binaryChildren,
        totalNetworkSize,
        leftVolume: user.leftVolume,
        rightVolume: user.rightVolume,
        weakerLeg: Math.min(user.leftVolume, user.rightVolume),
        strongerLeg: Math.max(user.leftVolume, user.rightVolume),
      },
    });
  } catch (error) {
    console.error("Get network error:", error);
    return NextResponse.json(
      { error: "Failed to fetch network data" },
      { status: 500 }
    );
  }
}

interface TreeNode {
  id: string;
  walletAddress: string;
  referralCode: string;
  totalStaked: number;
  isActive: boolean;
  level: number;
  children: TreeNode[];
}

interface BinaryTreeNode {
  id: string;
  walletAddress: string;
  referralCode: string;
  totalStaked: number;
  leftVolume: number;
  rightVolume: number;
  isActive: boolean;
  side: string | null;
  left: BinaryTreeNode | null;
  right: BinaryTreeNode | null;
}

async function buildUnilevelTreeIterative(rootId: string): Promise<TreeNode> {
  // Get root user
  const rootUser = await db.user.findUnique({
    where: { id: rootId },
    select: {
      id: true,
      walletAddress: true,
      referralCode: true,
      totalStaked: true,
      isActive: true,
    },
  });

  if (!rootUser) {
    return {
      id: rootId, walletAddress: "unknown", referralCode: "",
      totalStaked: 0, isActive: false, level: 0, children: [],
    };
  }

  const rootNode: TreeNode = {
    ...rootUser,
    level: 0,
    children: [],
  };

  // BFS approach
  const queue: { node: TreeNode; userId: string; level: number }[] = [
    { node: rootNode, userId: rootId, level: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.level >= 5) continue;

    const referrals = await db.user.findMany({
      where: { referrerId: current.userId },
      select: {
        id: true,
        walletAddress: true,
        referralCode: true,
        totalStaked: true,
        isActive: true,
      },
    });

    for (const referral of referrals) {
      const childNode: TreeNode = {
        ...referral,
        level: current.level + 1,
        children: [],
      };
      current.node.children.push(childNode);
      queue.push({ node: childNode, userId: referral.id, level: current.level + 1 });
    }
  }

  return rootNode;
}

async function buildBinaryTreeIterative(rootId: string): Promise<BinaryTreeNode> {
  const rootUser = await db.user.findUnique({
    where: { id: rootId },
    select: {
      id: true,
      walletAddress: true,
      referralCode: true,
      totalStaked: true,
      leftVolume: true,
      rightVolume: true,
      isActive: true,
    },
  });

  const rootNode: BinaryTreeNode = {
    id: rootUser?.id ?? rootId,
    walletAddress: rootUser?.walletAddress ?? "unknown",
    referralCode: rootUser?.referralCode ?? "",
    totalStaked: rootUser?.totalStaked ?? 0,
    leftVolume: rootUser?.leftVolume ?? 0,
    rightVolume: rootUser?.rightVolume ?? 0,
    isActive: rootUser?.isActive ?? false,
    side: null,
    left: null,
    right: null,
  };

  // BFS approach, max depth 3
  const queue: { node: BinaryTreeNode; userId: string; depth: number }[] = [
    { node: rootNode, userId: rootId, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth >= 3) continue;

    const children = await db.user.findMany({
      where: { binaryParentId: current.userId },
      select: {
        id: true,
        walletAddress: true,
        referralCode: true,
        totalStaked: true,
        leftVolume: true,
        rightVolume: true,
        isActive: true,
        binarySide: true,
      },
    });

    for (const child of children) {
      const childNode: BinaryTreeNode = {
        id: child.id,
        walletAddress: child.walletAddress,
        referralCode: child.referralCode,
        totalStaked: child.totalStaked,
        leftVolume: child.leftVolume,
        rightVolume: child.rightVolume,
        isActive: child.isActive,
        side: child.binarySide,
        left: null,
        right: null,
      };

      if (child.binarySide === "left") {
        current.node.left = childNode;
      } else if (child.binarySide === "right") {
        current.node.right = childNode;
      }

      queue.push({ node: childNode, userId: child.id, depth: current.depth + 1 });
    }
  }

  return rootNode;
}

async function countNetworkIterative(userId: string): Promise<number> {
  let total = 0;
  const queue: string[] = [userId];
  const visited = new Set<string>();
  visited.add(userId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const refs = await db.user.findMany({
      where: { referrerId: currentId },
      select: { id: true },
    });

    total += refs.length;

    for (const ref of refs) {
      if (!visited.has(ref.id)) {
        visited.add(ref.id);
        queue.push(ref.id);
      }
    }
  }

  return total;
}
