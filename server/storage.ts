import { users, searches, searchResults, type User, type InsertUser, type Search, type InsertSearch, type SearchResult, type InsertSearchResult } from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;
  updateUserSearchUsage(id: string, increment: number): Promise<void>;
  
  // Search operations
  createSearch(search: InsertSearch): Promise<Search>;
  updateSearchStatus(id: number, status: string, totalResults?: number, searchTime?: number): Promise<void>;
  getSearch(id: number): Promise<Search | undefined>;
  getUserSearches(userId: string, limit?: number): Promise<Search[]>;
  createSearchResult(result: InsertSearchResult): Promise<SearchResult>;
  getSearchResults(searchId: number): Promise<SearchResult[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private searches: Map<number, Search>;
  private searchResults: Map<number, SearchResult>;
  private currentSearchId: number;
  private currentResultId: number;

  constructor() {
    this.users = new Map();
    this.searches = new Map();
    this.searchResults = new Map();
    this.currentSearchId = 1;
    this.currentResultId = 1;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      displayName: insertUser.displayName ?? null,
      subscriptionTier: insertUser.subscriptionTier ?? 'free',
      searchesUsed: 0,
      searchesLimit: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updatedUser);
    }
  }

  async updateUserSearchUsage(id: string, increment: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { 
        ...user, 
        searchesUsed: user.searchesUsed + increment,
        updatedAt: new Date()
      };
      this.users.set(id, updatedUser);
    }
  }

  async getUserSearches(userId: string, limit?: number): Promise<Search[]> {
    const userSearches = Array.from(this.searches.values())
      .filter(search => search.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return limit ? userSearches.slice(0, limit) : userSearches;
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
    // Use Supabase connection string, fallback to DATABASE_URL
    let databaseUrl = process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error("No database URL available. Please set SUPABASE_CONNECTION_STRING secret.");
    }
    
    // Clean up the connection string if it includes the env var name
    if (databaseUrl.startsWith('DATABASE_URL=')) {
      databaseUrl = databaseUrl.substring('DATABASE_URL='.length);
    }
    
    // Remove any extra quotes
    if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
      databaseUrl = databaseUrl.slice(1, -1);
    }
    
    // Disable prefetch as it's not supported for Supabase's transaction pool mode
    const sql = postgres(databaseUrl, { prepare: false });
    this.db = drizzle(sql);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values({
      ...insertUser,
      subscriptionTier: insertUser.subscriptionTier ?? 'free',
    }).returning();
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await this.db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserSearchUsage(id: string, increment: number): Promise<void> {
    await this.db.update(users)
      .set({
        searchesUsed: users.searchesUsed + increment,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserSearches(userId: string, limit?: number): Promise<Search[]> {
    const query = this.db.select().from(searches)
      .where(eq(searches.userId, userId))
      .orderBy(searches.createdAt);
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
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

// Use PostgreSQL storage when SUPABASE_CONNECTION_STRING or DATABASE_URL is available, otherwise fallback to memory
export const storage = (process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL) ? new PgStorage() : new MemStorage();
