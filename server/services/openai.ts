import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

export interface SummaryResult {
  summary: string;
  confidence: number;
  sourcesCount: number;
}

export class OpenAIService {
  async summarizeContent(content: string, title: string, url: string): Promise<SummaryResult> {
    if (!openai.apiKey) {
      return this.generateFallbackSummary(content, title);
    }

    try {
      const prompt = `Analyze and summarize the following article content. Focus on key points, main arguments, and important findings. 

Article Title: ${title}
Source URL: ${url}
Content: ${content}

Please provide a concise summary that captures the essence of the article while being informative and objective. The summary should be 2-3 sentences long and highlight the most important information.

Additionally, assess:
1. Your confidence in the summary quality (0-100)
2. Number of distinct sources or references mentioned in the content

Respond with JSON in this format: { "summary": "string", "confidence": number, "sourcesCount": number }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 500,
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        summary: result.summary || "Unable to generate summary",
        confidence: Math.max(0, Math.min(100, result.confidence || 0)),
        sourcesCount: Math.max(0, result.sourcesCount || 0),
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      // Fallback to basic summary if API fails
      if (error instanceof Error && (error.message.includes('quota') || error.message.includes('429'))) {
        console.warn("OpenAI quota exceeded, using fallback summary");
        return this.generateFallbackSummary(content, title);
      }
      throw new Error("Failed to generate summary using AI");
    }
  }

  private generateFallbackSummary(content: string, title: string): SummaryResult {
    // Extract first few sentences as summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 2).join('. ').trim() + '.';
    
    // Basic confidence based on content length and structure
    const wordCount = content.split(/\s+/).length;
    const confidence = Math.min(85, Math.max(40, Math.floor(wordCount / 10)));
    
    // Count potential sources (URLs, citations, references)
    const sourcesCount = (content.match(/https?:\/\/|www\.|@\w+|[\[\(]\d+[\]\)]|\b(source|reference|citation)\b/gi) || []).length;
    
    return {
      summary: summary.length > 10 ? summary : `Summary of ${title}: ${content.substring(0, 200)}...`,
      confidence,
      sourcesCount: Math.min(sourcesCount, 10)
    };
  }
}

export const openaiService = new OpenAIService();
