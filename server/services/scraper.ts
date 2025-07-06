import * as cheerio from 'cheerio';

export interface ScrapedContent {
  content: string;
  readingTime: string;
  publishedDate?: string;
}

export interface ScrapeResult {
  summary: string;
  confidence: number;
  length: number;
  source: string;
}

export async function scrapeAndSummarize(url: string, controller: AbortController): Promise<ScrapeResult> {
  try {
    // 1. Fetch the webpage with timeout and headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/90 Safari/537.36',
      },
      signal: controller.signal,
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // 2. Clean out noise
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

    // 3. Target likely content areas
    const contentSelectors = [
      'article', '[role="main"]', '.content', 
      '.post-content', '.entry-content', 'main'
    ];

    let content = contentSelectors
      .map(selector => $(selector).text())
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // 4. Confidence scoring logic
    let confidence = 40; // Base fallback score

    // Increase confidence with quality signals
    if (content.length > 300) confidence += 10;
    if (content.length > 1000) confidence += 10;

    const structuralBoosts = [
      /(introduction|conclusion|summary)/i, // headers
      /\d{2,}/,                              // data
      /(study|research|according to)/i       // references
    ];

    if (structuralBoosts[0].test(content)) confidence += 5;
    if (structuralBoosts[1].test(content)) confidence += 3;
    if (structuralBoosts[2].test(content)) confidence += 7;

    // Cap confidence between 40 and 85 for fallback
    confidence = Math.min(Math.max(confidence, 40), 85);

    // 5. Generate a basic fallback summary
    const summary = generateFallbackSummary(content);

    return {
      summary,
      confidence,
      length: content.length,
      source: url,
    };
  } catch (error) {
    console.error('Scrape error:', error);
    return {
      summary: 'Error fetching or parsing content.',
      confidence: 0,
      length: 0,
      source: url,
    };
  }
}

// Simple fallback summarizer (can be replaced with LLM if quota available)
function generateFallbackSummary(content: string): string {
  if (!content || content.length < 100) return 'Not enough content to summarize.';

  // Grab first few sentences for fallback
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 3).join(' ').trim();
}

export class ScraperService {
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

      // Extract main content using improved selector approach
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        'main',
        '.main-content'
      ];

      let content = contentSelectors
        .map(selector => $(selector).text())
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      // Fallback to body content if no specific content area found
      if (!content || content.length < 100) {
        content = $('body').text().trim();
      }

      // Clean up content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      if (content.length < 100) {
        throw new Error('Insufficient content extracted');
      }

      // Estimate reading time (average 200 words per minute)
      const wordCount = content.split(/\s+/).length;
      const readingMinutes = Math.ceil(wordCount / 200);
      const readingTime = `${readingMinutes} min read`;

      // Try to extract published date
      let publishedDate: string | undefined;
      const dateSelectors = [
        'time[datetime]',
        '.published',
        '.date',
        '.post-date',
        '.entry-date'
      ];

      for (const selector of dateSelectors) {
        const dateElement = $(selector);
        if (dateElement.length > 0) {
          publishedDate = dateElement.attr('datetime') || dateElement.text().trim();
          break;
        }
      }

      return {
        content: content.substring(0, 8000), // Limit content length
        readingTime,
        publishedDate,
      };
    } catch (error) {
      console.error(`Scraping error for ${url}:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw new Error(`Failed to scrape content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const scraperService = new ScraperService();
