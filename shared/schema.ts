import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - extends Supabase auth.users
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Supabase auth user UUID
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).default("free"), // 'free', 'pro', 'premium'
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("inactive"), // active, inactive, cancelled, past_due
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  searchesUsed: integer("searches_used").default(0),
  searchesLimit: integer("searches_limit").default(10), // per month
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Foreign key to users.id
  query: text("query").notNull(),
  status: text("status").notNull(), // 'searching', 'completed', 'error'
  totalResults: integer("total_results").default(0),
  searchTime: integer("search_time"), // in milliseconds
  isSaved: boolean("is_saved").default(false), // User can save/like searches
  createdAt: timestamp("created_at").defaultNow(),
});

export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  publishedDate: text("published_date"),
  readingTime: text("reading_time"),
  scrapingStatus: text("scraping_status").notNull(), // 'success', 'partial', 'failed'
  summary: text("summary"),
  confidence: integer("confidence"), // 0-100
  sourcesCount: integer("sources_count").default(0),
  keywords: text("keywords"), // JSON array of keywords
  metadata: text("metadata"), // JSON object with topic, category, entities
  errorMessage: text("error_message"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  searches: many(searches),
}));

export const searchesRelations = relations(searches, ({ one, many }) => ({
  user: one(users, {
    fields: [searches.userId],
    references: [users.id],
  }),
  results: many(searchResults),
}));

export const searchResultsRelations = relations(searchResults, ({ one }) => ({
  search: one(searches, {
    fields: [searchResults.searchId],
    references: [searches.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  displayName: true,
  subscriptionTier: true,
});

export const insertSearchSchema = createInsertSchema(searches).pick({
  userId: true,
  query: true,
});

export const insertSearchResultSchema = createInsertSchema(searchResults).pick({
  searchId: true,
  title: true,
  url: true,
  domain: true,
  publishedDate: true,
  readingTime: true,
  scrapingStatus: true,
  summary: true,
  confidence: true,
  sourcesCount: true,
  keywords: true,
  metadata: true,
  errorMessage: true,
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  displayName: z.string().min(2).optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searches.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
