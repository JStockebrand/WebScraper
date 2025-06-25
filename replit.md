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

## Changelog
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.