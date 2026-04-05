import { Router } from "express";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { db } from "@workspace/db";
import { rewardsTable } from "@workspace/db";
import { desc, count, sum, avg, countDistinct } from "drizzle-orm";
import { ClaimRewardBody } from "@workspace/api-zod";

const router = Router();

const SOLANA_DEVNET_URL = "https://api.devnet.solana.com";
const REWARD_AMOUNT_SOL = 0.1;

function getPoolKeypair(): Keypair {
  const privateKeyStr = process.env.POOL_WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    throw new Error("POOL_WALLET_PRIVATE_KEY is not configured");
  }

  try {
    let secretKey: Uint8Array;

    const trimmed = privateKeyStr.trim();

    if (trimmed.startsWith("[")) {
      const arr = JSON.parse(trimmed) as number[];
      secretKey = new Uint8Array(arr);
    } else {
      secretKey = bs58.decode(trimmed);
    }

    return Keypair.fromSecretKey(secretKey);
  } catch (err) {
    throw new Error(`Failed to parse POOL_WALLET_PRIVATE_KEY: ${err}`);
  }
}

router.post("/rewards/claim", async (req, res) => {
  const parsed = ClaimRewardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request data" });
    return;
  }

  const { walletAddress, aiExplanation, healthScore } = parsed.data;

  let poolKeypair: Keypair;
  try {
    poolKeypair = getPoolKeypair();
  } catch (err) {
    req.log.error({ err }, "Failed to load pool keypair");
    res.status(500).json({ error: "Reward pool configuration error" });
    return;
  }

  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(walletAddress);
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const connection = new Connection(SOLANA_DEVNET_URL, "confirmed");

    const lamports = Math.floor(REWARD_AMOUNT_SOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: poolKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [poolKeypair],
      { commitment: "confirmed" }
    );

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    const [record] = await db
      .insert(rewardsTable)
      .values({
        walletAddress,
        signature,
        amount: REWARD_AMOUNT_SOL,
        healthScore,
        aiExplanation,
        explorerUrl,
      })
      .returning();

    res.json({
      success: true,
      signature,
      amount: REWARD_AMOUNT_SOL,
      explorerUrl,
      recordId: record.id,
    });
  } catch (err) {
    req.log.error({ err }, "Solana transaction error");
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Transaction failed: ${message}` });
  }
});

router.get("/rewards/history", async (req, res) => {
  try {
    const records = await db
      .select()
      .from(rewardsTable)
      .orderBy(desc(rewardsTable.createdAt))
      .limit(50);

    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch rewards history");
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/rewards/stats", async (req, res) => {
  try {
    const [stats] = await db
      .select({
        totalRewards: count(),
        totalSolPaid: sum(rewardsTable.amount),
        averageHealthScore: avg(rewardsTable.healthScore),
        uniqueWallets: countDistinct(rewardsTable.walletAddress),
      })
      .from(rewardsTable);

    res.json({
      totalRewards: stats.totalRewards ?? 0,
      totalSolPaid: parseFloat(String(stats.totalSolPaid ?? 0)),
      averageHealthScore: parseFloat(parseFloat(String(stats.averageHealthScore ?? 0)).toFixed(1)),
      uniqueWallets: stats.uniqueWallets ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch rewards stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
