import { users, searches, searchResults, type User, type InsertUser, type Search, type InsertSearch, type SearchResult, type InsertSearchResult } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;
  updateUserSearchUsage(id: string, increment: number): Promise<void>;
  updateUserEmailVerification(id: string, isVerified: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;
  updateUserStripeInfo(id: string, customerId: string, subscriptionId: string): Promise<void>;
  
  // Search operations
  createSearch(search: InsertSearch): Promise<Search>;
  updateSearchStatus(id: number, status: string, totalResults?: number, searchTime?: number): Promise<void>;
  getSearch(id: number): Promise<Search | undefined>;
  getUserSearches(userId: string, limit?: number): Promise<Search[]>;
  getUserSearchHistory(userId: string, limit?: number): Promise<any[]>;
  getUserSavedSearches(userId: string, limit?: number): Promise<any[]>;
  toggleSearchSaved(searchId: number, isSaved: boolean): Promise<void>;
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
      subscriptionStatus: 'inactive',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
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
        searchesUsed: (user.searchesUsed || 0) + increment,
        updatedAt: new Date()
      };
      this.users.set(id, updatedUser);
    }
  }

  async updateUserEmailVerification(id: string, isVerified: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { 
        ...user, 
        emailVerified: isVerified,
        updatedAt: new Date() 
      };
      this.users.set(id, updatedUser);
    }
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user's searches and search results
    const userSearches = Array.from(this.searches.values())
      .filter(search => search.userId === id);
    
    userSearches.forEach(search => {
      // Delete search results for this search
      Array.from(this.searchResults.values())
        .filter(result => result.searchId === search.id)
        .forEach(result => this.searchResults.delete(result.id));
      
      // Delete the search
      this.searches.delete(search.id);
    });

    // Delete the user
    this.users.delete(id);
    console.log(`Deleted user ${id} and all associated data from memory storage`);
  }

  async updateUserStripeInfo(id: string, customerId: string, subscriptionId: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { 
        ...user, 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date()
      };
      this.users.set(id, updatedUser);
    }
  }

  async getUserSearches(userId: string, limit?: number): Promise<Search[]> {
    const userSearches = Array.from(this.searches.values())
      .filter(search => search.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    
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
      isSaved: false,
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

  async getUserSearchHistory(userId: string, limit?: number): Promise<any[]> {
    const userSearches = await this.getUserSearches(userId, limit);
    return userSearches.map(search => {
      const results = Array.from(this.searchResults.values()).filter(
        result => result.searchId === search.id
      );
      const firstResult = results[0];
      
      return {
        id: search.id,
        query: search.query,
        status: search.status,
        createdAt: search.createdAt?.toISOString() || new Date().toISOString(),
        summaryText: firstResult?.summary || null,
        totalResults: search.totalResults,
        confidence: firstResult?.confidence || null,
        isSaved: search.isSaved,
      };
    });
  }

  async getUserSavedSearches(userId: string, limit?: number): Promise<any[]> {
    const userSavedSearches = Array.from(this.searches.values())
      .filter(search => search.userId === userId && search.isSaved)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    
    // Get first result's summary for each search
    const searchesWithSummaries = userSavedSearches.map(search => {
      const firstResult = Array.from(this.searchResults.values())
        .find(result => result.searchId === search.id);
      
      return {
        id: search.id,
        query: search.query,
        status: search.status,
        createdAt: search.createdAt?.toISOString() || new Date().toISOString(),
        summaryText: firstResult?.summary || null,
        totalResults: search.totalResults,
        confidence: firstResult?.confidence || null,
        isSaved: search.isSaved,
      };
    });
    
    return limit ? searchesWithSummaries.slice(0, limit) : searchesWithSummaries;
  }

  async toggleSearchSaved(searchId: number, isSaved: boolean): Promise<void> {
    const search = this.searches.get(searchId);
    if (search) {
      const updatedSearch = { ...search, isSaved };
      this.searches.set(searchId, updatedSearch);
    }
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
      subscriptionStatus: 'inactive',
      searchesUsed: 0,
      searchesLimit: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    // Get current user to calculate new value
    const user = await this.getUser(id);
    if (user) {
      await this.db.update(users)
        .set({
          searchesUsed: (user.searchesUsed || 0) + increment,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    }
  }

  async updateUserEmailVerification(id: string, isVerified: boolean): Promise<void> {
    await this.db.update(users)
      .set({
        emailVerified: isVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserSearches(userId: string, limit?: number): Promise<Search[]> {
    const query = this.db.select().from(searches)
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.createdAt));
    
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

  async getUserSearchHistory(userId: string, limit?: number): Promise<any[]> {
    const query = this.db
      .select({
        id: searches.id,
        query: searches.query,
        status: searches.status,
        createdAt: searches.createdAt,
        totalResults: searches.totalResults,
        summary: searchResults.summary,
        confidence: searchResults.confidence,
      })
      .from(searches)
      .leftJoin(searchResults, eq(searches.id, searchResults.searchId))
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.createdAt));

    const results = limit ? await query.limit(limit) : await query;
    
    // Group by search ID and return with first result's summary
    const groupedResults = results.reduce((acc, row) => {
      if (!acc[row.id]) {
        acc[row.id] = {
          id: row.id,
          query: row.query,
          status: row.status,
          createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
          summaryText: row.summary || null,
          totalResults: row.totalResults,
          confidence: row.confidence || null,
        };
      }
      return acc;
    }, {} as any);

    return Object.values(groupedResults);
  }

  async updateUserStripeInfo(id: string, customerId: string, subscriptionId: string): Promise<void> {
    await this.db.update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserSavedSearches(userId: string, limit?: number): Promise<any[]> {
    const query = this.db
      .select({
        id: searches.id,
        query: searches.query,
        status: searches.status,
        createdAt: searches.createdAt,
        totalResults: searches.totalResults,
        summary: searchResults.summary,
        confidence: searchResults.confidence,
        isSaved: searches.isSaved,
      })
      .from(searches)
      .leftJoin(searchResults, eq(searches.id, searchResults.searchId))
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.createdAt));

    const results = limit ? await query.limit(limit) : await query;
    
    // Group by search ID and return with first result's summary, only saved searches
    const groupedResults = results.reduce((acc, row) => {
      if (!acc[row.id] && row.isSaved) {
        acc[row.id] = {
          id: row.id,
          query: row.query,
          status: row.status,
          createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
          summaryText: row.summary || null,
          totalResults: row.totalResults,
          confidence: row.confidence || null,
          isSaved: row.isSaved,
        };
      }
      return acc;
    }, {} as any);

    return Object.values(groupedResults);
  }

  async toggleSearchSaved(searchId: number, isSaved: boolean): Promise<void> {
    await this.db.update(searches)
      .set({ isSaved })
      .where(eq(searches.id, searchId));
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Get user searches first
    const userSearches = await this.db.select().from(searches).where(eq(searches.userId, id));
    
    // Delete search results for each search
    for (const search of userSearches) {
      await this.db.delete(searchResults).where(eq(searchResults.searchId, search.id));
    }
    
    // Delete user's searches
    await this.db.delete(searches)
      .where(eq(searches.userId, id));
    
    // Delete the user
    await this.db.delete(users)
      .where(eq(users.id, id));
    
    console.log(`Deleted user ${id} and all associated data from database`);
  }
}

// Use PostgreSQL storage when SUPABASE_CONNECTION_STRING or DATABASE_URL is available, otherwise fallback to memory
export const storage = (process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL) ? new PgStorage() : new MemStorage();
