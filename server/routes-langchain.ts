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

// Create LangChain agent with Groq LLM
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

    // Create Ethos tool
    const ethosTool = new DynamicTool({
      name: 'get_ethos_score',
      description: `Get onchain reputation score from Ethos Network. Input can be:
      - Ethereum address (0x...)
      - ENS name (name.eth)  
      - Farcaster ID (farcaster:123)
      - Twitter/X username (cookedzera)
      Returns reputation score, XP, reviews, vouches, and status.`,
      
      func: async (input: string) => {
        try {
          const score = await getEthosScore(input.trim());
          
          if (!score) {
            return `No Ethos Network profile found for "${input}". This user may not have onchain reputation data.`;
          }

          return `Ethos Network reputation for ${score.displayName || score.username || input}:
- Reputation Score: ${score.score}
- Total XP: ${score.xpTotal}
- Reviews Received: ${score.reviewCount}
- Vouches Received: ${score.vouchCount}
- Status: ${score.status}
- Userkey: ${score.userkey}

This represents their verified onchain reputation in the Web3 ecosystem.`;
        } catch (error) {
          return `Error fetching Ethos data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    // Create prompt template
    const prompt = PromptTemplate.fromTemplate(`Answer questions using available tools.

You have access to these tools:
{tools}

Use this format:

Question: {input}
Thought: I should think about what to do
Action: {tool_names}
Action Input: the input to the action
Observation: the result of the action
Thought: I now know the final answer
Final Answer: the final answer

Begin!

Question: {input}
Thought:{agent_scratchpad}`);

    // Create agent
    const agent = await createReactAgent({
      llm,
      tools: [ethosTool],
      prompt
    });

    // Create executor
    return new AgentExecutor({
      agent,
      tools: [ethosTool],
      maxIterations: 3,
      earlyStoppingMethod: 'generate',
      handleParsingErrors: true,
      verbose: false
    });
  } catch (error) {
    console.error('Error creating LangChain agent:', error);
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