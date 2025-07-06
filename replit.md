# WebScrape Summarizer

## Overview

This is a full-stack web application that allows users to search the web, scrape content from search results, and generate AI-powered summaries of the found content. The application provides a clean interface for entering search queries and displays comprehensive results with metadata, scraping status, and AI-generated summaries.

## System Architecture

### Full-Stack Structure
- **Frontend**: React-based SPA with TypeScript and Vite
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend, ESBuild for backend
- **UI Framework**: shadcn/ui components with Tailwind CSS

### Deployment Environment
- **Platform**: Replit with autoscale deployment
- **Runtime**: Node.js 20
- **Database**: PostgreSQL 16 module
- **Port Configuration**: Internal port 5000, external port 80

## Key Components

### Frontend Architecture
- **React Router**: Using Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Express Server**: RESTful API with TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL
- **Service Layer**: 
  - Search Service: Web search functionality via SERP API
  - Scraper Service: Content extraction with Cheerio
  - OpenAI Service: AI-powered content summarization
- **Storage Layer**: Abstracted storage interface with memory fallback

### Database Schema
- **Searches Table**: Tracks search queries, status, and metadata
- **Search Results Table**: Stores scraped content, summaries, and confidence scores
- **Status Tracking**: Comprehensive status fields for search and scraping operations

## Data Flow

1. **User Search**: User submits search query through React form
2. **Search Initiation**: Backend creates search record and returns search ID
3. **Async Processing**: 
   - Web search via SERP API
   - Content scraping with Cheerio
   - AI summarization with OpenAI
4. **Status Updates**: Real-time status updates via polling
5. **Results Display**: Frontend shows results with metadata and summaries

## External Dependencies

### Required API Keys
- **SERP API**: Web search functionality (SERP_API_KEY or SEARCH_API_KEY)
- **OpenAI API**: Content summarization (OPENAI_API_KEY or OPENAI_KEY)
- **Database**: PostgreSQL connection (DATABASE_URL)

### Key Libraries
- **Frontend**: React, Vite, TanStack Query, Wouter, Tailwind CSS
- **Backend**: Express, Drizzle ORM, Cheerio, OpenAI SDK
- **Database**: PostgreSQL with Neon serverless driver
- **UI**: shadcn/ui with Radix UI primitives

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESLint/Prettier**: Code formatting and linting
- **Vite**: Fast development server and building
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles server to `dist/index.js`
- **Database**: Drizzle migrations applied via `npm run db:push`

### Environment Configuration
- **Development**: `npm run dev` - runs server with Vite middleware
- **Production**: `npm run start` - serves built assets and API
- **Database**: Uses environment variable for connection string

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Deployment**: Autoscale with health checks on port 5000
- **Workflows**: Automated startup with port waiting

## Recent Changes
- July 6, 2025: Enhanced search quality and filtering:
  - Increased SerpAPI search from 5 to 10 URLs for broader coverage
  - Added confidence-based filtering to only display summaries >80% confidence
  - Updated scraper with improved content extraction and confidence scoring
  - Enhanced UI to show filtered high-quality results count vs total sources
- July 2, 2025: Simplified application to core functionality:
  - Streamlined UI to single search input and results view
  - Removed complex navigation, loading states, and error handling components
  - Consolidated frontend into single-page application with minimal UI
  - Focused on core flow: search topic → find URLs → scrape → summarize
  - Clean card-based results display with essential information only
- July 1, 2025: Enhanced OpenAI integration with comprehensive quota management:
  - Created new summarize.ts service with intelligent quota handling
  - Switched to gpt-3.5-turbo for cost optimization (from gpt-4o)
  - Added comprehensive logging for 429 errors and usage tracking
  - Implemented 5-minute cooldown after quota exhaustion
  - Added API endpoints for usage statistics (/api/openai/stats)
  - Enhanced fallback summary generation with SEO keyword extraction
  - Added metadata extraction (topic categorization, entity recognition)
  - Implemented advanced keyword extraction with stop-word filtering
  - Updated database schema to store keywords and metadata fields
- July 1, 2025: Integrated SerpAPI Google Search for real search results:
  - Replaced mock search data with actual Google search API
  - Added SERP_API_KEY secret configuration
  - Verified complete search-to-summary pipeline functionality
- June 25, 2025: Optimized OpenAI API usage to minimize quota impact:
  - Search engine now finds and validates top 5 links first
  - OpenAI API only processes successfully scraped content (saving failed scrapes from using quota)
  - Added logging to show API call savings in real-time
- June 25, 2025: Fixed 3 breaking changes for production deployment:
  - Updated fetch API to use AbortController instead of deprecated timeout option
  - Resolved TypeScript storage interface type mismatches with proper null handling
  - Added intelligent fallback summary system for OpenAI quota limitations
- June 25, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.