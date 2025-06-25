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
      throw new Error("OpenAI API key not configured");
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
      throw new Error("Failed to generate summary using AI");
    }
  }
}

export const openaiService = new OpenAIService();
