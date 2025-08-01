# WebScrape Summarizer

## Overview
This full-stack web application enables users to search the web, scrape content from search results, and generate AI-powered summaries. The project aims to provide a clean interface for comprehensive search results, including metadata, scraping status, and AI summaries, with a vision for future subscription-based services and advanced features.

## User Preferences
Preferred communication style: Simple, everyday language.

**Account Deletion Protocol**: When user requests to remove/delete emails or accounts from Supabase, perform complete deletion including:
- Remove from Supabase Auth system
- Remove from users table in database
- Clean up all related data (searches, search results, etc.)

## System Architecture

### Full-Stack Structure
- **Frontend**: React-based SPA with TypeScript and Vite, using shadcn/ui components and Tailwind CSS.
- **Backend**: Express.js server with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Deployment**: Replit with autoscale deployment, Node.js 20 runtime, and PostgreSQL 16 module.

### Frontend Architecture
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack Query for server state.
- **UI/UX**: shadcn/ui component library with Radix UI primitives, styled with Tailwind CSS (CSS variables for theming).
- **Form Handling**: React Hook Form with Zod validation.
- **User Experience**: Homepage accessible without login, but search functionality requires authentication. Informational messages guide users to create an account. All search endpoints require authentication; no data is saved for non-logged-in users.

### Backend Architecture
- **API**: RESTful API built with Express.
- **Database Layer**: Drizzle ORM for PostgreSQL.
- **Service Layers**:
    - **Search Service**: Web search via SERP API.
    - **Scraper Service**: Content extraction with Cheerio.
    - **OpenAI Service**: AI-powered content summarization.
- **Storage Layer**: Abstracted storage interface with memory fallback.
- **Authentication**: Full user authentication with Supabase Auth, including email/password registration, login, and secure password reset. Supports email verification.
- **Security**: Row Level Security (RLS) policies implemented for data isolation, ensuring users only access their own data. Service role permissions are configured for backend and admin functions.
- **Stripe Integration**: Implemented Stripe Checkout for subscription management (Pro and Premium plans) with webhook-based fulfillment and idempotent processing.

### Database Schema
- **Tables**: `Searches` (tracks queries, status, metadata) and `Search Results` (stores scraped content, summaries, confidence scores).
- **User Data**: Captures subscription status, Stripe IDs, and search limits.
- **Data Flow**: User submits a search, backend initiates async processing (web search, scraping, AI summarization), and real-time status updates are provided. OpenAI API calls are consolidated to one per search for efficiency.

## External Dependencies

### Required API Keys
- **SERP API**: `SERP_API_KEY` or `SEARCH_API_KEY`
- **OpenAI API**: `OPENAI_API_KEY` or `OPENAI_KEY`
- **Database**: PostgreSQL connection via `DATABASE_URL`

### Key Libraries
- **Frontend**: React, Vite, TanStack Query, Wouter, Tailwind CSS.
- **Backend**: Express, Drizzle ORM, Cheerio, OpenAI SDK.
- **Database**: PostgreSQL with Neon serverless driver.
- **UI**: shadcn/ui with Radix UI primitives.
- **Authentication**: Supabase Auth.
- **Payments**: Stripe.

### Development Tools
- **TypeScript**: For full type safety.
- **ESLint/Prettier**: For code formatting and linting.
- **Vite**: For fast development and building.
- **Drizzle Kit**: For database migrations and schema management.