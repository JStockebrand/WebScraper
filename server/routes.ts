import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchService } from "./services/search";
import { scraperService } from "./services/scraper";
import { openaiService } from "./services/openai";
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

      const results = await storage.getSearchResults(searchId);
      
      res.json({
        search,
        results,
      });
    } catch (error) {
      console.error("Get search error:", error);
      res.status(500).json({ error: "Failed to get search results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processSearchAsync(searchId: number, query: string, startTime: number) {
  try {
    // Step 1: Search the web
    const searchResults = await searchService.search(query, 5);
    
    if (searchResults.length === 0) {
      await storage.updateSearchStatus(searchId, 'error');
      return;
    }

    // Step 2: Process each result
    for (const result of searchResults) {
      try {
        let scrapingStatus = 'success';
        let summary = '';
        let confidence = 0;
        let sourcesCount = 0;
        let errorMessage: string | undefined;
        let readingTime = '';
        let publishedDate: string | undefined;

        try {
          // Scrape content
          const scrapedContent = await scraperService.scrapeUrl(result.url);
          readingTime = scrapedContent.readingTime;
          publishedDate = scrapedContent.publishedDate;

          // Generate AI summary
          const summaryResult = await openaiService.summarizeContent(
            scrapedContent.content,
            result.title,
            result.url
          );
          
          summary = summaryResult.summary;
          confidence = summaryResult.confidence;
          sourcesCount = summaryResult.sourcesCount;
        } catch (scrapingError) {
          console.error(`Failed to process ${result.url}:`, scrapingError);
          scrapingStatus = 'failed';
          errorMessage = scrapingError instanceof Error ? scrapingError.message : 'Unknown error';
          
          // Try to generate summary from snippet if available
          if (result.snippet && result.snippet.length > 50) {
            try {
              const summaryResult = await openaiService.summarizeContent(
                result.snippet,
                result.title,
                result.url
              );
              summary = summaryResult.summary;
              confidence = Math.max(0, summaryResult.confidence - 30); // Reduce confidence for snippet-based summary
              sourcesCount = summaryResult.sourcesCount;
              scrapingStatus = 'partial';
            } catch {
              // If even snippet summarization fails, leave empty
            }
          }
        }

        // Store result
        await storage.createSearchResult({
          searchId,
          title: result.title,
          url: result.url,
          domain: result.domain,
          publishedDate,
          readingTime,
          scrapingStatus,
          summary,
          confidence,
          sourcesCount,
          errorMessage,
        });
      } catch (error) {
        console.error(`Error processing result ${result.url}:`, error);
        // Continue with other results even if one fails
      }
    }

    // Update search status
    const searchTime = Date.now() - startTime;
    await storage.updateSearchStatus(searchId, 'completed', searchResults.length, searchTime);
  } catch (error) {
    console.error(`Search processing error for search ${searchId}:`, error);
    await storage.updateSearchStatus(searchId, 'error');
  }
}
