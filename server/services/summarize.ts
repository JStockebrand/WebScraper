import OpenAI from "openai";

// Using gpt-3.5-turbo as requested by user for cost optimization
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

export interface SummaryResult {
  summary: string;
  confidence: number;
  sourcesCount: number;
}

export interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  quotaExceededCount: number;
  lastQuotaExceededAt: Date | null;
  consecutiveFailures: number;
}

export class SummarizeService {
  private usageStats: ApiUsageStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    quotaExceededCount: 0,
    lastQuotaExceededAt: null,
    consecutiveFailures: 0
  };

  private isQuotaExhausted = false;
  private quotaCheckTime = 0;
  private readonly QUOTA_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown after quota exhaustion

  async summarizeContent(content: string, title: string, url: string): Promise<SummaryResult> {
    // Check if we should skip API calls due to recent quota exhaustion
    if (this.shouldSkipApiCall()) {
      this.logQuotaSkip();
      return this.generateFallbackSummary(content, title);
    }

    if (!openai.apiKey) {
      this.logError("No OpenAI API key found", null);
      return this.generateFallbackSummary(content, title);
    }

    this.usageStats.totalRequests++;
    const requestStartTime = Date.now();

    try {
      this.logApiRequest(title, url, content.length);

      const prompt = `Analyze and summarize the following article content. Focus on key points, main arguments, and important findings. 

Article Title: ${title}
Source URL: ${url}
Content: ${content.substring(0, 4000)} ${content.length > 4000 ? '...' : ''}

Please provide a concise summary that captures the essence of the article while being informative and objective. The summary should be 2-3 sentences long and highlight the most important information.

Additionally, assess:
1. Your confidence in the summary quality (0-100)
2. Number of distinct sources or references mentioned in the content

Respond with JSON in this format: { "summary": "string", "confidence": number, "sourcesCount": number }`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using gpt-3.5-turbo as requested for cost optimization
        messages: [
          {
            role: "system",
            content: "You are an expert content summarizer. Provide accurate, concise summaries and assess content quality objectively."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300, // Reduced for cost optimization
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const duration = Date.now() - requestStartTime;

      this.logApiSuccess(duration, response.usage);
      this.usageStats.successfulRequests++;
      this.usageStats.consecutiveFailures = 0;
      this.isQuotaExhausted = false; // Reset quota exhaustion on success

      return {
        summary: result.summary || "Unable to generate summary",
        confidence: Math.max(0, Math.min(100, result.confidence || 0)),
        sourcesCount: Math.max(0, result.sourcesCount || 0),
      };
    } catch (error) {
      const duration = Date.now() - requestStartTime;
      this.usageStats.failedRequests++;
      this.usageStats.consecutiveFailures++;

      if (this.isQuotaError(error)) {
        this.handleQuotaError(error, duration);
        return this.generateFallbackSummary(content, title);
      } else if (this.isRateLimitError(error)) {
        this.handleRateLimitError(error, duration);
        return this.generateFallbackSummary(content, title);
      } else {
        this.logError("OpenAI API error", error, duration);
        throw new Error("Failed to generate summary using AI");
      }
    }
  }

  private shouldSkipApiCall(): boolean {
    if (!this.isQuotaExhausted) return false;
    
    const timeSinceQuotaError = Date.now() - this.quotaCheckTime;
    if (timeSinceQuotaError > this.QUOTA_COOLDOWN) {
      this.isQuotaExhausted = false;
      this.quotaCheckTime = 0;
      console.log("🔄 OpenAI quota cooldown period ended, resuming API calls");
      return false;
    }
    
    return true;
  }

  private isQuotaError(error: any): boolean {
    return error?.status === 429 && 
           (error?.code === 'insufficient_quota' || 
            error?.message?.includes('quota') ||
            error?.message?.includes('billing'));
  }

  private isRateLimitError(error: any): boolean {
    return error?.status === 429 && 
           (error?.code === 'rate_limit_exceeded' ||
            error?.message?.includes('rate limit'));
  }

  private handleQuotaError(error: any, duration: number): void {
    this.usageStats.quotaExceededCount++;
    this.usageStats.lastQuotaExceededAt = new Date();
    this.isQuotaExhausted = true;
    this.quotaCheckTime = Date.now();

    console.error(`❌ OpenAI QUOTA EXCEEDED [${duration}ms]`);
    console.error(`📊 Quota Stats: Total failures: ${this.usageStats.quotaExceededCount}, Consecutive: ${this.usageStats.consecutiveFailures}`);
    console.error(`🔒 Quota exhausted, switching to fallback summaries for ${this.QUOTA_COOLDOWN / 1000 / 60} minutes`);
    console.error(`💡 Error details: ${error?.error?.message || error?.message}`);
    
    if (error?.error?.code) {
      console.error(`📋 Error code: ${error.error.code}`);
    }
  }

  private handleRateLimitError(error: any, duration: number): void {
    console.warn(`⚠️  OpenAI RATE LIMIT [${duration}ms] - requests too frequent`);
    console.warn(`📊 Will retry with fallback summary`);
    console.warn(`💡 Error details: ${error?.error?.message || error?.message}`);
  }

  private logApiRequest(title: string, url: string, contentLength: number): void {
    console.log(`🔄 OpenAI API Request #${this.usageStats.totalRequests + 1}`);
    console.log(`📄 Title: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);
    console.log(`🌐 URL: ${url}`);
    console.log(`📝 Content length: ${contentLength} chars`);
  }

  private logApiSuccess(duration: number, usage: any): void {
    console.log(`✅ OpenAI API Success [${duration}ms]`);
    if (usage) {
      console.log(`📊 Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`);
    }
    console.log(`📈 Success rate: ${Math.round((this.usageStats.successfulRequests + 1) / (this.usageStats.totalRequests) * 100)}%`);
  }

  private logError(message: string, error: any, duration?: number): void {
    const durationStr = duration ? ` [${duration}ms]` : '';
    console.error(`❌ ${message}${durationStr}`);
    if (error) {
      console.error(`💡 Error details: ${error?.message || error}`);
      if (error?.status) console.error(`📋 HTTP Status: ${error.status}`);
      if (error?.code) console.error(`📋 Error Code: ${error.code}`);
    }
  }

  private logQuotaSkip(): void {
    const remainingCooldown = Math.ceil((this.QUOTA_COOLDOWN - (Date.now() - this.quotaCheckTime)) / 1000 / 60);
    console.log(`⏭️  Skipping OpenAI API call due to quota exhaustion (${remainingCooldown} min cooldown remaining)`);
  }

  private generateFallbackSummary(content: string, title: string): SummaryResult {
    console.log(`🔄 Generating fallback summary for: ${title.substring(0, 50)}...`);
    
    // Extract first few meaningful sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 2).join('. ').trim() + '.';
    
    // Enhanced confidence based on content quality indicators
    const wordCount = content.split(/\s+/).length;
    const hasStructure = /\b(introduction|conclusion|summary|abstract)\b/i.test(content);
    const hasNumbers = /\d+/.test(content);
    const hasReferences = /\b(study|research|according to|found that)\b/i.test(content);
    
    let confidence = Math.min(85, Math.max(40, Math.floor(wordCount / 15)));
    if (hasStructure) confidence += 5;
    if (hasNumbers) confidence += 3;
    if (hasReferences) confidence += 7;
    
    // Count potential sources more accurately
    const urlMatches = content.match(/https?:\/\/[^\s]+/g) || [];
    const citationMatches = content.match(/[\[\(]\d+[\]\)]|\b(et al\.|doi:|isbn:)/gi) || [];
    const referenceMatches = content.match(/\b(source|reference|citation|study|research|according to)\b/gi) || [];
    
    const sourcesCount = Math.min(urlMatches.length + citationMatches.length + Math.floor(referenceMatches.length / 3), 10);
    
    const result = {
      summary: summary.length > 10 ? summary : `Summary of ${title}: ${content.substring(0, 200)}...`,
      confidence: Math.max(40, Math.min(85, confidence)),
      sourcesCount
    };

    console.log(`✅ Fallback summary generated - confidence: ${result.confidence}%, sources: ${result.sourcesCount}`);
    return result;
  }

  // Public method to get usage statistics
  getUsageStats(): ApiUsageStats {
    return { ...this.usageStats };
  }

  // Public method to reset usage statistics
  resetUsageStats(): void {
    this.usageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      quotaExceededCount: 0,
      lastQuotaExceededAt: null,
      consecutiveFailures: 0
    };
    this.isQuotaExhausted = false;
    this.quotaCheckTime = 0;
    console.log("📊 OpenAI usage statistics reset");
  }
}

export const summarizeService = new SummarizeService();