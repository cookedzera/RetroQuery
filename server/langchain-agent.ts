/**
 * LangChain Agent with Groq Mixtral and Ethos Network Integration
 * Optimized for Vercel Edge deployment with fast responses
 */

import { ChatGroq } from '@langchain/groq';
import { DynamicTool } from '@langchain/core/tools';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { PromptTemplate } from '@langchain/core/prompts';
import { getEthosScore, type EthosScore } from '../lib/ethos-langchain.js';

// Initialize Groq LLM with Mixtral model
function createGroqLLM(apiKey: string) {
  return new ChatGroq({
    model: 'mixtral-8x7b-32768',
    apiKey: apiKey,
    temperature: 0.1, // Low temperature for consistent responses
    maxTokens: 1000,  // Limit tokens for faster responses
    streaming: false   // Disable streaming for Vercel compatibility
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

// Create LangChain agent
export async function createEthosAgent(groqApiKey: string) {
  try {
    // Initialize LLM
    const llm = createGroqLLM(groqApiKey);
    
    // Create tools
    const tools = [createEthosTool()];
    
    // Get prompt template (using a simplified version for speed)
    let prompt;
    try {
      prompt = await pull('hwchase17/react');
    } catch (error) {
      // Use a basic prompt template if hub is unavailable
      prompt = PromptTemplate.fromTemplate(`Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}`);
    }
    
    // Create agent
    const agent = await createReactAgent({
      llm,
      tools,
      prompt
    });
    
    // Create executor with optimizations for speed
    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 3, // Limit iterations for faster responses
      earlyStoppingMethod: 'generate', // Stop early when possible
      handleParsingErrors: true,
      verbose: false // Disable verbose logging for speed
    });
    
    return executor;
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
    
    const queryPromise = agent.invoke({
      input: query
    });
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      response: result.output || result.text || 'No response generated',
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