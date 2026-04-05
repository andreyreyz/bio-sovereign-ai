import { pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── SOL Transfers (send to any address) ─────────────────────────────────────
export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  toAddress: text("to_address").notNull(),
  amount: real("amount").notNull(),
  signature: text("signature"),
  status: text("status").notNull().default("pending"), // pending | confirmed | failed
  errorMsg: text("error_msg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertTransferSchema = createInsertSchema(transfersTable).omit({ id: true, createdAt: true });
export type Transfer = typeof transfersTable.$inferSelect;

// ── BSA Stakes ───────────────────────────────────────────────────────────────
// User stakes SOL from pool wallet for 7 days; if health ≥80% → +10% bonus
// If health drops < 80% during period → penalty (partial forfeit)
export const stakesTable = pgTable("stakes", {
  id: serial("id").primaryKey(),
  amountSol: real("amount_sol").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at").notNull(),
  status: text("status").notNull().default("active"), // active | claimed | forfeited | partial
  healthScoreAtStart: integer("health_score_at_start").notNull().default(0),
  minHealthDuringPeriod: integer("min_health_during_period"),
  bonusPct: real("bonus_pct").notNull().default(10),
  returnAmountSol: real("return_amount_sol"),
  signature: text("signature"),
  claimedAt: timestamp("claimed_at"),
});
export const insertStakeSchema = createInsertSchema(stakesTable).omit({ id: true, startedAt: true });
export type Stake = typeof stakesTable.$inferSelect;

// ── Monthly Earnings ─────────────────────────────────────────────────────────
// Tracks accumulated weekly rewards per calendar month.
// Withdrawal only allowed once per month and only if compliance ≥80%.
export const monthlyEarningsTable = pgTable("monthly_earnings", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),         // "2026-04"
  earnedSol: real("earned_sol").notNull().default(0),
  compliancePct: real("compliance_pct").notNull().default(0), // 0-100
  weeksCompliant: integer("weeks_compliant").notNull().default(0),
  totalWeeks: integer("total_weeks").notNull().default(0),
  withdrawn: boolean("withdrawn").notNull().default(false),
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawSignature: text("withdraw_signature"),
  penaltyApplied: boolean("penalty_applied").notNull().default(false),
  penaltyAmountSol: real("penalty_amount_sol").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertMonthlyEarningsSchema = createInsertSchema(monthlyEarningsTable).omit({ id: true, createdAt: true });
export type MonthlyEarning = typeof monthlyEarningsTable.$inferSelect;
