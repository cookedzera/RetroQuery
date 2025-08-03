import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { terminalQuerySchema, ethosStatsSchema } from "@shared/schema";
import { z } from "zod";
import { ethosClient } from "./ethos-client";
import { ethosMockClient } from "./ethos-mock-client";
import { DynamicAPIExecutor } from "./dynamic-api-executor";
import { handleLangChainQuery, handleAgentHealth } from "./routes-langchain.js";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Groq AI endpoint for natural language processing
  app.post("/api/ai/query", async (req, res) => {
    try {
      const { query, sessionId } = terminalQuerySchema.parse(req.body);
      
      const groqApiKey = process.env.GROQ_API_KEY;
      
      if (!groqApiKey) {
        // Fallback to mock AI response when no API key is available
        const mockResponse = await generateMockAIResponse(query);
        res.json({ response: mockResponse, sessionId, usingMockData: true });
        return;
      }

      // Real Groq API integration
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a COMPREHENSIVE AI assistant for the Ethos Network Web3 reputation terminal interface. You have COMPLETE knowledge of the Ethos Network API v2 and can analyze ANY natural language query about Web3 reputation, activities, reviews, voting, and social connections.

              === COMPLETE API CAPABILITY CATALOG ===

              CORE USER DATA:
              - user_profile: Complete profile data (score, reviews, vouches, rank, networks, XP)
              - user_stats: XP and reputation statistics with timeframe analysis
              - user_networks: All connected social platforms (Twitter, Farcaster, Discord, Telegram)
              - search_users: Multi-platform user search

              ACTIVITY & HISTORY SYSTEM:
              - user_activities: All user activities (reviews, vouches, slashes, votes, projects)
              - user_activity_history: Historical activity analysis with trends over custom timeframes
              - activity_feed: Global activity feed with advanced filtering
              - activity_details: Specific activity information
              - reputation_trends: Reputation change analysis over time

              REVIEWS & INTERACTIONS:
              - user_reviews: Complete review history and analytics
              - review_details: Specific review data between users
              - user_votes: Voting behavior and patterns

              LEADERBOARDS & ANALYSIS:
              - leaderboard: Rankings by score, XP, reviews, vouches, or activity
              - user_comparison: Multi-dimensional reputation comparison

              === ENHANCED QUERY EXAMPLES ===
              Query: "show me cookedzera's activity history this month" → intent: "user_activity_history", userkey: "cookedzera", timeframe: "month"
              Query: "what reviews has vitalik given recently?" → intent: "user_activities", userkey: "vitalik", direction: "author", activityType: "review"
              Query: "cookedzera reputation trends over the past year" → intent: "reputation_trends", userkey: "cookedzera", timeframe: "year"
              Query: "show me the latest activity feed" → intent: "activity_feed", limit: "20"
              Query: "what social networks is alice connected to?" → intent: "user_networks", userkey: "alice"
              Query: "show votes on review #12345" → intent: "user_votes", activityType: "review", activityId: "12345"
              Query: "recent vouches received by cookedzera" → intent: "user_activities", userkey: "cookedzera", direction: "subject", activityType: "vouch"
              Query: "show me cookedzera's Twitter profile details" → intent: "user_networks", userkey: "cookedzera"

              === ADVANCED PARSING RULES ===
              - Activity Analysis: "activity", "history", "timeline" → user_activity_history or user_activities
              - Direction Detection: "given by", "authored by" → direction: "author" | "received by", "to user" → direction: "subject"
              - Activity Types: "reviews", "vouches", "slashes", "votes", "projects", "attestations"
              - Timeframe Detection: "this week/month/year", "last 30 days", "recent", "historical"
              - Network Detection: "Twitter", "X", "Farcaster", "Discord", "social", "platforms" → user_networks
              - Trend Analysis: "trends", "changes over time", "progression" → reputation_trends
              - Feed Requests: "latest activity", "recent events", "what's happening" → activity_feed

              RESPOND WITH VALID JSON - EXPANDED INTENTS:
              {
                "intent": "user_profile|user_stats|user_reviews|user_comparison|leaderboard|search_users|user_activities|user_activity_history|activity_feed|activity_details|user_votes|review_details|user_networks|reputation_trends|help",
                "parameters": {
                  "userkey": "cookedzera",
                  "userkeys": ["vitalik", "cookedzera"],
                  "timeframe": "week|month|year|all",
                  "metric": "xp|score|reviews|vouches|rank|all",
                  "direction": "author|subject|all",
                  "activityType": "review|vouch|slash|vote|attestation|project|market",
                  "activityId": "12345",
                  "authorUserKey": "vitalik",
                  "subjectUserKey": "cookedzera",
                  "filter": ["review", "vouch"],
                  "limit": "50",
                  "dayRange": "7",
                  "query": "alice"
                },
                "natural_response": "ACTIVITY HISTORY RETRIEVED FOR COOKEDZERA"
              }

              RESPONSE STYLE REQUIREMENTS:
              - Keep natural_response SHORT and DIRECT - max 1-2 lines
              - Use simple terminal style: "DATA RETRIEVED", "ANALYSIS COMPLETE"
              - NO ASCII art, NO multi-line formatting, NO progress indicators
              - Just state what was done: "ACTIVITY HISTORY RETRIEVED FOR [USERNAME]"
              - Enhanced response examples:
                * "ACTIVITY HISTORY RETRIEVED FOR COOKEDZERA"
                * "REPUTATION TRENDS ANALYZED"
                * "SOCIAL NETWORKS MAPPED"
                * "VOTING PATTERNS FOUND"
                * "REVIEW DETAILS LOADED"
                * "FEED ACTIVITIES RETRIEVED"

              CRITICAL: Only use intent "help" for completely unclear queries. For ANY mention of users, activities, history, trends, networks, voting, or reputation data - classify with the appropriate specific intent.
              
              Enhanced classification examples:
              - "show me user activity" → user_activities
              - "cookedzera activity history" → user_activity_history  
              - "recent reviews by vitalik" → user_activities (direction: "author", activityType: "review")
              - "what platforms is alice on" → user_networks
              - "reputation changes over time" → reputation_trends
              - "latest community activity" → activity_feed`
            },
            {
              role: "user",
              content: query
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
          stream: false
        })
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error(`Groq API error: ${groqResponse.status} ${groqResponse.statusText}`, errorText);
        throw new Error(`Groq API error: ${groqResponse.statusText}`);
      }

      const groqData = await groqResponse.json();
      const aiResponse = groqData.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error("No response content from Groq API");
      }

      // Try to parse as JSON, fallback to mock response format
      let formattedResponse;
      try {
        const parsed = JSON.parse(aiResponse);
        formattedResponse = aiResponse;
      } catch (parseError) {
        // If Groq doesn't return valid JSON, wrap the response
        formattedResponse = JSON.stringify({
          intent: "help",
          parameters: {},
          natural_response: aiResponse
        });
      }
      
      // Execute the API call based on Groq's analysis
      try {
        const parsedResponse = JSON.parse(formattedResponse);
        
        // Extract intent from nested structure if needed
        let finalIntent = parsedResponse.intent;
        let finalParameters = parsedResponse.parameters;
        
        // Check if the real intent is nested in natural_response
        if (finalIntent === 'help' && parsedResponse.natural_response) {
          try {
            const nestedMatch = parsedResponse.natural_response.match(/\"intent\":\s*\"([^\"]+)\"/);
            const paramsMatch = parsedResponse.natural_response.match(/\"parameters\":\s*({[^}]+})/);
            
            if (nestedMatch) {
              finalIntent = nestedMatch[1];
              if (paramsMatch) {
                finalParameters = JSON.parse(paramsMatch[1]);
              }
            }
          } catch (nestedError) {
            console.log('Could not extract nested intent:', nestedError);
          }
        }
        
        const apiResult = await DynamicAPIExecutor.executeAPICall(
          finalIntent, 
          finalParameters
        );
        
        res.json({ 
          response: formattedResponse, 
          sessionId, 
          usingGroqAI: true,
          apiResult: apiResult,
          extractedIntent: finalIntent
        });
      } catch (parseError) {
        console.log('Parse error:', parseError);
        res.json({ response: formattedResponse, sessionId, usingGroqAI: true });
      }
    } catch (error) {
      console.error("AI query error:", error);
      res.status(500).json({ error: "Failed to process AI query" });
    }
  });

  // Ethos Network API endpoints - Real data integration
  app.get("/api/ethos/user/:userkey", async (req, res) => {
    try {
      const { userkey } = req.params;
      
      // Try real Ethos Network API with correct POST endpoints
      console.log(`Looking up user: ${userkey}`);
      const ethosProfile = await ethosClient.getProfileData(userkey);
      
      if (ethosProfile) {
        res.json({
          address: ethosProfile.address,
          username: userkey.includes('@') ? userkey : null,
          score: ethosProfile.score,
          reputation: ethosProfile.credibility.score,
          rank: ethosProfile.credibility.rank,
          reviewCount: ethosProfile.reviewCount,
          vouchCount: ethosProfile.vouchCount,
          isRealData: true,
          dataSource: 'Live Ethos Network API'
        });
        return;
      }
      
      res.status(404).json({ error: "User not found in Ethos Network" });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  });

  app.get("/api/ethos/user/:userkey/stats", async (req, res) => {
    try {
      const { userkey } = req.params;
      const { period } = ethosStatsSchema.parse({ address: userkey, period: req.query.period });
      
      // Try to get real Ethos Network data
      let ethosProfile = null;
      let ethosActivity: Array<{
        id: string;
        type: string;
        score: number;
        comment?: string;
        from: string;
        to: string;
        timestamp: string;
        ethAmount?: string;
      }> = [];
      
      try {
        ethosProfile = await ethosClient.getProfileData(userkey);
        if (ethosProfile) {
          ethosActivity = await ethosClient.getActivityObjects(userkey, 50);
        }
      } catch (error) {
        console.log(`Real Ethos API unavailable for stats ${userkey}, using mock data`);
      }
      
      if (ethosProfile) {
        
        // Calculate period-specific stats from real data
        const now = new Date();
        let periodStart = new Date();
        
        switch (period) {
          case 'day':
            periodStart.setDate(now.getDate() - 1);
            break;
          case 'week':
            periodStart.setDate(now.getDate() - 7);
            break;
          case 'month':
            periodStart.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            periodStart.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        const periodActivity = ethosActivity.filter(activity => 
          new Date(activity.timestamp) >= periodStart
        );
        
        const periodScore = periodActivity.reduce((sum, activity) => 
          sum + (activity.score || 0), 0
        );
        
        res.json({
          address: ethosProfile.address,
          username: userkey.includes('@') ? userkey : null,
          score: ethosProfile.score,
          periodScore,
          reputation: ethosProfile.credibility.score,
          reviews: ethosProfile.reviewCount,
          vouches: ethosProfile.vouchCount,
          rank: ethosProfile.credibility.rank,
          percentile: ethosProfile.credibility.percentile,
          period,
          isRealData: true
        });
        return;
      }
      
      // Try enhanced mock data when real API unavailable
      const mockProfile = await ethosMockClient.getProfileData(userkey);
      if (mockProfile) {
        const mockActivity = await ethosMockClient.getActivityObjects(userkey, 50);
        
        // Calculate period-specific stats from mock data
        const now = new Date();
        let periodStart = new Date();
        
        switch (period) {
          case 'day':
            periodStart.setDate(now.getDate() - 1);
            break;
          case 'week':
            periodStart.setDate(now.getDate() - 7);
            break;
          case 'month':
            periodStart.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            periodStart.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        const periodActivity = mockActivity.filter(activity => 
          new Date(activity.timestamp) >= periodStart
        );
        
        const periodScore = periodActivity.reduce((sum, activity) => 
          sum + (activity.score || 0), 0
        );
        
        res.json({
          address: mockProfile.address,
          username: userkey.includes('@') ? userkey : null,
          score: mockProfile.score,
          periodScore,
          reputation: mockProfile.credibility.score,
          reviews: mockProfile.reviewCount,
          vouches: mockProfile.vouchCount,
          rank: mockProfile.credibility.rank,
          percentile: mockProfile.credibility.percentile,
          period,
          isRealData: false
        });
        return;
      }
      
      // Final fallback to storage mock data
      const user = await storage.getEthosUser(userkey);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const attestations = await storage.getAttestationsForUser(userkey);
      
      // Calculate period-specific stats
      let periodXp = user.weeklyXp || 0;
      if (period === 'month') periodXp = user.monthlyXp || 0;
      if (period === 'day') periodXp = Math.floor((user.weeklyXp || 0) / 7);
      if (period === 'year') periodXp = (user.monthlyXp || 0) * 12;

      const stats = {
        address: user.address,
        username: user.username,
        xp: user.xp,
        periodXp,
        reputation: user.reputation,
        attestations: attestations.length,
        rank: user.rank,
        period,
        isRealData: false
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: "Failed to get user stats" });
    }
  });

  app.get("/api/ethos/user/:userkey/reviews", async (req, res) => {
    try {
      const { userkey } = req.params;
      
      // Try to get real Ethos Network reviews
      const ethosReviews = await ethosClient.getReviews(userkey);
      
      if (ethosReviews && ethosReviews.length > 0) {
        const reviewsWithUsernames = ethosReviews.map(review => ({
          id: review.id,
          fromAddress: review.fromAddress,
          toAddress: review.toAddress,
          score: review.score,
          comment: review.comment,
          timestamp: review.timestamp,
          attesterUsername: review.fromAddress.includes('.') ? 
            review.fromAddress : 
            `${review.fromAddress.slice(0, 6)}...${review.fromAddress.slice(-4)}`,
          isRealData: true
        }));
        
        res.json(reviewsWithUsernames);
        return;
      }
      
      // Fallback to mock data
      const attestations = await storage.getAttestationsForUser(userkey);
      
      // Get attester usernames
      const attestationsWithUsernames = await Promise.all(
        attestations.map(async (attestation) => {
          const attester = await storage.getEthosUser(attestation.fromAddress);
          return {
            ...attestation,
            attesterUsername: attester?.username || `${attestation.fromAddress.slice(0, 6)}...${attestation.fromAddress.slice(-4)}`,
            isRealData: false
          };
        })
      );
      
      res.json(attestationsWithUsernames);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ error: "Failed to get reviews" });
    }
  });

  app.get("/api/ethos/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const orderBy = (req.query.orderBy as string) || 'score';
      
      // Try to get real Ethos Network leaderboard
      const ethosLeaderboard = await ethosClient.getLeaderboard(limit);
      
      if (ethosLeaderboard && ethosLeaderboard.length > 0) {
        const leaderboard = ethosLeaderboard.map((profile, index) => ({
          address: profile.address,
          username: profile.address.includes('.') ? profile.address : null,
          score: profile.score,
          reputation: profile.credibility.score,
          reviewCount: profile.reviewCount,
          vouchCount: profile.vouchCount,
          rank: index + 1,
          isRealData: true
        }));
        
        res.json(leaderboard);
        return;
      }
      
      // Fallback to mock data
      if (!['xp', 'reputation', 'attestations'].includes(orderBy)) {
        res.status(400).json({ error: "Invalid orderBy parameter" });
        return;
      }
      
      const users = await storage.getTopEthosUsers(limit, orderBy as 'xp' | 'reputation' | 'attestations');
      const usersWithFlag = users.map(user => ({ ...user, isRealData: false }));
      res.json(usersWithFlag);
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.post("/api/ethos/compare", async (req, res) => {
    try {
      const { userkeys } = req.body;
      
      if (!Array.isArray(userkeys) || userkeys.length !== 2) {
        res.status(400).json({ error: "Exactly 2 userkeys required for comparison" });
        return;
      }
      
      // Try to get real Ethos Network data
      const ethosComparison = await ethosClient.compareProfiles(userkeys[0], userkeys[1]);
      
      if (ethosComparison.profile1 && ethosComparison.profile2 && ethosComparison.comparison) {
        const comparison = {
          user1: {
            address: ethosComparison.profile1.address,
            username: userkeys[0].includes('.') ? userkeys[0] : null,
            score: ethosComparison.profile1.score,
            reputation: ethosComparison.profile1.credibility.score,
            reviewCount: ethosComparison.profile1.reviewCount,
            vouchCount: ethosComparison.profile1.vouchCount,
            rank: ethosComparison.profile1.credibility.rank
          },
          user2: {
            address: ethosComparison.profile2.address,
            username: userkeys[1].includes('.') ? userkeys[1] : null,
            score: ethosComparison.profile2.score,
            reputation: ethosComparison.profile2.credibility.score,
            reviewCount: ethosComparison.profile2.reviewCount,
            vouchCount: ethosComparison.profile2.vouchCount,
            rank: ethosComparison.profile2.credibility.rank
          },
          differences: {
            score: ethosComparison.comparison.scoreDiff,
            reputation: ethosComparison.comparison.scoreDiff,
            reviews: ethosComparison.comparison.reviewDiff,
            vouches: ethosComparison.comparison.vouchDiff,
            rank: ethosComparison.comparison.rankDiff
          },
          isRealData: true
        };
        
        res.json(comparison);
        return;
      }
      
      // Fallback to mock data
      const users = await Promise.all(
        userkeys.map(userkey => storage.getEthosUser(userkey))
      );
      
      if (users.some(user => !user)) {
        res.status(404).json({ error: "One or more users not found" });
        return;
      }
      
      const comparison = {
        user1: users[0],
        user2: users[1],
        differences: {
          xp: (users[0]!.xp || 0) - (users[1]!.xp || 0),
          reputation: (users[0]!.reputation || 0) - (users[1]!.reputation || 0),
          attestations: (users[0]!.attestations || 0) - (users[1]!.attestations || 0),
          rank: (users[1]!.rank || 0) - (users[0]!.rank || 0) // Lower rank is better
        },
        isRealData: false
      };
      
      res.json(comparison);
    } catch (error) {
      console.error("Compare users error:", error);
      res.status(500).json({ error: "Failed to compare users" });
    }
  });

  // Search users by username or address
  app.get("/api/ethos/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: "Query parameter required" });
        return;
      }
      
      // Try to search real Ethos Network data
      const ethosProfiles = await ethosClient.searchProfiles(query);
      
      if (ethosProfiles && ethosProfiles.length > 0) {
        const profiles = ethosProfiles.map(profile => ({
          address: profile.address,
          username: profile.address.includes('.') ? profile.address : null,
          score: profile.score,
          reputation: profile.credibility.score,
          reviewCount: profile.reviewCount,
          vouchCount: profile.vouchCount,
          rank: profile.credibility.rank,
          isRealData: true
        }));
        
        res.json(profiles);
        return;
      }
      
      // Fallback to mock data search
      const user = await storage.getEthosUserByUsername(query);
      
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      
      res.json({ ...user, isRealData: false });
    } catch (error) {
      console.error("Search user error:", error);
      res.status(500).json({ error: "Failed to search user" });
    }
  });

  // LangChain AI Agent routes
  app.post("/api/langchain/query", handleLangChainQuery);
  app.get("/api/langchain/health", handleAgentHealth);

  const httpServer = createServer(app);
  return httpServer;
}

async function generateMockAIResponse(query: string): Promise<string> {
  const q = query.toLowerCase();
  
  // Mock AI response based on query content
  if (q.includes('xp') && q.includes('week')) {
    return JSON.stringify({
      intent: "xp_query",
      parameters: {
        addresses: [],
        usernames: [],
        timeframe: "week",
        metric: "xp",
        comparison: false
      },
      natural_response: "SCANNING ETHOS NETWORK...\nWEEKLY XP ANALYSIS COMPLETE\nYOUR WEEKLY XP GAINED: 420 POINTS\nRANK CHANGE: +5 POSITIONS\nANALYSIS COMPLETE. ⚡"
    });
  } else if (q.includes('compare')) {
    return JSON.stringify({
      intent: "user_comparison", 
      parameters: {
        addresses: [],
        usernames: ["vitalik"],
        timeframe: "all",
        metric: "all",
        comparison: true
      },
      natural_response: "COMPARATIVE ANALYSIS INITIATED...\nYOU vs VITALIK.ETH:\n├─ XP: 1,420 vs 12,890 (-11,470)\n├─ ATTESTATIONS: 12 vs 156 (-144)\n├─ REPUTATION: 3.2 vs 4.9 (-1.7)\n└─ GROWTH: +5% vs +2% (+3%)\n\nKEEP BUILDING! 📈"
    });
  } else if (q.includes('attestation')) {
    return JSON.stringify({
      intent: "attestation_lookup",
      parameters: {
        addresses: [],
        usernames: [],
        timeframe: "month",
        metric: "attestations",
        comparison: false
      },
      natural_response: "ATTESTATION ANALYSIS...\nTOP ATTESTERS FOR YOU:\n1. @alice.eth     - 5 attestations\n2. @bob.eth       - 3 attestations\n3. @charlie.eth   - 2 attestations\n\nTOTAL: 12 ATTESTATIONS THIS MONTH 🎯"
    });
  } else if (q.includes('leaderboard') || q.includes('top')) {
    return JSON.stringify({
      intent: "leaderboard",
      parameters: {
        addresses: [],
        usernames: [],
        timeframe: "week",
        metric: "xp",
        comparison: false
      },
      natural_response: "ETHOS NETWORK LEADERBOARD:\n\nTOP 5 BY XP THIS WEEK:\n1. 🏆 @alice.eth      - 2,150 XP\n2. 🥈 @vitalik.eth    - 1,890 XP\n3. 🥉 @bob.eth        - 1,280 XP\n4. ⭐ @charlie.eth    - 980 XP\n5. ⭐ @user123        - 420 XP\n\nYOUR POSITION: #1247 (1,420 XP)"
    });
  } else {
    return JSON.stringify({
      intent: "help",
      parameters: {},
      natural_response: "AI PROCESSING COMPLETE.\n\nI can help you with:\n• XP and reputation queries\n• User comparisons and rankings\n• Attestation analysis\n• Trend visualization\n• Leaderboard information\n\nTry asking: \"What was my XP this week?\"\nOr: \"Compare me with @vitalik\""
    });
  }
}
