import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const terminalSessions = pgTable("terminal_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  commands: jsonb("commands").default([]),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ethosUsers = pgTable("ethos_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull().unique(),
  username: text("username"),
  xp: integer("xp").default(0),
  reputation: real("reputation").default(0),
  attestations: integer("attestations").default(0),
  rank: integer("rank").default(0),
  weeklyXp: integer("weekly_xp").default(0),
  monthlyXp: integer("monthly_xp").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const attestations = pgTable("attestations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  score: real("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEthosUserSchema = createInsertSchema(ethosUsers).omit({
  id: true,
  lastUpdated: true,
});

export const insertAttestationSchema = createInsertSchema(attestations).omit({
  id: true,
  createdAt: true,
});

export const terminalQuerySchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional(),
});

export const ethosStatsSchema = z.object({
  address: z.string(),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('week'),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type EthosUser = typeof ethosUsers.$inferSelect;
export type InsertEthosUser = z.infer<typeof insertEthosUserSchema>;
export type Attestation = typeof attestations.$inferSelect;
export type InsertAttestation = z.infer<typeof insertAttestationSchema>;
export type TerminalSession = typeof terminalSessions.$inferSelect;
export type TerminalQuery = z.infer<typeof terminalQuerySchema>;
export type EthosStats = z.infer<typeof ethosStatsSchema>;
