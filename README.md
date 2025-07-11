# Web Scrape Summarizer

A streamlined web application that allows users to search the web, scrape content from search results, and generate AI-powered summaries of the found content.

## Features

- **Real-time Web Search**: Powered by SerpAPI Google Search
- **Smart Content Scraping**: Extracts content from web pages using Cheerio
- **AI-Powered Summaries**: Uses OpenAI's gpt-3.5-turbo for intelligent content summarization
- **Quality Filtering**: Only displays results with >80% confidence scores
- **Complete URL Tracking**: Shows all 10 searched URLs with expandable details
- **Clean UI**: Simple search interface with card-based results display

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **AI**: OpenAI GPT-3.5-turbo
- **Search**: SerpAPI Google Search
- **Scraping**: Cheerio
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd webscrape-summarizer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example environment file
cp .env.example .env

# Add your API keys:
OPENAI_API_KEY=your_openai_api_key
SERP_API_KEY=your_serpapi_key
DATABASE_URL=your_postgresql_url
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

- `OPENAI_API_KEY`: OpenAI API key for content summarization
- `SERP_API_KEY`: SerpAPI key for Google search results
- `DATABASE_URL`: PostgreSQL database connection string

## API Endpoints

- `POST /api/search` - Create a new search
- `GET /api/search/:id` - Get search results and status

## Project Structure

```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Application pages
│   │   └── lib/         # Utilities and query client
├── server/           # Express backend
│   ├── services/     # Business logic services
│   └── routes.ts     # API routes
├── shared/           # Shared types and schemas
└── package.json      # Dependencies and scripts
```

## How It Works

1. User enters a search query
2. System searches Google for 10 relevant URLs
3. Content is scraped from each URL using Cheerio
4. OpenAI analyzes and summarizes the content
5. Only high-confidence results (>80%) are displayed
6. Users can view all searched URLs in an expandable list

## Deployment

This application is optimized for deployment on platforms like Vercel, Netlify, or traditional hosting:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## License

MIT License - see LICENSE file for details