import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchService } from "./services/search";
import { scraperService } from "./services/scraper";
import { summarizeService } from "./services/summarize";
import { insertSearchSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Start a new search
  app.post("/api/search", async (req, res) => {
    try {
      const { query } = insertSearchSchema.parse(req.body);
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const startTime = Date.now();
      
      // Create search record
      const search = await storage.createSearch({ query: query.trim() });
      
      // Perform search and processing asynchronously
      processSearchAsync(search.id, query.trim(), startTime);
      
      res.json({ searchId: search.id, status: 'searching' });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to start search" });
    }
  });

  // Get search status and results
  app.get("/api/search/:id", async (req, res) => {
    try {
      const searchId = parseInt(req.params.id);
      
      if (isNaN(searchId)) {
        return res.status(400).json({ error: "Invalid search ID" });
      }

      const search = await storage.getSearch(searchId);
      if (!search) {
        return res.status(404).json({ error: "Search not found" });
      }

      const allResults = await storage.getSearchResults(searchId);
      
      // Filter results to only show summaries with confidence scores greater than 80%
      const highConfidenceResults = allResults.filter(result => result.confidence > 80);
      
      // Get the original URLs that were searched from cache
      const searchedUrls = global.searchResultsCache?.[searchId] || [];

      res.json({
        search: {
          ...search,
          totalResults: highConfidenceResults.length,
          originalResultsCount: allResults.length
        },
        results: highConfidenceResults,
        searchedUrls: searchedUrls,
      });
    } catch (error) {
      console.error("Get search error:", error);
      res.status(500).json({ error: "Failed to get search results" });
    }
  });

  // Get OpenAI usage statistics
  app.get("/api/openai/stats", (req, res) => {
    try {
      const stats = summarizeService.getUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Get OpenAI stats error:", error);
      res.status(500).json({ error: "Failed to get OpenAI usage statistics" });
    }
  });

  // Reset OpenAI usage statistics (for development/testing)
  app.post("/api/openai/reset-stats", (req, res) => {
    try {
      summarizeService.resetUsageStats();
      res.json({ message: "OpenAI usage statistics reset successfully" });
    } catch (error) {
      console.error("Reset OpenAI stats error:", error);
      res.status(500).json({ error: "Failed to reset OpenAI usage statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processSearchAsync(searchId: number, query: string, startTime: number) {
  try {
    // Step 1: Search the web
    const searchResults = await searchService.search(query, 10);
    
    // Store the original search URLs for later retrieval
    global.searchResultsCache = global.searchResultsCache || {};
    global.searchResultsCache[searchId] = searchResults.map(result => ({
      title: result.title,
      url: result.url,
      domain: result.domain
    }));
    
    if (searchResults.length === 0) {
      await storage.updateSearchStatus(searchId, 'error');
      return;
    }

    // Step 2: First scrape all content without AI processing
    const scrapedResults = [];
    for (const result of searchResults) {
      let scrapingStatus = 'failed';
      let errorMessage: string | undefined;
      let readingTime = '';
      let publishedDate: string | undefined;
      let scrapedContent: string | null = null;

      try {
        const content = await scraperService.scrapeUrl(result.url);
        scrapedContent = content.content;
        readingTime = content.readingTime;
        publishedDate = content.publishedDate;
        scrapingStatus = 'success';
      } catch (scrapingError) {
        console.error(`Failed to scrape ${result.url}:`, scrapingError);
        errorMessage = scrapingError instanceof Error ? scrapingError.message : 'Unknown error';
        
        // Check if we can use snippet as fallback
        if (result.snippet && result.snippet.length > 50) {
          scrapedContent = result.snippet;
          scrapingStatus = 'partial';
        }
      }

      scrapedResults.push({
        searchResult: result,
        scrapedContent,
        scrapingStatus,
        errorMessage,
        readingTime,
        publishedDate,
      });
    }

    // Step 3: Only use OpenAI for successfully scraped content
    const successfulScrapes = scrapedResults.filter(r => r.scrapedContent && r.scrapedContent.length > 50);
    console.log(`OpenAI optimization: Processing ${successfulScrapes.length}/${scrapedResults.length} results with AI (saving ${scrapedResults.length - successfulScrapes.length} API calls)`);
    
    // Process AI summaries efficiently
    for (const scraped of scrapedResults) {
      let summary = '';
      let confidence = 0;
      let sourcesCount = 0;
      let keywords: string[] = [];
      let metadata: { topic: string; category: string; entities: string[] } = { topic: 'Unknown', category: 'General', entities: [] };

      // Only call OpenAI if we have meaningful content
      if (scraped.scrapedContent && scraped.scrapedContent.length > 50) {
        try {
          const summaryResult = await summarizeService.summarizeContent(
            scraped.scrapedContent,
            scraped.searchResult.title,
            scraped.searchResult.url
          );
          
          summary = summaryResult.summary;
          confidence = summaryResult.confidence;
          sourcesCount = summaryResult.sourcesCount;
          keywords = summaryResult.keywords || [];
          metadata = summaryResult.metadata || { topic: 'Unknown', category: 'General', entities: [] };
          
          // Reduce confidence for partial scrapes
          if (scraped.scrapingStatus === 'partial') {
            confidence = Math.max(0, confidence - 30);
          }
        } catch (aiError) {
          console.error(`AI summarization failed for ${scraped.searchResult.url}:`, aiError);
          // Fallback to basic summary without using OpenAI quota
          summary = scraped.scrapedContent.split(/[.!?]+/)
            .filter(s => s.trim().length > 20)
            .slice(0, 2)
            .join('. ').trim() + '.';
          confidence = scraped.scrapingStatus === 'success' ? 50 : 30;
          sourcesCount = 0;
          keywords = [];
          metadata = { topic: 'Unknown', category: 'General', entities: [] } as { topic: string; category: string; entities: string[] };
        }
      } else if (scraped.scrapingStatus === 'failed' && scraped.searchResult.snippet) {
        // Use snippet as basic summary for failed scrapes
        summary = scraped.searchResult.snippet;
        confidence = 20;
        sourcesCount = 0;
        keywords = [];
        metadata = { topic: 'Unknown', category: 'General', entities: [] } as { topic: string; category: string; entities: string[] };
      }

      // Store result
      await storage.createSearchResult({
        searchId,
        title: scraped.searchResult.title,
        url: scraped.searchResult.url,
        domain: scraped.searchResult.domain,
        publishedDate: scraped.publishedDate,
        readingTime: scraped.readingTime,
        scrapingStatus: scraped.scrapingStatus,
        summary,
        confidence,
        sourcesCount,
        keywords: JSON.stringify(keywords),
        metadata: JSON.stringify(metadata),
        errorMessage: scraped.errorMessage,
      });
    }

    // Update search status
    const searchTime = Date.now() - startTime;
    await storage.updateSearchStatus(searchId, 'completed', searchResults.length, searchTime);
  } catch (error) {
    console.error(`Search processing error for search ${searchId}:`, error);
    await storage.updateSearchStatus(searchId, 'error');
  }
}
