/**
 * Next.js API Route for LangChain Agent with Groq Mixtral and Ethos Network
 * Optimized for Vercel deployment with fast responses
 */

// Next.js API types (install @types/node if needed)
interface NextApiRequest {
  method?: string;
  body: any;
  query: any;
}

interface NextApiResponse {
  status: (code: number) => NextApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}
import { ChatGroq } from '@langchain/groq';
import { DynamicTool } from '@langchain/core/tools';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { PromptTemplate } from '@langchain/core/prompts';

// Ethos Network API client (embedded for self-contained deployment)
class EthosClient {
  private baseUrl = 'https://api.ethos.network/api/v2';

  async getEthosScore(userkey: string) {
    try {
      const normalizedKey = this.normalizeUserkey(userkey);
      const userData = await this.lookupUser(normalizedKey);
      
      if (!userData) return null;

      return {
        userkey: userData.userkeys?.[0] || normalizedKey,
        score: userData.score || 0,
        xpTotal: userData.xpTotal || 0,
        reviewCount: this.calculateReviewCount(userData.stats),
        vouchCount: userData.stats?.vouch?.received?.count || 0,
        status: userData.status || 'ACTIVE',
        displayName: userData.displayName,
        username: userData.username
      };
    } catch (error) {
      console.error('Error fetching Ethos score:', error);
      return null;
    }
  }

  private normalizeUserkey(input: string): string {
    const cleaned = input.trim();
    
    if (cleaned.startsWith('0x') && cleaned.length === 42) {
      return `address:${cleaned}`;
    }
    if (cleaned.endsWith('.eth')) {
      return `address:${cleaned}`;
    }
    if (cleaned.startsWith('farcaster:')) {
      const id = cleaned.replace('farcaster:', '');
      return `service:farcaster:${id}`;
    }
    if (cleaned.startsWith('twitter:') || cleaned.startsWith('x:')) {
      const username = cleaned.split(':')[1];
      return `service:x.com:username:${username}`;
    }
    
    return cleaned;
  }

  private async lookupUser(userkey: string) {
    // Try Twitter/X lookup first
    try {
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      if (xResult && xResult.length > 0) return xResult[0];
    } catch (error) {}

    // Try Farcaster lookup
    try {
      const farcasterResult = await this.request('/users/by/farcaster/usernames', {
        method: 'POST',
        body: JSON.stringify({ farcasterUsernames: [userkey] })
      });
      if (farcasterResult.users && farcasterResult.users.length > 0) {
        return farcasterResult.users[0].user;
      }
    } catch (error) {}

    // Try address lookup
    if (userkey.startsWith('0x') || userkey.includes('address:')) {
      try {
        const address = userkey.replace('address:', '');
        const addressResult = await this.request('/users/by/address', {
          method: 'POST',
          body: JSON.stringify({ addresses: [address] })
        });
        if (addressResult && addressResult.length > 0) return addressResult[0];
      } catch (error) {}
    }

    return null;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': 'langchain-agent-v1.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Ethos API error: ${response.status}`);
    }
    return response.json();
  }

  private calculateReviewCount(stats: any): number {
    if (!stats?.review?.received) return 0;
    const received = stats.review.received;
    return (received.positive || 0) + (received.neutral || 0) + (received.negative || 0);
  }
}

// Initialize Ethos client
const ethosClient = new EthosClient();

// Create LangChain agent
async function createAgent(groqApiKey: string) {
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
        const score = await ethosClient.getEthosScore(input.trim());
        
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
}

// API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS for frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const startTime = Date.now();

  try {
    const { query } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required and must be a string' });
      return;
    }

    if (query.length > 1000) {
      res.status(400).json({ error: 'Query too long. Maximum 1000 characters.' });
      return;
    }

    // Get API key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      res.status(500).json({ error: 'GROQ_API_KEY not configured' });
      return;
    }

    // Create and execute agent
    const agent = await createAgent(groqApiKey);
    
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
    
    res.status(500).json({
      success: false,
      response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }
}

// Export helper for Vercel Edge (optional)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}