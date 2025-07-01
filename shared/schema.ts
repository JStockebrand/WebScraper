import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  status: text("status").notNull(), // 'searching', 'completed', 'error'
  totalResults: integer("total_results").default(0),
  searchTime: integer("search_time"), // in milliseconds
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

export const insertSearchSchema = createInsertSchema(searches).pick({
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

export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searches.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
