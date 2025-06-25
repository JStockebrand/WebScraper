import * as cheerio from 'cheerio';

export interface ScrapedContent {
  content: string;
  readingTime: string;
  publishedDate?: string;
}

export class ScraperService {
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

      // Extract main content
      let content = '';
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

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }

      // Fallback to body content if no specific content area found
      if (!content) {
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
      throw new Error(`Failed to scrape content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const scraperService = new ScraperService();
