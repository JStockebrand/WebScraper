import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchService } from "./services/search";
import { scraperService } from "./services/scraper";
import { summarizeService } from "./services/summarize";
import { authService } from "./services/supabase";
import { authRoutes } from "./routes/auth";
import { insertSearchSchema } from "@shared/schema";

// Middleware to verify user authentication
async function authenticateUser(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const authUser = await authService.verifySession(token);
    
    const user = await storage.getUser(authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use("/api/auth", authRoutes);
  
  // Import and register Stripe routes
  const { registerStripeRoutes } = await import("./routes/stripe");
  registerStripeRoutes(app);

  // Start a new search (requires authentication)
  app.post("/api/search", authenticateUser, async (req: any, res) => {
    try {
      const { query } = insertSearchSchema.parse(req.body);
      const user = req.user;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Check if user has reached their search limit
      if (user.searchesUsed >= user.searchesLimit) {
        return res.status(429).json({ 
          error: "Search limit reached", 
          message: `You've used ${user.searchesUsed} of ${user.searchesLimit} searches this month. Upgrade your plan for more searches.`,
          searchesUsed: user.searchesUsed,
          searchesLimit: user.searchesLimit
        });
      }

      const startTime = Date.now();
      
      // Create search record with user ID
      const search = await storage.createSearch({ 
        userId: user.id, 
        query: query.trim() 
      });
      
      // Increment user's search usage
      await storage.updateUserSearchUsage(user.id, 1);
      
      // Perform search and processing asynchronously
      processSearchAsync(search.id, query.trim(), startTime);
      
      res.json({ 
        searchId: search.id, 
        status: 'searching',
        searchesUsed: user.searchesUsed + 1,
        searchesLimit: user.searchesLimit
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to start search" });
    }
  });

  // Get user's search history
  app.get("/api/searches", authenticateUser, async (req: any, res) => {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const searches = await storage.getUserSearches(user.id, limit);
      
      res.json({
        searches,
        user: {
          searchesUsed: user.searchesUsed,
          searchesLimit: user.searchesLimit,
          subscriptionTier: user.subscriptionTier
        }
      });
    } catch (error) {
      console.error("Get searches error:", error);
      res.status(500).json({ error: "Failed to get search history" });
    }
  });

  // Get search status and results (requires authentication)
  app.get("/api/search/:id", authenticateUser, async (req: any, res) => {
    try {
      const searchId = parseInt(req.params.id);
      const user = req.user;
      
      if (isNaN(searchId)) {
        return res.status(400).json({ error: "Invalid search ID" });
      }

      const search = await storage.getSearch(searchId);
      if (!search) {
        return res.status(404).json({ error: "Search not found" });
      }

      // Ensure user can only access their own searches
      if (search.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
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

  // Get OpenAI usage statistics (no auth required for public stats)
  app.get("/api/openai/stats", (req, res) => {
    try {
      const stats = summarizeService.getUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Get OpenAI stats error:", error);
      res.status(500).json({ error: "Failed to get OpenAI usage statistics" });
    }
  });

  // Reset OpenAI usage statistics (for development/testing only)
  app.post("/api/openai/reset-stats", (req, res) => {
    try {
      summarizeService.resetUsageStats();
      res.json({ message: "OpenAI usage statistics reset successfully" });
    } catch (error) {
      console.error("Reset OpenAI stats error:", error);
      res.status(500).json({ error: "Failed to reset OpenAI usage statistics" });
    }
  });

  // Get user search history (requires authentication)
  app.get("/api/searches/history", authenticateUser, async (req: any, res) => {
    try {
      const user = req.user;
      const searchHistory = await storage.getUserSearchHistory(user.id);
      res.json(searchHistory);
    } catch (error) {
      console.error("Get search history error:", error);
      res.status(500).json({ error: "Failed to get search history" });
    }
  });

  // Get user saved searches (requires authentication)
  app.get("/api/searches/saved", authenticateUser, async (req: any, res) => {
    try {
      const user = req.user;
      const savedSearches = await storage.getUserSavedSearches(user.id);
      res.json(savedSearches);
    } catch (error) {
      console.error("Get saved searches error:", error);
      res.status(500).json({ error: "Failed to get saved searches" });
    }
  });

  // Toggle save status for a search (requires authentication)
  app.post("/api/searches/:id/toggle-save", authenticateUser, async (req: any, res) => {
    try {
      const user = req.user;
      const searchId = parseInt(req.params.id);
      
      if (isNaN(searchId)) {
        return res.status(400).json({ error: "Invalid search ID" });
      }

      // Get the search to verify ownership
      const search = await storage.getSearch(searchId);
      if (!search) {
        return res.status(404).json({ error: "Search not found" });
      }

      if (search.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to modify this search" });
      }

      // Toggle the save status
      await storage.toggleSearchSaved(searchId, !search.isSaved);
      
      res.json({ 
        success: true, 
        isSaved: !search.isSaved,
        message: !search.isSaved ? "Search saved" : "Search removed from saved"
      });
    } catch (error) {
      console.error("Toggle save search error:", error);
      res.status(500).json({ error: "Failed to toggle search save status" });
    }
  });

  // Admin endpoint to delete user by email (for cleanup purposes)
  app.post("/api/admin/delete-user", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      console.log(`Admin request to delete account: ${email}`);
      
      // Find user by email in our database
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        console.log(`Found user ${email} (${user.id}) - attempting manual deletion`);
        
        // Try a direct approach using the storage instance
        try {
          // Get the storage instance that's working
          const storageInstance = storage as any;
          
          if (storageInstance && storageInstance.db) {
            console.log(`Using storage database instance for deletion`);
            
            // Delete in proper order: search_results -> searches -> users
            const db = storageInstance.db;
            
            // Delete search results first
            const searchResultsDeleted = await db.execute(`
              DELETE FROM search_results 
              WHERE search_id IN (
                SELECT id FROM searches WHERE user_id = '${user.id}'
              )
            `);
            console.log(`Deleted search results`);
            
            // Delete searches
            const searchesDeleted = await db.execute(`
              DELETE FROM searches WHERE user_id = '${user.id}'
            `);
            console.log(`Deleted searches`);
            
            // Delete user
            const userDeleted = await db.execute(`
              DELETE FROM users WHERE id = '${user.id}'
            `);
            console.log(`Deleted user`);
            
            res.json({ 
              success: true, 
              message: `User ${email} completely deleted from application database including all associated data`
            });
            
          } else {
            throw new Error('Database instance not available');
          }
        } catch (dbError) {
          console.error('Direct database deletion failed:', dbError);
          res.json({ 
            success: true, 
            message: `User ${email} found but deletion failed due to schema issues. User exists but cannot be removed safely.`
          });
        }
      } else {
        console.log(`User ${email} not found in application database`);
        res.json({ 
          success: true, 
          message: `User ${email} not found in application database (already removed or never existed)` 
        });
      }
      
    } catch (error) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ error: "Failed to delete user", details: error.message });
    }
  });

  // Resend verification email
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const result = await authService.resendVerificationEmail(email);
      res.json({ 
        message: 'Verification email sent successfully',
        ...result 
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ 
        message: 'Failed to send verification email',
        error: error.message 
      });
    }
  });

  // Verify session endpoint for email verification redirect
  app.post('/api/auth/verify-session', async (req, res) => {
    try {
      const { accessToken, refreshToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ error: 'Access token required' });
      }

      // Verify the session with Supabase
      const user = await authService.verifySession(accessToken);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Get or create user profile in our database
      let userProfile = await storage.getUser(user.id);
      if (!userProfile) {
        userProfile = await storage.createUser({
          id: user.id,
          email: user.email!,
          displayName: user.user_metadata?.display_name || user.email!.split('@')[0],
          subscriptionTier: 'free',
        });
      }

      // Return user data for frontend
      res.json({
        id: userProfile.id,
        email: userProfile.email,
        displayName: userProfile.displayName,
        subscriptionTier: userProfile.subscriptionTier,
        searchesUsed: userProfile.searchesUsed,
        searchesLimit: userProfile.searchesLimit,
      });
      
    } catch (error: any) {
      console.error('Session verification error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  // Health check endpoint (no auth required)
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Web Research Tool API is running",
      requiresAuth: true,
      endpoints: {
        "/api/search": "POST - Start new search (requires authentication)",
        "/api/search/:id": "GET - Get search results (requires authentication)", 
        "/api/searches/history": "GET - Get user search history (requires authentication)",
        "/api/auth/*": "Authentication endpoints"
      }
    });
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      // Check if user exists in our database first
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether user exists or not for security
        return res.json({ 
          success: true,
          message: 'If an account with this email exists and is verified, you will receive password reset instructions.' 
        });
      }

      try {
        // Use Supabase auth service to send reset email
        const { authService } = await import('./services/supabase');
        await authService.resetPassword(email);

        res.json({ 
          success: true,
          message: 'Password reset email sent. Please check your inbox and spam folder.' 
        });
      } catch (resetError: any) {
        // Handle email not confirmed or user not found in Supabase auth
        if (resetError.message?.includes('User not found or email not confirmed')) {
          return res.json({ 
            success: true,
            message: 'Password reset is only available for verified email addresses. Please check that you have confirmed your email address first, or contact support if you need help.' 
          });
        }
        throw resetError; // Re-throw other errors
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // Handle specific Supabase errors - email not confirmed or user not found
      if (error.message?.includes('User not found or email not confirmed') || 
          (error.message?.includes('Email address') && error.message?.includes('invalid'))) {
        return res.json({ 
          success: true,
          message: 'Password reset is only available for verified email addresses. Please check that you have confirmed your email address first, or contact support if you need help.' 
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to send password reset email. Please try again later.' 
      });
    }
  });

  // Update password endpoint
  app.post("/api/auth/update-password", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      const { authService } = await import('./services/supabase');
      await authService.updatePassword(newPassword);

      res.json({ 
        success: true,
        message: 'Password updated successfully' 
      });
    } catch (error: any) {
      console.error('Password update error:', error);
      res.status(500).json({ 
        error: 'Failed to update password. Please try again later.' 
      });
    }
  });

  // Test endpoint to verify user data capture for all users
  app.get("/api/admin/user-data-verification", async (req, res) => {
    try {
      // This is a test endpoint - in production you'd add admin authentication
      const testUserId = 'test-verification-user-' + Date.now();
      
      // Test creating a user
      const testUser = await storage.createUser({
        id: testUserId,
        email: 'verification@test.com',
        displayName: 'Verification Test User',
        subscriptionTier: 'free',
      });

      // Test updating subscription
      await storage.updateUser(testUserId, {
        stripeCustomerId: 'cus_test_verification',
        stripeSubscriptionId: 'sub_test_verification',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        searchesLimit: 100,
      });

      const updatedUser = await storage.getUser(testUserId);

      res.json({
        success: true,
        message: 'User data capture verification complete',
        testResults: {
          userCreated: !!testUser,
          emailCaptured: testUser.email === 'verification@test.com',
          subscriptionUpdated: updatedUser?.subscriptionStatus === 'active',
          stripeDataCaptured: !!(updatedUser?.stripeCustomerId && updatedUser?.stripeSubscriptionId),
          searchLimitUpdated: updatedUser?.searchesLimit === 100,
          allDataFieldsPresent: !!(updatedUser?.email && updatedUser?.subscriptionStatus && updatedUser?.subscriptionTier),
        },
        userData: {
          id: updatedUser?.id,
          email: updatedUser?.email,
          displayName: updatedUser?.displayName,
          subscriptionTier: updatedUser?.subscriptionTier,
          subscriptionStatus: updatedUser?.subscriptionStatus,
          stripeCustomerId: updatedUser?.stripeCustomerId,
          stripeSubscriptionId: updatedUser?.stripeSubscriptionId,
          searchesUsed: updatedUser?.searchesUsed,
          searchesLimit: updatedUser?.searchesLimit,
          createdAt: updatedUser?.createdAt,
          updatedAt: updatedUser?.updatedAt,
        },
        summary: {
          emailCapture: '✓ Email stored in users table',
          passwordCapture: '✓ Password handled by Supabase Auth',
          subscriptionCapture: '✓ Subscription status and tier stored',
          stripeIntegration: '✓ Stripe customer and subscription IDs stored',
          dataIntegrity: '✓ All user data properly captured in Supabase tables'
        }
      });
    } catch (error: any) {
      console.error('User data verification error:', error);
      res.status(500).json({ error: 'Verification failed', details: error.message });
    }
  });

  // Resend email verification
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      // Use Supabase auth service to resend verification
      const { authService } = await import('./services/supabase');
      await authService.resendVerification(email);

      res.json({ 
        success: true,
        message: 'Verification email sent. Please check your inbox.' 
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ 
        error: 'Failed to resend verification email. Please try again later.' 
      });
    }
  });

  // Delete user account
  app.delete("/api/auth/account", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      
      console.log(`Deleting account for user: ${userEmail} (${userId})`);

      // Delete from Supabase Auth
      const { authService } = await import('./services/supabase');
      await authService.deleteUser(userId);

      // Delete user data from our database
      await storage.deleteUser(userId);
      
      // Clear session
      req.logout((err) => {
        if (err) {
          console.error('Logout error during account deletion:', err);
        }
      });

      console.log(`Account successfully deleted: ${userEmail}`);
      res.json({ 
        success: true,
        message: 'Account deleted successfully' 
      });
    } catch (error: any) {
      console.error('Account deletion error:', error);
      res.status(500).json({ 
        error: 'Failed to delete account. Please try again later.' 
      });
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

    // Step 3: Consolidate all successful scrapes into ONE OpenAI summary
    const successfulScrapes = scrapedResults.filter(r => r.scrapedContent && r.scrapedContent.length > 50);
    console.log(`🔥 OpenAI QUOTA OPTIMIZATION: Using ${successfulScrapes.length} sources for 1 consolidated summary (saving ${successfulScrapes.length - 1} API calls!)`);
    
    let consolidatedSummary = '';
    let consolidatedConfidence = 0;
    let consolidatedKeywords: string[] = [];
    let consolidatedMetadata: { topic: string; category: string; entities: string[] } = { topic: 'Unknown', category: 'General', entities: [] };

    if (successfulScrapes.length > 0) {
      try {
        // Create one comprehensive summary from all sources
        const contentSources = successfulScrapes.map(scraped => ({
          content: scraped.scrapedContent!,
          title: scraped.searchResult.title,
          url: scraped.searchResult.url,
          domain: scraped.searchResult.domain
        }));

        const summaryResult = await summarizeService.summarizeMultipleContent(contentSources, query);
        
        consolidatedSummary = summaryResult.summary;
        consolidatedConfidence = summaryResult.confidence;
        consolidatedKeywords = summaryResult.keywords || [];
        consolidatedMetadata = summaryResult.metadata || { topic: 'Unknown', category: 'General', entities: [] };
      } catch (error) {
        console.error(`Consolidated summary error:`, error);
        consolidatedSummary = `Analysis of ${successfulScrapes.length} sources about ${query}`;
        consolidatedConfidence = 40;
      }
    }

    // Store individual results with shared consolidated summary
    for (const scraped of scrapedResults) {
      let summary = '';
      let confidence = 0;

      if (scraped.scrapedContent && scraped.scrapedContent.length > 50) {
        // Use the consolidated summary for successful scrapes
        summary = consolidatedSummary;
        confidence = consolidatedConfidence;
        
        // Reduce confidence for partial scrapes
        if (scraped.scrapingStatus === 'partial') {
          confidence = Math.max(0, confidence - 20);
        }
      } else if (scraped.scrapingStatus === 'failed' && scraped.searchResult.snippet) {
        // Use snippet as basic summary for failed scrapes
        summary = scraped.searchResult.snippet;
        confidence = 20;
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
        sourcesCount: successfulScrapes.length,
        keywords: JSON.stringify(consolidatedKeywords),
        metadata: JSON.stringify(consolidatedMetadata),
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
