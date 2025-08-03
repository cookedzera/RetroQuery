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

// Create Ethos Network tool
function createEthosTool() {
  return new DynamicTool({
    name: 'get_ethos_score',
    description: `Get onchain reputation score from Ethos Network for a given user.
    Input should be one of:
    - Ethereum address (0x...)
    - ENS name (name.eth)
    - Farcaster ID (farcaster:123)
    - Twitter/X username (just the username without @)
    - Explicit formats: address:0x..., service:x.com:username:name, etc.
    
    Returns reputation score, XP, review count, vouch count, and other reputation metrics.`,
    
    func: async (input: string): Promise<string> => {
      try {
        const score = await getEthosScore(input.trim());
        
        if (!score) {
          return `No Ethos Network profile found for "${input}". This user may not have any onchain reputation data or the identifier format may be incorrect.`;
        }

        // Format response for the LLM
        const response = {
          user: score.displayName || score.username || input,
          reputation_score: score.score,
          xp_total: score.xpTotal || 0,
          review_count: score.reviewCount || 0,
          vouch_count: score.vouchCount || 0,
          status: score.status,
          userkey: score.userkey
        };

        return `Ethos Network reputation data for ${response.user}:
- Reputation Score: ${response.reputation_score}
- Total XP: ${response.xp_total}
- Reviews Received: ${response.review_count}
- Vouches Received: ${response.vouch_count}
- Account Status: ${response.status}
- Userkey: ${response.userkey}

This data represents their onchain reputation and credibility in the Web3 ecosystem.`;
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

When users ask about specific people (like "cookedzera"), always use the get_ethos_score tool to fetch their real data. Never say you don't have access to data - you do have access through the API tool.

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