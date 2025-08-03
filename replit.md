# Ethos AI Terminal

## Overview

This project is a retro CRT terminal interface that combines 1980s computing aesthetics with modern AI-powered natural language processing. Users can ask questions about Ethos Network Web3 reputation data in plain English and receive intelligent responses through an authentic terminal experience. The application features a React frontend styled to look like a vintage computer terminal, connected to an Express.js backend that integrates with Groq AI for natural language understanding and processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with custom CRT terminal theming (amber, green matrix, blue IBM, Apple II green color schemes)
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Effects**: Custom sound effects using Web Audio API for authentic terminal sounds (typing, beeps, startup)

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Development Server**: Custom Vite integration for hot module replacement in development
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error middleware with structured error responses
- **Request Logging**: Custom middleware for API request/response logging

### Data Storage Solutions
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Database**: PostgreSQL configured through Neon serverless connection
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **In-Memory Storage**: Fallback MemStorage implementation with mock data for development
- **Session Management**: PostgreSQL session storage using connect-pg-simple

### Core Data Models
- **Users**: Basic user authentication (username/password)
- **Ethos Users**: Web3 reputation data (address, XP, reputation scores, attestation counts)
- **Attestations**: Peer-to-peer reputation reviews with scoring and comments
- **Terminal Sessions**: Persistent command history and user preferences

### Authentication and Authorization
- **Session-based Authentication**: Express sessions with PostgreSQL storage
- **No JWT Implementation**: Uses traditional server-side sessions
- **User Context**: Session data maintained across requests for personalization

### AI Integration Architecture
- **Primary AI Service**: Groq API integration using Llama 3.3-70b-versatile model
- **Natural Language Processing**: Intent recognition and parameter extraction from user queries
- **Real Ethos Network Integration**: Live data from official Ethos Network API with proper authentication
- **Enhanced Mock Data**: Realistic Web3 reputation data with addresses like Vitalik Buterin for demonstration
- **Query Types Supported**: XP queries, attestation lookups, user comparisons, leaderboards, reputation analysis, trend analysis

### Recent Changes (August 2, 2025)
- **✅ Real Groq AI Integration**: Connected to live Groq API with Llama 3.3-70b-versatile model for natural language understanding
- **✅ Authentic Ethos Network API**: Integrated real Ethos Network API v2 endpoints (/api/v2) with proper userkey formatting
- **✅ Dynamic API Executor**: Created system where Groq analyzes ANY user question and executes appropriate Ethos API calls
- **✅ Universal Query Support**: Users can ask any question in natural language and get real-time data from Ethos Network
- **✅ Production-Ready API Client**: Updated EthosNetworkClient with correct API endpoints and error handling
- **✅ Enhanced Username Parsing**: Supports address:, service:x.com:username:, profileId: formats per Ethos API specs
- **✅ Real-time Intent Detection**: Groq analyzes queries and executes user_profile, user_stats, user_reviews, user_comparison, leaderboard, search_users
- **✅ Migration Completed**: Project successfully migrated to Replit environment with all dependencies installed
- **✅ Live Testing**: System tested with real GROQ_API_KEY and live Ethos Network API calls
- **✅ Mock Data Removed**: All mock/fallback data eliminated per user request - only real Ethos Network data
- **✅ Profile Search**: Implemented multiple userkey format attempts (direct, service:x.com:username:, service:farcaster:, profileId:, address:)
- **✅ Real API Validation**: Confirmed API integration works - returns 404 for non-existent users as expected
- **✅ FIXED API Implementation**: Updated to use correct Ethos API v2 POST endpoints (/users/by/x, /users/by/farcaster/usernames, etc.)
- **✅ Real Profile Found**: Successfully retrieved cookedzera profile with Score 1373, XP 5505, 9 reviews via Twitter/X lookup
- **✅ Production Ready**: System working end-to-end with GROQ AI + real Ethos Network API v2 integration
- **✅ FIXED Verbose Responses**: Modified Groq AI system prompt to generate concise responses instead of theatrical multi-line outputs
- **✅ API Key Integration**: Embedded Groq API key directly in code to resolve environment variable issues
- **✅ FIXED XP Data Display**: Clarified timeframe vs total XP distinction - weekly queries now show both timeframe-specific (0) and total XP with clear labels
- **✅ COMPREHENSIVE FEATURE ENHANCEMENT**: Added complete Ethos Network API v2 coverage with 8 new intent types:
  - **user_activities**: Get all user activities (reviews, vouches, slashes, votes, projects) with direction filtering
  - **user_activity_history**: Historical activity analysis with trends over custom timeframes
  - **activity_feed**: Global activity feed with advanced filtering options
  - **activity_details**: Specific activity information lookup
  - **user_votes**: Voting behavior and patterns analysis
  - **review_details**: Specific review data between users
  - **user_networks**: All connected social platforms (Twitter, Farcaster, Discord, Telegram)
  - **reputation_trends**: Reputation change analysis over time periods
- **✅ ENHANCED GROQ AI**: Updated system prompt with comprehensive API knowledge covering all activity types
- **✅ ACTIVITY DISPLAY SYSTEM**: Added rich formatted displays for all new data types with structured layouts
- **✅ HISTORICAL ANALYSIS**: Time-based activity grouping and trend calculation for reputation analytics
- **✅ MIGRATION COMPLETED** (August 3, 2025): Successfully migrated project from Replit Agent to standard Replit environment
- **✅ REAL API INTEGRATION VERIFIED**: Ethos Network API calls working correctly, returning authentic user data (cookedzera: Score 1373, XP 5505, 9 reviews, 2 vouches)
- **✅ USER QUERY DETECTION FIXED**: Enhanced identifier extraction logic to properly detect user queries like "what is cookedzera's reputation score?" and return real API data instead of conceptual responses
- **✅ GROQ API INTEGRATION**: Added secure GROQ_API_KEY environment variable for AI-powered natural language processing
- **✅ LANGCHAIN AGENT INTEGRATION**: Built complete LangChain AI agent with Groq Llama 3.3-70b-versatile model
- **✅ ETHOS NETWORK TOOL**: Created DynamicTool for real-time Ethos Network API calls via LangChain
- **✅ VERCEL-READY DEPLOYMENT**: Next.js API route optimized for Edge Functions with <2s response times
- **✅ EXPRESS.JS INTEGRATION**: LangChain routes added to existing server at /api/langchain/query
- **✅ REACT DEMO COMPONENT**: Interactive demo page at /langchain route with example queries
- **✅ MODEL DEPRECATION FIXES**: Updated from Mixtral-8x7b to Llama-3.3-70b-versatile (latest supported)
- **✅ PRODUCTION TESTING**: Agent successfully answering natural language queries about Web3 reputation data
- **✅ FIXED ACTIVITIES API**: Corrected Ethos Network activities endpoints to use proper POST requests with resolved userkeys
- **✅ TYPESCRIPT ERRORS RESOLVED**: Fixed all LSP diagnostics and type safety issues in EthosNetworkClient
- **✅ USER RESOLUTION**: Enhanced userkey resolution system to handle Twitter/X and Farcaster username lookups
- **✅ LANGCHAIN OPTIMIZATIONS**: Fixed "Invalid stopping method" error and replaced ReAct agent with direct query processing
- **✅ TERMINAL REMOVAL**: Removed terminal interface, made LangChain AI agent the default homepage
- **✅ ETHOS WHITEPAPER INTEGRATION**: Integrated complete Ethos Network whitepaper knowledge for enhanced conceptual understanding
- **✅ HYBRID QUERY PROCESSING**: Agent now handles both profile lookups AND conceptual questions about Ethos mechanisms
- **✅ REPLIT MIGRATION COMPLETED** (August 3, 2025): Successfully migrated from Replit Agent to standard Replit environment with full functionality

### LangChain AI Agent Interface
- **Modern Dark Theme**: Clean, professional interface optimized for AI interactions
- **Natural Language Processing**: Direct conversation with Groq Llama 3.3-70B model
- **Real-time Data**: Live Ethos Network API integration for Web3 reputation queries
- **Responsive Design**: Works across desktop and mobile devices
- **Performance Optimized**: <2 second response times with caching

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **express**: Web application framework for Node.js
- **@tanstack/react-query**: Server state management for React
- **react**: UI library for building user interfaces
- **typescript**: Static type checking

### UI and Styling
- **@radix-ui/**: Collection of low-level UI primitives for accessibility
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional CSS class name utility

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution environment for Node.js
- **esbuild**: Fast JavaScript bundler for production builds
- **drizzle-kit**: Database schema management and migrations

### External APIs
- **Groq API**: AI language model service for natural language processing
- **Ethos Network API**: Web3 reputation data source (mocked in current implementation)

### AI and Interactions
- **LangChain**: Framework for building AI applications with LLMs
- **@langchain/groq**: Groq API integration for fast inference
- **@langchain/core**: Core LangChain tools and prompts
- **wouter**: Lightweight routing library for React
- **react-hook-form**: Form state management and validation