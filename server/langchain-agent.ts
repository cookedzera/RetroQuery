/**
 * LangChain Agent with Groq Mixtral and Ethos Network Integration
 * Optimized for Vercel Edge deployment with fast responses
 */

import { ChatGroq } from '@langchain/groq';
import { DynamicTool } from '@langchain/core/tools';
import { getEthosScore, type EthosScore } from '../lib/ethos-langchain.js';

// Initialize Groq LLM with supported model
function createGroqLLM(apiKey: string) {
  return new ChatGroq({
    model: 'llama-3.3-70b-versatile',
    apiKey: apiKey,
    temperature: 0.1,
    maxTokens: 1000,
    streaming: false
  });
}

// Create Enhanced Ethos Network tool with XP support
function createEthosTool() {
  return new DynamicTool({
    name: 'get_ethos_data',
    description: `Get comprehensive Ethos Network data including reputation scores, XP metrics, and activity data.
    Input should be one of:
    - Ethereum address (0x...)
    - ENS name (name.eth)
    - Farcaster ID (farcaster:123)
    - Twitter/X username (just the username without @)
    - Discord ID (discord:123456789)
    - Telegram ID (telegram:123456789)
    - Explicit formats: address:0x..., service:x.com:username:name, etc.
    
    Returns comprehensive data including XP metrics, weekly performance, reputation scores, and activity history.`,
    
    func: async (input: string): Promise<string> => {
      try {
        // Import the enhanced client
        const { EthosNetworkClient } = await import('../server/ethos-client.js');
        const client = new EthosNetworkClient();
        
        const userkey = input.trim();
        
        // Get basic profile information
        const profileData = await client.getProfileData(userkey);
        if (!profileData) {
          return `No Ethos Network profile found for "${userkey}". This user may not have any onchain reputation data or the identifier format may be incorrect.`;
        }

        // Get enhanced XP data
        const totalXP = await client.getUserXP(userkey);
        const seasonsData = await client.getXPSeasons();
        const currentSeason = seasonsData.currentSeason;
        
        let currentSeasonXP = 0;
        let weeklyXPData = [];
        let leaderboardRank = 0;
        
        if (currentSeason) {
          currentSeasonXP = await client.getUserSeasonXP(userkey, currentSeason.id);
          weeklyXPData = await client.getUserXPBySeasonAndWeek(userkey, currentSeason.id);
          leaderboardRank = await client.getUserLeaderboardRank(userkey);
        }

        // Format comprehensive response
        let response = `Ethos Network Profile for ${profileData.address}:

🏆 REPUTATION METRICS:
- Reputation Score: ${profileData.score}
- Reviews Received: ${profileData.reviewCount}
- Vouches Received: ${profileData.vouchCount}
- Account Status: ACTIVE

⚡ XP PERFORMANCE:
- Total XP (All Time): ${totalXP.toLocaleString()}`;

        if (currentSeason) {
          response += `
- Current Season (${currentSeason.name}): ${currentSeasonXP.toLocaleString()} XP
- Global Leaderboard Rank: #${leaderboardRank.toLocaleString()}`;
        }

        // Add weekly XP breakdown if available
        if (weeklyXPData && weeklyXPData.length > 0) {
          response += `
          
📊 WEEKLY XP BREAKDOWN (Last ${Math.min(weeklyXPData.length, 4)} weeks):`;
          
          // Show last 4 weeks in reverse order (most recent first)
          const recentWeeks = weeklyXPData.slice(-4).reverse();
          recentWeeks.forEach((week, index) => {
            const weekLabel = index === 0 ? 'This Week' : `${index + 1} weeks ago`;
            response += `
- ${weekLabel} (Week ${week.week}): ${week.weeklyXp} XP (Total: ${week.cumulativeXp})`;
          });
        }

        response += `

This data represents real-time onchain reputation and activity metrics from the Ethos Network.`;

        return response;
      } catch (error) {
        return `Error fetching Ethos data for "${input}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  });
}

// Create simplified agent without complex prompt chains
export async function createEthosAgent(groqApiKey: string) {
  try {
    const llm = createGroqLLM(groqApiKey);
    const ethosTool = createEthosTool();
    
    return {
      async processQuery(query: string): Promise<string> {
        try {
          // Enhanced system prompt with Ethos Network knowledge
          const systemPrompt = `You are an expert on the Ethos Network, a Web3 reputation system. You have access to real-time Ethos Network data through an API tool.

Key Facts about Ethos Network:
- Decentralized reputation system built on blockchain technology
- Users earn reputation through peer reviews, vouches, and on-chain activities
- Reputation Score (Credibility Score): Single numerical score from social interactions
- XP (Experience Points): Points earned from platform engagement
- Reviews: Peer-to-peer reputation assessments with scores and comments
- Vouches: ETH-backed endorsements showing financial confidence
- Slashing: Negative actions that reduce reputation
- Social Proof of Stake: Economic incentives for honest behavior

When users ask about specific people or XP metrics (like "cookedzera's weekly XP"), always use the get_ethos_data tool to fetch comprehensive real-time data including XP breakdowns, weekly performance, and reputation metrics. Never say you don't have access to data - you have full access through the enhanced API tool.

For XP-related queries, provide detailed breakdowns including:
- Total XP across all seasons
- Current season XP performance  
- Weekly XP trends and progression
- Leaderboard rankings
- Historical performance data

For general questions about Ethos mechanisms, explain the concepts clearly while offering to look up specific user data if helpful.

Always provide accurate, helpful responses about Web3 reputation and Ethos Network features.`;

          // Check if this is a user query or conceptual question
          const isUserQuery = /(?:score|reputation|profile|xp|reviews|vouches|activities|stats)/i.test(query) && 
                             /(?:@\w+|\b\w+\b(?:\s+\w+)*\b)/.test(query);
          
          if (isUserQuery) {
            // Extract potential usernames/addresses from the query
            const matches = query.match(/(?:@(\w+)|(\b\w+\b)(?:\s+on\s+ethos)?)/gi);
            if (matches && matches.length > 0) {
              let username = matches[0].replace('@', '').trim();
              
              // If multiple words, take the first one that looks like a username
              if (username.includes(' ')) {
                const words = username.split(' ');
                username = words.find(word => word.length > 2 && /^[a-zA-Z0-9_]+$/.test(word)) || words[0];
              }
              
              try {
                const result = await ethosTool.func(username);
                
                const response = await llm.invoke([
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `${query}\n\nHere's the real Ethos Network data I found:\n${result}` }
                ]);
                
                return response.content as string;
              } catch (error) {
                // If tool fails, still try to answer the question
                const response = await llm.invoke([
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `${query}\n\nNote: I encountered an error fetching the specific user data: ${error}` }
                ]);
                
                return response.content as string;
              }
            }
          }
          
          // For general questions, use the LLM directly
          const response = await llm.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ]);
          
          return response.content as string;
          
        } catch (error) {
          console.error('Agent processing error:', error);
          throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };
  } catch (error) {
    console.error('Error creating agent:', error);
    throw new Error('Failed to initialize LangChain agent');
  }
}

// Main agent query function
export async function queryEthosAgent(query: string, groqApiKey: string): Promise<{
  success: boolean;
  response: string;
  executionTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // Create agent
    const agent = await createEthosAgent(groqApiKey);
    
    // Execute query with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 15000); // 15s timeout
    });
    
    const queryPromise = agent.processQuery(query);
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as string;
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      response: result,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      response: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      executionTime
    };
  }
}

// Types for API responses
export interface AgentResponse {
  success: boolean;
  response: string;
  executionTime: number;
  timestamp: string;
}

export interface AgentRequest {
  query: string;
  maxTokens?: number;
  temperature?: number;
}