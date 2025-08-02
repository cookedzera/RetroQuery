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

### Terminal Interface Features
- **Retro CRT Aesthetics**: Multiple color themes with scanline effects and screen glow
- **Sound System**: Optional typing sounds, beeps, and startup sequences
- **Command History**: Arrow key navigation through previous commands
- **Boot Sequence**: Authentic system initialization on first load
- **Settings Persistence**: LocalStorage for user preferences (theme, sound, scanlines)

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

### Audio and Interactions
- **Web Audio API**: Browser-native audio for terminal sound effects
- **wouter**: Lightweight routing library for React
- **react-hook-form**: Form state management and validation