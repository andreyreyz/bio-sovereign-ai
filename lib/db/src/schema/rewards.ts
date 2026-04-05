import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rewardsTable = pgTable("rewards", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  signature: text("signature").notNull(),
  amount: real("amount").notNull().default(0.1),
  healthScore: integer("health_score").notNull(),
  aiExplanation: text("ai_explanation").notNull(),
  explorerUrl: text("explorer_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRewardSchema = createInsertSchema(rewardsTable).omit({ id: true, createdAt: true });
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewardsTable.$inferSelect;
