export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export class SearchService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERP_API_KEY || process.env.SEARCH_API_KEY || "";
    if (!this.apiKey) {
      console.warn("No search API key found. Using mock data for development.");
    }
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.apiKey) {
      // Return mock data for development
      return this.getMockResults(query, limit);
    }

    try {
      const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${this.apiKey}&num=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Search API error: ${data.error}`);
      }

      return (data.organic_results || []).slice(0, limit).map((result: any) => ({
        title: result.title || "Untitled",
        url: result.link || "",
        snippet: result.snippet || "",
        domain: this.extractDomain(result.link || ""),
      }));
    } catch (error) {
      console.error("Search API error:", error);
      throw new Error("Failed to search the web. Please try again later.");
    }
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  }

  private getMockResults(query: string, limit: number): SearchResult[] {
    const mockResults = [
      {
        title: "The Future of AI: 10 Trends That Will Shape 2024 and Beyond",
        url: "https://techcrunch.com/ai-trends-2024",
        snippet: "Comprehensive analysis of AI trends including multimodal systems, safety governance, and democratization of AI tools.",
        domain: "techcrunch.com"
      },
      {
        title: "AI in Healthcare: Revolutionary Applications and Ethical Considerations",
        url: "https://nature.com/ai-healthcare-ethics",
        snippet: "Research on AI's impact in healthcare covering diagnostic imaging, drug discovery, and ethical frameworks.",
        domain: "nature.com"
      },
      {
        title: "Machine Learning Infrastructure: Scaling AI for Enterprise",
        url: "https://aws.amazon.com/ml-infrastructure",
        snippet: "Technical guide on enterprise ML infrastructure, MLOps practices, and deployment strategies.",
        domain: "aws.amazon.com"
      },
      {
        title: "Ethics in AI: Building Responsible Artificial Intelligence Systems",
        url: "https://mit.edu/ai-ethics",
        snippet: "Academic paper on ethical AI development principles including fairness, transparency, and accountability.",
        domain: "mit.edu"
      },
      {
        title: "AI-Powered Content Creation: Tools and Techniques for 2024",
        url: "https://content-creation-blog.com/ai-tools",
        snippet: "Overview of AI content creation tools and their applications in modern workflows.",
        domain: "content-creation-blog.com"
      }
    ];

    return mockResults.slice(0, limit);
  }
}

export const searchService = new SearchService();
