import { searches, searchResults, type Search, type InsertSearch, type SearchResult, type InsertSearchResult } from "@shared/schema";

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

export const storage = new MemStorage();
