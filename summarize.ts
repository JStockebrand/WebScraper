// summarize.ts
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Attempts to summarize content using OpenAI.
 * Falls back to local summarization if quota exceeded or API fails.
 */
export async function summarizeContent(content: string): Promise<string> {
  if (!content || content.length < 100) {
    return "Not enough content to summarize.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes web content.',
        },
        {
          role: 'user',
          content: `Summarize this content in 3-5 sentences:\n\n${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const summary = response.choices?.[0]?.message?.content;
    return summary?.trim() || fallbackLocalSummary(content);
  } catch (err: any) {
    console.warn("OpenAI summarization failed. Falling back to local summary.");
    if (err.status === 429 || err.code === 'rate_limit_exceeded') {
      return fallbackLocalSummary(content);
    }
    throw err; // Bubble up other errors (e.g. invalid API key)
  }
}

/**
 * Local fallback summarizer using basic sentence extraction.
 */
function fallbackLocalSummary(content: string): string {
  const cleaned = content
    .replace(/\s+/g, ' ')
    .replace(/([.?!])\s*(?=[A-Z])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 50);

  const summarySentences = cleaned.slice(0, 3);
  return summarySentences.join(' ') + (summarySentences.length === 0 ? ' (No detailed info found)' : '');
}