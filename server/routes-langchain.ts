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

// Ethos Network whitepaper knowledge for enhanced responses
const ETHOS_KNOWLEDGE = `
Ethos Network Whitepaper Knowledge:

CORE CONCEPTS:
- Ethos measures credibility and reputation onchain to solve crypto's trust problem
- Modern society runs on credibility (resumes, reviews, ratings) - crypto is missing this
- Ethos provides a credibility score like a credit report but with open protocols and onchain records
- Uses "social Proof of Stake" - decentralized consensus driven by human values and actions

KEY MECHANISMS:
1. REVIEW: Standard rate and comment interface for reputation building
2. VOUCH: Stake Ethereum in other people - highest credibility signal (like traditional PoS staking)
3. SLASH: Bad actors can be slashed, removing percentage of staked ETH. Failed slashing proposals penalize the proposer
4. INVITE: Users must be invited by existing profiles. Creates credibility bonds between inviters/invitees (sybil resistance)
5. ATTEST: Connect other social network profiles to single Ethos profile to reflect authority from other sources
6. CREDIBILITY SCORE: Single numerical score generated from all social interactions
7. PROFILE: Shows score plus corroborating details - allies, enemies, praise, gaffes, promises kept/broken

GOVERNANCE: Algorithm control will transition from Ethos Labs to participants (decentralized governance)

IMPACT: Crypto economy thrives when everyone can readily ascertain credibility. Expects meaningful credibility to fund projects, have trusted voice, or exchange goods.
`;

// Enhanced LangChain agent with Ethos Network knowledge
async function createEthosAgent(groqApiKey: string) {
  try {
    // Initialize Groq LLM with supported model
    const llm = new ChatGroq({
      model: 'llama-3.3-70b-versatile',
      apiKey: groqApiKey,
      temperature: 0.1,
      maxTokens: 1500,
      streaming: false
    });

    // Return enhanced function with Ethos knowledge
    return {
      invoke: async (input: { input: string }) => {
        const query = input.input.toLowerCase();
        
        // Prioritize user data queries over conceptual explanations
        const hasUserIdentifier = /\b(?:cookedzera|vitalik|score|reputation|profile|reviews|vouches|xp)\b/i.test(query);
        const conceptualTerms = ['how does', 'what is', 'explain', 'mechanism work', 'social proof', 'invite system', 'attest work'];
        const isConceptualQuery = conceptualTerms.some(term => query.includes(term)) && !hasUserIdentifier;
        
        if (isConceptualQuery) {
          // Use LLM with Ethos knowledge for conceptual questions
          const response = await llm.invoke([
            {
              role: 'system',
              content: `You are an expert on Ethos Network. Use this whitepaper knowledge to answer questions: ${ETHOS_KNOWLEDGE}`
            },
            {
              role: 'user', 
              content: query
            }
          ]);
          
          return { output: response.content };
        }
        
        // Enhanced extraction for multiple platform types
        let identifier = '';
        
        // Extract various identifier patterns
        const patterns = [
          // Ethereum address
          { regex: /(0x[a-fA-F0-9]{40})/, type: 'address' },
          // ENS name
          { regex: /(\w+\.eth)/, type: 'ens' },
          // Telegram ID formats
          { regex: /telegram[:\s]+(\d+)/, type: 'telegram' },
          { regex: /telegramId[:\s]+(\d+)/, type: 'telegram' },
          // Discord ID formats
          { regex: /discord[:\s]+(\d+)/, type: 'discord' },
          { regex: /discordId[:\s]+(\d+)/, type: 'discord' },
          // Farcaster ID/username formats
          { regex: /farcaster[:\s]+(\w+)/, type: 'farcaster' },
          { regex: /farcaster[:\s]+(\d+)/, type: 'farcaster' },
          // Profile/User ID formats
          { regex: /profileId[:\s]+(\d+)/, type: 'profileId' },
          { regex: /userId[:\s]+(\d+)/, type: 'userId' },
          // General patterns like "profile for X" or "check X on farcaster"
          { regex: /(?:for|of|about|check)\s+(\w+(?:\.\w+)?)(?:\s+on\s+\w+)?/, type: 'username' }
        ];
        
        for (const pattern of patterns) {
          const match = query.match(pattern.regex);
          if (match) {
            if (pattern.type === 'telegram') {
              identifier = `telegram:${match[1]}`;
            } else if (pattern.type === 'discord') {
              identifier = `discord:${match[1]}`;
            } else if (pattern.type === 'farcaster') {
              identifier = isNaN(Number(match[1])) ? `farcaster:${match[1]}` : match[1];
            } else if (pattern.type === 'profileId') {
              identifier = `profileId:${match[1]}`;
            } else if (pattern.type === 'userId') {
              identifier = `userId:${match[1]}`;
            } else {
              identifier = match[1];
            }
            break;
          }
        }
        
        // Fallback: try to extract any username-like word
        if (!identifier) {
          const words = query.split(/\s+/);
          const skipWords = ['what', 'is', 'the', 'score', 'reputation', 'vouch', 'tell', 'can', 'you', 'show', 'me', 'get', 'find', 'check', 'how', 'does', 'work', 'explain', 'social', 'proof', 'stake', 'mechanism', 'network', 'ethos', 'profile', 'credibility', 'scoring', 'slashing', 'vouching', 'reviewing'];
          for (const word of words) {
            const cleanWord = word.replace(/[^\w.-]/g, '');
            if (cleanWord.length > 2 && !skipWords.includes(cleanWord)) {
              identifier = cleanWord;
              break;
            }
          }
        }
        
        if (!identifier) {
          // For non-conceptual queries without clear identifiers, use LLM to help
          const response = await llm.invoke([
            {
              role: 'system',
              content: `You are an expert on Ethos Network. If the user is asking about concepts, explain them using this knowledge: ${ETHOS_KNOWLEDGE}. If they're asking about a specific person/profile but you can't identify who, ask them to clarify and mention the supported formats: addresses (0x...), ENS (.eth), usernames, Telegram IDs (telegram:123), Discord IDs (discord:123), Farcaster usernames/IDs (farcaster:username), profile IDs (profileId:123).`
            },
            {
              role: 'user', 
              content: query
            }
          ]);
          
          return { output: response.content };
        }
        
        try {
          const score = await getEthosScore(identifier);
          
          if (!score) {
            return { output: `No Ethos Network profile found for "${identifier}". This identifier may not have onchain reputation data yet. In Ethos Network, users must be invited by existing profiles to participate. Try different formats: addresses (0x...), ENS (.eth), usernames, Telegram ID (telegram:123), Discord ID (discord:123), or Farcaster username (farcaster:username).` };
          }

          // Enhanced response formatting with platform context
          const platformInfo = getPlatformInfo(identifier);
          const displayName = score.displayName || score.username || identifier;
          
          if (query.includes('vouch')) {
            const vouchExplanation = (score.vouchCount || 0) > 0 
              ? `This represents ${score.vouchCount || 0} people who have staked their Ethereum to vouch for ${displayName}'s credibility - the highest trust signal in Ethos Network.`
              : `No vouches yet. Vouches are when someone stakes their Ethereum to vouch for another person's credibility - the strongest trust signal in Ethos.`;
            
            return { 
              output: `${displayName}${platformInfo} has ${score.vouchCount || 0} vouches on Ethos Network. ${vouchExplanation} Their overall credibility score is ${score.score}.` 
            };
          } else if (query.includes('review')) {
            return {
              output: `${displayName}${platformInfo} has received ${score.reviewCount || 0} reviews on Ethos Network. Reviews provide peer feedback and help build reputation outside of financially-backed stakes. Their credibility score is ${score.score}.`
            };
          } else {
            return { 
              output: `${displayName}${platformInfo} Ethos Network profile: Score ${score.score}, ${score.xpTotal || 0} total XP, ${score.reviewCount || 0} reviews, ${score.vouchCount || 0} vouches, status: ${score.status}. Their score reflects social consensus about their reputation in the Web3 ecosystem.` 
            };
          }
        } catch (error) {
          return { output: `Error fetching data for ${identifier}: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
      }
    };
  } catch (error) {
    console.error('Error creating Ethos agent:', error);
    throw error;
  }
}

// Helper function to identify platform context
function getPlatformInfo(identifier: string): string {
  if (identifier.startsWith('telegram:')) return ' (Telegram)';
  if (identifier.startsWith('discord:')) return ' (Discord)';
  if (identifier.startsWith('farcaster:')) return ' (Farcaster)';
  if (identifier.startsWith('0x')) return ' (Ethereum)';
  if (identifier.endsWith('.eth')) return ' (ENS)';
  if (identifier.startsWith('profileId:')) return ' (Profile ID)';
  if (identifier.startsWith('userId:')) return ' (User ID)';
  return '';
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