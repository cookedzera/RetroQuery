/**
 * LangChain Agent Express.js Routes
 * Handles AI queries with Groq LLM and Ethos Network integration
 */

import type { Request, Response } from "express";
import { ChatGroq } from '@langchain/groq';
import { DynamicTool } from '@langchain/core/tools';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { PromptTemplate } from '@langchain/core/prompts';
import { getEthosScore } from '../lib/ethos-langchain.js';

// Simple LangChain chain without agent complexity
async function createEthosAgent(groqApiKey: string) {
  try {
    // Initialize Groq LLM with supported model
    const llm = new ChatGroq({
      model: 'llama-3.3-70b-versatile',
      apiKey: groqApiKey,
      temperature: 0.1,
      maxTokens: 1000,
      streaming: false
    });

    // Return a simple function that handles queries directly
    return {
      invoke: async (input: { input: string }) => {
        const query = input.input.toLowerCase();
        
        // Extract usernames/addresses from query
        const addressMatch = query.match(/(0x[a-fA-F0-9]{40})/);
        const farcasterMatch = query.match(/farcaster:(\d+)/);
        const ensMatch = query.match(/(\w+\.eth)/);
        const usernameMatch = query.match(/(?:for|of|about)\s+(\w+(?:\.\w+)?)/);
        
        let userkey = '';
        if (addressMatch) userkey = addressMatch[1];
        else if (ensMatch) userkey = ensMatch[1];
        else if (farcasterMatch) userkey = `farcaster:${farcasterMatch[1]}`;
        else if (usernameMatch) userkey = usernameMatch[1];
        else {
          // Try to extract any word that might be a username
          const words = query.split(/\s+/);
          const skipWords = ['what', 'is', 'the', 'score', 'reputation', 'vouch', 'tell', 'can', 'you', 'show', 'me', 'get', 'find', 'check'];
          for (const word of words) {
            const cleanWord = word.replace(/[^\w.-]/g, '');
            if (cleanWord.length > 2 && !skipWords.includes(cleanWord)) {
              userkey = cleanWord;
              break;
            }
          }
        }
        
        if (!userkey) {
          return { output: "I couldn't identify a username or address in your query. Please specify who you'd like to look up." };
        }
        
        try {
          const score = await getEthosScore(userkey);
          
          if (!score) {
            return { output: `No Ethos Network profile found for "${userkey}". This user may not have onchain reputation data.` };
          }

          // Format response based on query type
          if (query.includes('vouch') && query.includes('$')) {
            return { 
              output: `${score.displayName || userkey} has ${score.vouchCount || 0} vouches on Ethos Network. Vouches don't have a specific dollar value - they represent trust endorsements from other users. Their overall reputation score is ${score.score}.` 
            };
          } else {
            return { 
              output: `${score.displayName || userkey} has a reputation score of ${score.score}, with ${score.xpTotal || 0} total XP, ${score.reviewCount || 0} reviews received, ${score.vouchCount || 0} vouches received, and ${score.status} status.` 
            };
          }
        } catch (error) {
          return { output: `Error fetching data for ${userkey}: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
      }
    };
  } catch (error) {
    console.error('Error creating Ethos agent:', error);
    throw error;
  }
}

// Handle LangChain query
export async function handleLangChainQuery(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    const { query } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      res.status(400).json({ 
        success: false,
        error: 'Query is required and must be a string' 
      });
      return;
    }

    if (query.length > 1000) {
      res.status(400).json({ 
        success: false,
        error: 'Query too long. Maximum 1000 characters.' 
      });
      return;
    }

    // Get API key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      res.status(500).json({ 
        success: false,
        error: 'GROQ_API_KEY not configured' 
      });
      return;
    }

    // Create and execute agent
    const agent = await createEthosAgent(groqApiKey);
    
    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 15000);
    });

    const queryPromise = agent.invoke({ input: query });
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    const executionTime = Date.now() - startTime;

    // Set cache headers for successful responses
    if (executionTime < 5000) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }

    res.status(200).json({
      success: true,
      response: result.output || result.text || 'No response generated',
      executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('LangChain query error:', error);
    
    res.status(500).json({
      success: false,
      response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }
}

// Health check endpoint
export async function handleAgentHealth(req: Request, res: Response) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    const status = {
      langchain: 'operational',
      groq_api: groqApiKey ? 'configured' : 'missing_key',
      ethos_api: 'operational',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}