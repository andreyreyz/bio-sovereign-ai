import { Router } from "express";
import {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction,
  clusterApiUrl
} from "@solana/web3.js";
import bs58 from "bs58";
import { db } from "@workspace/db";
import {
  transfersTable, stakesTable, monthlyEarningsTable
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();
const rpc = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── Realistic reward constants ─────────────────────────────────────────────
// Max earnings: ~200 000 KZT/year = ~2.836 SOL/year at Gold ×2.0
// Weekly base: 0.0273 SOL (Bronze ×1.0), max Gold: 0.0546 SOL/week
const WEEKLY_BASE_SOL = 0.0273;   // at ×1.0 Bronze
const PENALTY_THRESHOLD = 80;     // health score below → penalty
const STAKE_AMOUNT_SOL = 0.5;
const STAKE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const STAKE_BONUS_PCT = 10;
const STAKE_PENALTY_PCT = 50;     // lose 50% if health < 80 during stake

function getKeypair(): Keypair {
  const raw = process.env.POOL_WALLET_PRIVATE_KEY;
  if (!raw) throw new Error("POOL_WALLET_PRIVATE_KEY not set");
  const decoded = bs58.decode(raw.trim());
  return Keypair.fromSecretKey(decoded);
}

async function sendSol(toAddress: string, amountSol: number): Promise<string> {
  const kp = getKeypair();
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey, lamports })
  );
  return sendAndConfirmTransaction(rpc, tx, [kp], { commitment: "confirmed" });
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND SOL to any address
// ═══════════════════════════════════════════════════════════════════════════
router.post("/send", async (req, res) => {
  const { toAddress, amount } = req.body as { toAddress?: string; amount?: number };
  if (!toAddress || !amount || amount <= 0) {
    return res.status(400).json({ error: "toAddress and amount required" });
  }
  if (amount > 10) {
    return res.status(400).json({ error: "Max 10 SOL per transfer" });
  }

  let pubkey: PublicKey;
  try { pubkey = new PublicKey(toAddress); } catch {
    return res.status(400).json({ error: "Invalid Solana address" });
  }

  const [record] = await db.insert(transfersTable).values({
    toAddress, amount, status: "pending"
  }).returning();

  try {
    const signature = await sendSol(toAddress, amount);
    const [updated] = await db.update(transfersTable)
      .set({ signature, status: "confirmed" })
      .where(eq(transfersTable.id, record.id))
      .returning();
    res.json({
      success: true, signature, amount,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      transfer: updated
    });
  } catch (err: any) {
    await db.update(transfersTable)
      .set({ status: "failed", errorMsg: err.message })
      .where(eq(transfersTable.id, record.id));
    res.status(500).json({ error: `Transfer failed: ${err.message}` });
  }
});

router.get("/transfers", async (_req, res) => {
  const rows = await db.select().from(transfersTable)
    .orderBy(desc(transfersTable.createdAt)).limit(20);
  res.json(rows);
});

// ═══════════════════════════════════════════════════════════════════════════
// STAKE system — stake 0.5 SOL for 7 days
// ═══════════════════════════════════════════════════════════════════════════
router.get("/stake/status", async (_req, res) => {
  const active = await db.select().from(stakesTable)
    .where(eq(stakesTable.status, "active"))
    .orderBy(desc(stakesTable.startedAt)).limit(1);
  const history = await db.select().from(stakesTable)
    .orderBy(desc(stakesTable.startedAt)).limit(10);
  res.json({ active: active[0] || null, history });
});

router.post("/stake/start", async (req, res) => {
  const { healthScore } = req.body as { healthScore?: number };
  if (!healthScore) return res.status(400).json({ error: "healthScore required" });

  const existing = await db.select().from(stakesTable)
    .where(eq(stakesTable.status, "active")).limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "Stake already active", stake: existing[0] });
  }

  const balance = await rpc.getBalance(getKeypair().publicKey);
  if (balance / LAMPORTS_PER_SOL < STAKE_AMOUNT_SOL + 0.01) {
    return res.status(400).json({ error: "Insufficient balance for stake" });
  }

  const endsAt = new Date(Date.now() + STAKE_DURATION_MS);
  const [stake] = await db.insert(stakesTable).values({
    amountSol: STAKE_AMOUNT_SOL,
    endsAt,
    status: "active",
    healthScoreAtStart: healthScore,
    bonusPct: STAKE_BONUS_PCT,
  }).returning();

  res.json({ success: true, stake });
});

router.post("/stake/claim", async (req, res) => {
  const { healthScore } = req.body as { healthScore?: number };
  if (healthScore === undefined) return res.status(400).json({ error: "healthScore required" });

  const [stake] = await db.select().from(stakesTable)
    .where(eq(stakesTable.status, "active"))
    .orderBy(desc(stakesTable.startedAt)).limit(1);

  if (!stake) return res.status(400).json({ error: "No active stake" });

  const now = new Date();
  const ready = now >= new Date(stake.endsAt);

  const minHealth = Math.min(stake.healthScoreAtStart, healthScore);
  const qualified = minHealth >= PENALTY_THRESHOLD;

  let returnSol: number;
  let status: string;

  if (!ready) {
    // Early exit — forfeit bonus, keep principal minus 20% penalty
    returnSol = parseFloat((stake.amountSol * 0.8).toFixed(4));
    status = "forfeited";
  } else if (qualified) {
    returnSol = parseFloat((stake.amountSol * (1 + stake.bonusPct / 100)).toFixed(4));
    status = "claimed";
  } else {
    // Penalty: lose 50% of stake
    returnSol = parseFloat((stake.amountSol * (1 - STAKE_PENALTY_PCT / 100)).toFixed(4));
    status = "partial";
  }

  try {
    const kp = getKeypair();
    const signature = await sendSol(kp.publicKey.toBase58(), 0.000001); // self-ping to record on chain
    // In real system we'd track stake as locked SOL; here we record the claim
    await db.update(stakesTable)
      .set({ status, returnAmountSol: returnSol, signature, claimedAt: now, minHealthDuringPeriod: minHealth })
      .where(eq(stakesTable.id, stake.id));

    res.json({
      success: true, status, returnSol, qualified, minHealth,
      bonusApplied: qualified && ready,
      message: !ready ? "Early exit — 20% penalty applied"
        : qualified ? `+${stake.bonusPct}% bonus! +${(returnSol - stake.amountSol).toFixed(4)} SOL`
        : `Health score dropped below ${PENALTY_THRESHOLD} — ${STAKE_PENALTY_PCT}% penalty`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY EARNINGS — accumulate, check, withdraw once per month
// ═══════════════════════════════════════════════════════════════════════════
router.get("/monthly", async (_req, res) => {
  const month = currentMonth();
  const rows = await db.select().from(monthlyEarningsTable)
    .orderBy(desc(monthlyEarningsTable.createdAt)).limit(12);

  let current = rows.find(r => r.month === month);
  if (!current) {
    // Simulate this month's accumulated earnings based on rewards history
    const [created] = await db.insert(monthlyEarningsTable).values({
      month,
      earnedSol: 0.218,    // running total for month (Gold ×2.0, 4 weeks)
      compliancePct: 87.5, // 3.5/4 weeks above 80%
      weeksCompliant: 3,
      totalWeeks: 4,
      withdrawn: false,
      penaltyApplied: false,
      penaltyAmountSol: 0,
    }).returning();
    current = created;
  }

  const canWithdraw = !current.withdrawn && current.compliancePct >= 80;
  const net = canWithdraw
    ? parseFloat((current.earnedSol - current.penaltyAmountSol).toFixed(4))
    : 0;

  res.json({
    current,
    canWithdraw,
    net,
    month,
    history: rows.filter(r => r.month !== month),
    rules: {
      minCompliancePct: 80,
      withdrawalsPerMonth: 1,
      penaltyOnMiss: "Missed week deducted pro-rata from earnings",
    }
  });
});

router.post("/monthly/withdraw", async (req, res) => {
  const { toAddress } = req.body as { toAddress?: string };
  if (!toAddress) return res.status(400).json({ error: "toAddress required" });

  const month = currentMonth();
  const [record] = await db.select().from(monthlyEarningsTable)
    .where(eq(monthlyEarningsTable.month, month)).limit(1);

  if (!record) return res.status(400).json({ error: "No earnings record for this month" });
  if (record.withdrawn) return res.status(400).json({ error: "Already withdrawn this month" });
  if (record.compliancePct < 80) {
    return res.status(400).json({
      error: `Compliance too low: ${record.compliancePct}% (need ≥80%)`,
      compliancePct: record.compliancePct
    });
  }

  const net = parseFloat((record.earnedSol - record.penaltyAmountSol).toFixed(4));
  if (net <= 0) return res.status(400).json({ error: "Nothing to withdraw" });

  try {
    const signature = await sendSol(toAddress, net);
    await db.update(monthlyEarningsTable)
      .set({ withdrawn: true, withdrawnAt: new Date(), withdrawSignature: signature })
      .where(eq(monthlyEarningsTable.id, record.id));

    res.json({
      success: true, amount: net, signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH SCORE PENALTY — called when score drops (from dashboard sync)
// ═══════════════════════════════════════════════════════════════════════════
router.post("/penalty", async (req, res) => {
  const { healthScore, weekNumber } = req.body as { healthScore?: number; weekNumber?: number };
  if (!healthScore) return res.status(400).json({ error: "healthScore required" });

  const month = currentMonth();
  const [record] = await db.select().from(monthlyEarningsTable)
    .where(eq(monthlyEarningsTable.month, month)).limit(1);

  if (!record || record.withdrawn) {
    return res.json({ penalized: false, reason: "No active earnings period" });
  }

  if (healthScore < PENALTY_THRESHOLD) {
    const missedWeekEarnings = record.earnedSol / Math.max(record.totalWeeks, 1);
    const penalty = parseFloat(missedWeekEarnings.toFixed(4));
    await db.update(monthlyEarningsTable)
      .set({
        penaltyApplied: true,
        penaltyAmountSol: parseFloat((record.penaltyAmountSol + penalty).toFixed(4)),
        weeksCompliant: Math.max(0, record.weeksCompliant - 1),
        compliancePct: parseFloat(
          (((Math.max(0, record.weeksCompliant - 1)) / record.totalWeeks) * 100).toFixed(1)
        ),
      })
      .where(eq(monthlyEarningsTable.id, record.id));

    res.json({ penalized: true, penaltySol: penalty, newCompliancePct: record.compliancePct });
  } else {
    res.json({ penalized: false, healthScore, compliancePct: record.compliancePct });
  }
});

export default router;
