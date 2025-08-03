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
        
        // Detect if query contains specific user identifiers
        const specificUsers = /\b(?:cookedzera|vitalik|alice|bob|charlie)\b/i.test(query);
        const userDataTerms = /\b(?:score|reputation|profile|reviews|vouches|xp|activity|network)\b/i.test(query);
        const hasUserQuery = specificUsers || (userDataTerms && /\b\w+(?:'s)?\b/.test(query));
        
        // Only treat as conceptual if it's clearly about mechanisms without specific users
        const pureConceptualTerms = ['how does ethos work', 'what is social proof', 'explain mechanism', 'how do vouches work', 'invite system work'];
        const isConceptualQuery = pureConceptualTerms.some(term => query.includes(term)) && !hasUserQuery;
        
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
        
        // Extract various identifier patterns - prioritize specific formats first
        const patterns = [
          // Ethereum address
          { regex: /(0x[a-fA-F0-9]{40})/, type: 'address' },
          // Farcaster-specific searches - ENS domains in Farcaster context (most specific first)
          { regex: /show\s+me\s+(\w+\.eth)\s+activity.*farcaster/i, type: 'farcaster_username' },
          { regex: /(\w+\.eth)\s+reputation.*on\s+farcaster/i, type: 'farcaster_username' },
          { regex: /(\w+\.eth)\s+on\s+farcaster/i, type: 'farcaster_username' },
          // Regular usernames in Farcaster context
          { regex: /(?:show\s+me\s+|check\s+)?(\w+)\s+(?:activity|reputation).*(?:on\s+)?farcaster/i, type: 'farcaster_username' },
          { regex: /(\w+)\s+on\s+farcaster/i, type: 'farcaster_username' },
          // Explicit farcaster prefix
          { regex: /farcaster[:\s]+(\w+(?:\.\w+)?)/i, type: 'farcaster_username' },
          { regex: /farcaster[:\s]+(\d+)/i, type: 'farcaster_id' },
          // ENS name (only when not in farcaster context)
          { regex: /(\w+\.eth)(?!\s+.*farcaster)/i, type: 'ens' },
          // Telegram ID formats
          { regex: /telegram[:\s]+(\d+)/i, type: 'telegram' },
          { regex: /telegramId[:\s]+(\d+)/i, type: 'telegram' },
          // Discord ID formats
          { regex: /discord[:\s]+(\d+)/i, type: 'discord' },
          { regex: /discordId[:\s]+(\d+)/i, type: 'discord' },
          // Profile/User ID formats
          { regex: /profileId[:\s]+(\d+)/i, type: 'profileId' },
          { regex: /userId[:\s]+(\d+)/i, type: 'userId' },
          // General patterns like "profile for X" or "check X"
          { regex: /(?:for|of|about|check)\s+(\w+(?:\.\w+)?)/i, type: 'username' }
        ];
        
        for (const pattern of patterns) {
          const match = query.match(pattern.regex);
          if (match) {
            if (pattern.type === 'telegram') {
              identifier = `telegram:${match[1]}`;
            } else if (pattern.type === 'discord') {
              identifier = `discord:${match[1]}`;
            } else if (pattern.type === 'farcaster_username') {
              identifier = `farcaster_username:${match[1]}`;
            } else if (pattern.type === 'farcaster_id') {
              identifier = `farcaster_id:${match[1]}`;
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
        
        // Enhanced fallback: try to extract any username-like word, especially known users
        if (!identifier) {
          // First check for known usernames specifically
          const knownUsers = ['cookedzera', 'vitalik', 'alice', 'bob', 'charlie'];
          for (const user of knownUsers) {
            if (query.includes(user)) {
              identifier = user;
              break;
            }
          }
          
          // If no known user found, extract potential usernames
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
        }
        
        if (!identifier) {
          // Log the detection issue for debugging
          console.log(`DEBUG: No identifier found for query: "${query}"`);
          console.log(`DEBUG: hasUserQuery: ${hasUserQuery}, isConceptualQuery: ${isConceptualQuery}`);
          
          // For queries that seem to be about users but we can't extract the identifier, try to help
          if (hasUserQuery) {
            return { output: `I can help you find information about users on Ethos Network, but I need the username or identifier to be clearer. Please specify the user in one of these formats: username (e.g., "cookedzera"), Ethereum address (0x...), ENS name (.eth), or social platform ID (telegram:123, discord:123, farcaster:username).` };
          }
          
          // For pure conceptual queries, use LLM with whitepaper knowledge
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
        
        try {
          console.log(`DEBUG: Enhanced XP lookup starting for identifier: ${identifier}`);
          
          // Import enhanced client for comprehensive XP data
          const { EthosNetworkClient } = await import('./ethos-client.js');
          const client = new EthosNetworkClient();
          
          // Get comprehensive profile and XP data
          console.log(`DEBUG: Fetching profile data for: ${identifier}`);
          const profileData = await client.getProfileData(identifier);
          console.log(`DEBUG: Profile data result:`, profileData);
          
          if (!profileData) {
            console.log(`DEBUG: No profile data found for ${identifier}`);
            return { output: `No Ethos Network profile found for "${identifier}". This identifier may not have onchain reputation data yet. In Ethos Network, users must be invited by existing profiles to participate. Try different formats: addresses (0x...), ENS (.eth), usernames, Telegram ID (telegram:123), Discord ID (discord:123), or Farcaster username (farcaster:username).` };
          }
          
          console.log(`DEBUG: Profile found, fetching XP data for: ${identifier}`);

          // Get enhanced XP data using official API v2 endpoints
          const totalXP = await client.getUserXP(identifier);
          const seasonsData = await client.getXPSeasons();
          const currentSeason = seasonsData.currentSeason;
          
          let currentSeasonXP = 0;
          let weeklyXPData = [];
          let leaderboardRank = 0;
          
          if (currentSeason) {
            currentSeasonXP = await client.getUserSeasonXP(identifier, currentSeason.id);
            weeklyXPData = await client.getUserXPBySeasonAndWeek(identifier, currentSeason.id);
            leaderboardRank = await client.getUserLeaderboardRank(identifier);
          }

          // Enhanced response formatting with platform context
          const platformInfo = getPlatformInfo(identifier);
          const displayName = identifier;
          
          // Check for specific query types and provide detailed responses
          if (query.includes('weekly') || query.includes('week')) {
            let response = `${displayName}${platformInfo} Weekly XP Performance:

⚡ XP METRICS:
- Total XP (All Time): ${totalXP.toLocaleString()}`;

            if (currentSeason) {
              const seasonName = currentSeason.name === 'Season 1' ? 'First Season' : currentSeason.name;
              response += `
- Current Season (${seasonName}): ${currentSeasonXP.toLocaleString()} XP
- Global Leaderboard Rank: #${leaderboardRank.toLocaleString()}`;
            }

            // Add weekly XP breakdown if available
            if (weeklyXPData && weeklyXPData.length > 0) {
              response += `

📊 WEEKLY XP BREAKDOWN (Last ${Math.min(weeklyXPData.length, 4)} weeks):`;
              
              const recentWeeks = weeklyXPData.slice(-4).reverse();
              recentWeeks.forEach((week, index) => {
                const weekLabel = index === 0 ? 'This Week' : `${index + 1} weeks ago`;
                response += `
- ${weekLabel} (Week ${week.week}): ${week.weeklyXp} XP (Cumulative: ${week.cumulativeXp})`;
              });
            } else {
              response += `

📊 Weekly XP data is not available for this user at the moment.`;
            }

            response += `

This data represents real-time XP performance from the Ethos Network API v2.`;
            return { output: response };
          } else if (query.includes('vouch')) {
            const vouchExplanation = (profileData.vouchCount || 0) > 0 
              ? `This represents ${profileData.vouchCount || 0} people who have staked their Ethereum to vouch for ${displayName}'s credibility - the highest trust signal in Ethos Network.`
              : `No vouches yet. Vouches are when someone stakes their Ethereum to vouch for another person's credibility - the strongest trust signal in Ethos.`;
            
            return { 
              output: `${displayName}${platformInfo} has ${profileData.vouchCount || 0} vouches on Ethos Network. ${vouchExplanation} Their overall credibility score is ${profileData.score}.` 
            };
          } else if (query.includes('review')) {
            return {
              output: `${displayName}${platformInfo} has received ${profileData.reviewCount || 0} reviews on Ethos Network. Reviews provide peer feedback and help build reputation outside of financially-backed stakes. Their credibility score is ${profileData.score}.`
            };
          } else if ((query.includes('score') && (query.includes('detailed') || query.includes('detail') || query.includes('trust') || query.includes('level'))) || 
                     (query.includes('trust') && query.includes('level')) ||
                     query.includes('detailed score') ||
                     query.includes('score details')) {
            // Handle detailed score queries
            console.log(`DEBUG: Attempting detailed score lookup for ${identifier}`);
            try {
              const detailedScoreData = await client.getDetailedScore(identifier);
              console.log(`DEBUG: Detailed score data result:`, detailedScoreData);
              
              if (detailedScoreData) {
                const { detailedScore, status } = detailedScoreData;
                const trustLevel = client.formatTrustLevel(detailedScore.level);
                const trustDescription = client.getTrustLevelDescription(detailedScore.level);
                
                let response = `${displayName}${platformInfo} Detailed Score Analysis:

🏆 TRUST SCORE BREAKDOWN:
- Reputation Score: ${detailedScore.score}
- Trust Level: ${trustLevel}
- Status: ${trustDescription}

🔄 CALCULATION STATUS:`;
                
                if (status.isCalculating) {
                  response += `
- Currently calculating new score
- Update in progress: ${status.status}`;
                } else if (status.isQueued) {
                  response += `
- Score update queued
- Status: ${status.status}`;
                } else if (status.isPending) {
                  response += `
- Score update pending
- Status: ${status.status}`;
                } else {
                  response += `
- Score up to date
- Status: ${status.status}`;
                }
                
                response += `

📊 TRUST LEVEL SYSTEM:
- Untrusted: New accounts with limited history
- Emerging: Building reputation through interactions
- Trusted: Established credibility 
- Highly Trusted: Strong community backing
- Legendary: Exceptional ecosystem leaders

This detailed score analysis uses the official Ethos Network API v2 score endpoints.`;
                
                return { output: response };
              } else {
                console.log(`DEBUG: No detailed score data returned for ${identifier}`);
                // Fall through to default response
              }
            } catch (error) {
              console.log('Detailed score lookup failed, falling back to basic score:', error);
              // Fall through to default response
            }
          } else {
            // Default comprehensive response
            let response = `${displayName}${platformInfo} Ethos Network Profile:

🏆 REPUTATION METRICS:
- Reputation Score: ${profileData.score}
- Reviews Received: ${profileData.reviewCount}
- Vouches Received: ${profileData.vouchCount}
- Account Status: ACTIVE

⚡ XP PERFORMANCE:
- Total XP (All Time): ${totalXP.toLocaleString()}`;

            if (currentSeason) {
              const seasonName = currentSeason.name === 'Season 1' ? 'First Season' : currentSeason.name;
              response += `
- Current Season (${seasonName}): ${currentSeasonXP.toLocaleString()} XP
- Global Leaderboard Rank: #${leaderboardRank.toLocaleString()}`;
            }

            response += `

This data represents their real-time onchain reputation and activity metrics from the Ethos Network.`;
            return { output: response };
          }
        } catch (error) {
          // Fallback to basic score lookup if enhanced data fails
          console.error('Enhanced XP lookup failed, falling back to basic data:', error);
          try {
            const score = await getEthosScore(identifier);
            if (score) {
              // Check if this is a weekly XP query and we have enhanced data
              if ((query.includes('weekly') || query.includes('week')) && score.weeklyXPData && score.weeklyXPData.length > 0) {
                let response = `${identifier} Weekly XP Performance:

⚡ XP METRICS:
- Total XP (All Time): ${(score.xpTotal || 0).toLocaleString()}`;

                if (score.currentSeason) {
                  const seasonName = score.currentSeason === 'Season 1' ? 'First Season' : score.currentSeason;
                  response += `
- Current Season (${seasonName}): ${(score.currentSeasonXP || 0).toLocaleString()} XP`;
                  if (score.leaderboardRank) {
                    response += `
- Global Leaderboard Rank: #${score.leaderboardRank.toLocaleString()}`;
                  }
                }

                response += `

📊 WEEKLY XP BREAKDOWN (Last ${Math.min(score.weeklyXPData.length, 4)} weeks):`;
                
                const recentWeeks = score.weeklyXPData.slice(-4).reverse();
                recentWeeks.forEach((week, index) => {
                  const weekLabel = index === 0 ? 'This Week' : `${index + 1} weeks ago`;
                  response += `
- ${weekLabel} (Week ${week.week}): ${week.weeklyXp} XP (Cumulative: ${week.cumulativeXp})`;
                });

                response += `

This data represents real-time XP performance from the Ethos Network API v2.`;
                return { output: response };
              } else {
                // Enhanced default response with available XP data
                let response = `${identifier} Ethos Network Profile:

🏆 REPUTATION METRICS:
- Reputation Score: ${score.score}
- Reviews Received: ${score.reviewCount || 0}
- Vouches Received: ${score.vouchCount || 0}
- Account Status: ${score.status}

⚡ XP PERFORMANCE:
- Total XP (All Time): ${(score.xpTotal || 0).toLocaleString()}`;

                if (score.currentSeason && score.currentSeasonXP) {
                  const seasonName = score.currentSeason === 'Season 1' ? 'First Season' : score.currentSeason;
                  response += `
- Current Season (${seasonName}): ${score.currentSeasonXP.toLocaleString()} XP`;
                  if (score.leaderboardRank) {
                    response += `
- Global Leaderboard Rank: #${score.leaderboardRank.toLocaleString()}`;
                  }
                }

                response += `

This data represents their real-time onchain reputation and activity metrics from the Ethos Network.`;
                return { output: response };
              }
            }
          } catch (fallbackError) {
            console.error('Fallback lookup also failed:', fallbackError);
          }
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