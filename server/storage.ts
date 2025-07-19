import { searches, searchResults, type Search, type InsertSearch, type SearchResult, type InsertSearchResult } from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface IStorage {
  createSearch(search: InsertSearch): Promise<Search>;
  updateSearchStatus(id: number, status: string, totalResults?: number, searchTime?: number): Promise<void>;
  getSearch(id: number): Promise<Search | undefined>;
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
  getSearchResults(searchId: number): Promise<SearchResult[]>;
}

export class MemStorage implements IStorage {
  private searches: Map<number, Search>;
  private searchResults: Map<number, SearchResult>;
  private currentSearchId: number;
  private currentResultId: number;

  constructor() {
    this.searches = new Map();
    this.searchResults = new Map();
    this.currentSearchId = 1;
    this.currentResultId = 1;
  }

  async createSearch(insertSearch: InsertSearch): Promise<Search> {
    const id = this.currentSearchId++;
    const search: Search = {
      ...insertSearch,
      id,
      status: 'searching',
      totalResults: 0,
      searchTime: null,
      createdAt: new Date(),
    };
    this.searches.set(id, search);
    return search;
  }

  async updateSearchStatus(id: number, status: string, totalResults?: number, searchTime?: number): Promise<void> {
    const search = this.searches.get(id);
    if (search) {
      const updatedSearch = {
        ...search,
        status,
        ...(totalResults !== undefined && { totalResults }),
        ...(searchTime !== undefined && { searchTime }),
      };
      this.searches.set(id, updatedSearch);
    }
  }

  async getSearch(id: number): Promise<Search | undefined> {
    return this.searches.get(id);
  }

  async createSearchResult(insertResult: InsertSearchResult): Promise<SearchResult> {
    const id = this.currentResultId++;
    const result: SearchResult = {
      ...insertResult,
      id,
      summary: insertResult.summary ?? null,
      publishedDate: insertResult.publishedDate ?? null,
      readingTime: insertResult.readingTime ?? null,
      confidence: insertResult.confidence ?? null,
      sourcesCount: insertResult.sourcesCount ?? null,
      keywords: insertResult.keywords ?? null,
      metadata: insertResult.metadata ?? null,
      errorMessage: insertResult.errorMessage ?? null,
    };
    this.searchResults.set(id, result);
    return result;
  }

  async getSearchResults(searchId: number): Promise<SearchResult[]> {
    return Array.from(this.searchResults.values()).filter(
      (result) => result.searchId === searchId,
    );
  }
}

// PostgreSQL Storage implementation
export class PgStorage implements IStorage {
  private db;

  constructor() {
    // Use Supabase database URL if available, otherwise fallback to Replit's PostgreSQL
    const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("No database URL available. Please set SUPABASE_DATABASE_URL secret.");
    }
    const sql = postgres(databaseUrl);
    this.db = drizzle(sql);
  }

  async createSearch(insertSearch: InsertSearch): Promise<Search> {
    const [search] = await this.db.insert(searches).values({
      ...insertSearch,
      status: 'searching',
    }).returning();
    return search;
  }

  async updateSearchStatus(id: number, status: string, totalResults?: number, searchTime?: number): Promise<void> {
    await this.db.update(searches)
      .set({
        status,
        ...(totalResults !== undefined && { totalResults }),
        ...(searchTime !== undefined && { searchTime }),
      })
      .where(eq(searches.id, id));
  }

  async getSearch(id: number): Promise<Search | undefined> {
    const [search] = await this.db.select().from(searches).where(eq(searches.id, id));
    return search;
  }

  async createSearchResult(insertResult: InsertSearchResult): Promise<SearchResult> {
    const [result] = await this.db.insert(searchResults).values(insertResult).returning();
    return result;
  }

  async getSearchResults(searchId: number): Promise<SearchResult[]> {
    return await this.db.select().from(searchResults).where(eq(searchResults.searchId, searchId));
  }
}

// Use PostgreSQL storage when SUPABASE_DATABASE_URL or DATABASE_URL is available, otherwise fallback to memory
export const storage = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL) ? new PgStorage() : new MemStorage();
