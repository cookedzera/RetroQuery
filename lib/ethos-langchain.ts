/**
 * Ethos Network API utility for LangChain agent
 * Handles userkey normalization and score fetching
 */

import { Web3BioClient } from './web3bio-client';

export interface EthosScore {
  userkey: string;
  score: number;
  rank?: number;
  xpTotal?: number;
  reviewCount?: number;
  vouchCount?: number;
  status: 'ACTIVE' | 'INACTIVE';
  displayName?: string;
  username?: string;
}

export interface XPData {
  totalXP: number;
  currentSeasonXP?: number;
  leaderboardRank?: number;
  weeklyData?: WeeklyXPData[];
}

export interface WeeklyXPData {
  week: number;
  weeklyXp: number;
  cumulativeXp: number;
}

export interface Season {
  id: number;
  name: string;
  startDate: string;
  week?: number;
}

export interface SeasonsResponse {
  seasons: Season[];
  currentSeason: Season;
}

export class EthosLangChainClient {
  private baseUrl = 'https://api.ethos.network/api/v2';
  private web3bioClient = new Web3BioClient();

  /**
   * Normalize userkey to proper Ethos format
   */
  normalizeUserkey(input: string): string {
    // Remove whitespace
    const cleaned = input.trim();
    
    // Handle Ethereum addresses
    if (cleaned.startsWith('0x') && cleaned.length === 42) {
      return cleaned;
    }
    
    // Handle platform-specific identifiers
    if (cleaned.startsWith('farcaster_username:')) {
      return cleaned.replace('farcaster_username:', '');
    }
    
    if (cleaned.startsWith('farcaster_id:')) {
      return cleaned.replace('farcaster_id:', '');
    }
    
    if (cleaned.startsWith('telegram:') || 
        cleaned.startsWith('discord:') || 
        cleaned.startsWith('profileId:') || 
        cleaned.startsWith('userId:')) {
      return cleaned;
    }
    
    // Default: return as-is for username lookups
    return cleaned;
  }

  /**
   * Fetch Ethos score for a given userkey
   */
  async getEthosScore(userkey: string): Promise<EthosScore | null> {
    try {
      const normalizedKey = this.normalizeUserkey(userkey);
      
      // First, try to resolve cross-platform connections with Web3.bio
      const enhancedResult = await this.getCrossPlatformProfile(normalizedKey);
      if (enhancedResult) {
        return enhancedResult;
      }

      // Fallback to direct lookup
      let userData = await this.lookupUser(normalizedKey);
      
      if (!userData) {
        return null;
      }

      return {
        userkey: userData.userkeys?.[0] || normalizedKey,
        score: userData.score || 0,
        rank: userData.rank,
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

  /**
   * Enhanced profile lookup using Web3.bio to find connected accounts
   * For example: dwr.eth on Farcaster -> find dwr on Twitter -> get Ethos profile
   */
  private async getCrossPlatformProfile(userkey: string): Promise<EthosScore | null> {
    try {
      console.log(`Web3.bio: Enhanced lookup for ${userkey}`);
      
      // Get connected profiles from Web3.bio
      const connections = await this.web3bioClient.getConnectedProfiles(userkey);
      console.log(`Web3.bio: Found connections for ${userkey}:`, connections);

      // Priority order: Twitter first (most likely to have Ethos profile), then Farcaster
      const searchOrder = [
        { platform: 'Twitter/X', key: connections.twitter },
        { platform: 'Farcaster', key: connections.farcaster },
        { platform: 'ENS', key: connections.ens },
        { platform: 'Address', key: connections.address }
      ];

      let bestProfile = null;
      let connectionInfo = '';

      for (const { platform, key } of searchOrder) {
        if (!key) continue;

        console.log(`Web3.bio: Trying ${platform} connection: ${key}`);
        
        let userData = null;
        if (platform === 'Twitter/X') {
          userData = await this.tryTwitterLookup(key);
        } else if (platform === 'Farcaster') {
          userData = await this.tryFarcasterLookup(key);
        } else if (platform === 'ENS' || platform === 'Address') {
          userData = await this.tryAddressLookup(key);
        }

        if (userData) {
          console.log(`Web3.bio: Found Ethos profile via ${platform}: ${key}`);
          
          // Create enhanced profile with connection info
          bestProfile = {
            userkey: userData.userkeys?.[0] || key,
            score: userData.score || 0,
            rank: userData.rank,
            xpTotal: userData.xpTotal || 0,
            reviewCount: this.calculateReviewCount(userData.stats),
            vouchCount: userData.stats?.vouch?.received?.count || 0,
            status: userData.status || 'ACTIVE',
            displayName: userData.displayName,
            username: userData.username
          };

          // Add connection context for user
          if (platform === 'Twitter/X' && userkey !== key) {
            connectionInfo = ` (connected Twitter: @${key})`;
          } else if (platform === 'Farcaster' && userkey !== key) {
            connectionInfo = ` (connected Farcaster: ${key})`;
          }
          
          break; // Use the first successful match
        }
      }

      if (bestProfile && connectionInfo) {
        bestProfile.displayName = (bestProfile.displayName || bestProfile.username || userkey) + connectionInfo;
      }

      return bestProfile;
    } catch (error) {
      console.log(`Web3.bio: Enhanced lookup failed for ${userkey}:`, error);
      return null;
    }
  }

  // Helper methods for specific platform lookups
  private async tryTwitterLookup(username: string): Promise<any> {
    try {
      const result = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [username] })
      });
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      return null;
    }
  }

  private async tryFarcasterLookup(username: string): Promise<any> {
    try {
      const result = await this.request('/users/by/farcaster/usernames', {
        method: 'POST',
        body: JSON.stringify({ farcasterUsernames: [username] })
      });
      return result.users && result.users.length > 0 ? result.users[0].user : null;
    } catch (error) {
      return null;
    }
  }

  private async tryAddressLookup(address: string): Promise<any> {
    try {
      const result = await this.request('/users/by/address', {
        method: 'POST',
        body: JSON.stringify({ addresses: [address] })
      });
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      return null;
    }
  }

  private async lookupUser(userkey: string): Promise<any> {
    console.log(`Looking up user: ${userkey}`);
    
    // Handle Farcaster-specific searches first
    if (userkey.startsWith('farcaster_username:')) {
      const username = userkey.replace('farcaster_username:', '');
      try {
        console.log(`Trying Farcaster username lookup for: ${username}`);
        const farcasterResult = await this.request('/users/by/farcaster/usernames', {
          method: 'POST',
          body: JSON.stringify({ farcasterUsernames: [username] })
        });
        
        if (farcasterResult.users && farcasterResult.users.length > 0) {
          console.log(`Found Farcaster user: ${username}`);
          return farcasterResult.users[0].user;
        }
      } catch (error) {
        console.log(`Farcaster username lookup failed for ${username}:`, error);
      }
      return null;
    }

    if (userkey.startsWith('farcaster_id:')) {
      const farcasterIdValue = userkey.replace('farcaster_id:', '');
      try {
        console.log(`Trying Farcaster ID lookup for: ${farcasterIdValue}`);
        const farcasterIdResult = await this.request('/users/by/farcaster', {
          method: 'POST',
          body: JSON.stringify({ farcasterIds: [farcasterIdValue] })
        });
        
        if (farcasterIdResult && farcasterIdResult.length > 0) {
          console.log(`Found Farcaster ID user: ${farcasterIdValue}`);
          return farcasterIdResult[0];
        }
      } catch (error) {
        console.log(`Farcaster ID lookup failed for ${farcasterIdValue}:`, error);
      }
      return null;
    }

    // Handle ENS domains (.eth) - these are Ethereum addresses
    if (userkey.endsWith('.eth')) {
      try {
        console.log(`Trying ENS lookup for: ${userkey}`);
        const addressResult = await this.request('/users/by/address', {
          method: 'POST',
          body: JSON.stringify({ addresses: [userkey] })
        });
        
        if (addressResult && addressResult.length > 0) {
          console.log(`Found ENS user: ${userkey}`);
          return addressResult[0];
        }
      } catch (error) {
        console.log(`ENS lookup failed for ${userkey}:`, error);
      }
    }

    // Handle Ethereum addresses (0x...)
    if (userkey.startsWith('0x') || userkey.includes('address:')) {
      try {
        const address = userkey.replace('address:', '');
        console.log(`Trying address lookup for: ${address}`);
        const addressResult = await this.request('/users/by/address', {
          method: 'POST',
          body: JSON.stringify({ addresses: [address] })
        });
        
        if (addressResult && addressResult.length > 0) {
          console.log(`Found address user: ${address}`);
          return addressResult[0];
        }
      } catch (error) {
        console.log(`Address lookup failed for ${userkey.replace('address:', '')}:`, error);
      }
    }

    // Handle profile IDs (numeric)
    if (/^\d+$/.test(userkey)) {
      try {
        console.log(`Trying profile ID lookup for: ${userkey}`);
        const profileResult = await this.request('/users/by/profile-id', {
          method: 'POST',
          body: JSON.stringify({ profileIds: [parseInt(userkey)] })
        });
        
        if (profileResult && profileResult.length > 0) {
          console.log(`Found profile ID user: ${userkey}`);
          return profileResult[0];
        }
      } catch (error) {
        console.log(`Profile ID lookup failed for ${userkey}:`, error);
      }
    }

    // Try Twitter/X lookup (most common for usernames)
    try {
      console.log(`Trying Twitter/X lookup for: ${userkey}`);
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (xResult && xResult.length > 0) {
        console.log(`Found Twitter/X user: ${userkey}`);
        return xResult[0];
      }
    } catch (error) {
      console.log(`Twitter/X lookup failed for ${userkey}:`, error);
    }

    // Try Farcaster username lookup
    try {
      console.log(`Trying Farcaster username lookup for: ${userkey}`);
      const farcasterResult = await this.request('/users/by/farcaster/usernames', {
        method: 'POST',
        body: JSON.stringify({ farcasterUsernames: [userkey] })
      });
      
      if (farcasterResult.users && farcasterResult.users.length > 0) {
        console.log(`Found Farcaster user: ${userkey}`);
        return farcasterResult.users[0].user;
      }
    } catch (error) {
      console.log(`Farcaster username lookup failed for ${userkey}:`, error);
    }

    // Try Farcaster ID lookup if it looks like an ID
    if (/^\d+$/.test(userkey)) {
      try {
        console.log(`Trying Farcaster ID lookup for: ${userkey}`);
        const farcasterIdResult = await this.request('/users/by/farcaster', {
          method: 'POST',
          body: JSON.stringify({ farcasterIds: [userkey] })
        });
        
        if (farcasterIdResult && farcasterIdResult.length > 0) {
          console.log(`Found Farcaster ID user: ${userkey}`);
          return farcasterIdResult[0];
        }
      } catch (error) {
        console.log(`Farcaster ID lookup failed for ${userkey}:`, error);
      }
    }

    // Try Discord ID lookup if it looks like a Discord ID
    if (/^\d{17,19}$/.test(userkey)) {
      try {
        console.log(`Trying Discord lookup for: ${userkey}`);
        const discordResult = await this.request('/users/by/discord', {
          method: 'POST',
          body: JSON.stringify({ discordIds: [userkey] })
        });
        
        if (discordResult && discordResult.length > 0) {
          console.log(`Found Discord user: ${userkey}`);
          return discordResult[0];
        }
      } catch (error) {
        console.log(`Discord lookup failed for ${userkey}:`, error);
      }
    }

    // Try Telegram ID lookup if it looks like a Telegram ID
    if (/^\d{8,12}$/.test(userkey)) {
      try {
        console.log(`Trying Telegram lookup for: ${userkey}`);
        const telegramResult = await this.request('/users/by/telegram', {
          method: 'POST',
          body: JSON.stringify({ telegramIds: [userkey] })
        });
        
        if (telegramResult && telegramResult.length > 0) {
          console.log(`Found Telegram user: ${userkey}`);
          return telegramResult[0];
        }
      } catch (error) {
        console.log(`Telegram lookup failed for ${userkey}:`, error);
      }
    }

    console.log(`No user found for: ${userkey}`);
    return null;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
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
      throw new Error(`Ethos API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private calculateReviewCount(stats: any): number {
    if (!stats?.review?.received) return 0;
    
    const received = stats.review.received;
    return (received.positive || 0) + (received.neutral || 0) + (received.negative || 0);
  }

  /**
   * Get detailed XP data for a user using the enhanced EthosNetworkClient
   */
  async getXPData(userkey: string): Promise<XPData | null> {
    try {
      const client = new (await import('../server/ethos-client.js')).EthosNetworkClient();
      
      // Get total XP across all seasons
      const totalXP = await client.getUserXP(userkey);
      
      // Get seasons information
      const seasonsData = await client.getXPSeasons();
      const currentSeason = seasonsData.currentSeason;
      
      // Get current season XP
      let currentSeasonXP = null;
      if (currentSeason) {
        currentSeasonXP = await client.getUserSeasonXP(userkey, currentSeason.id);
      }
      
      // Get leaderboard rank
      const leaderboardRank = await client.getUserLeaderboardRank(userkey);
      
      // Get weekly data for current season
      let weeklyData: WeeklyXPData[] = [];
      if (currentSeason) {
        weeklyData = await client.getUserXPBySeasonAndWeek(userkey, currentSeason.id);
      }

      return {
        totalXP: totalXP || 0,
        currentSeasonXP: currentSeasonXP || 0,
        leaderboardRank: leaderboardRank || 0,
        weeklyData
      };
    } catch (error) {
      console.error('Error fetching XP data:', error);
      return null;
    }
  }

  /**
   * Get XP seasons information
   */
  async getSeasons(): Promise<SeasonsResponse | null> {
    try {
      return await this.request('/xp/seasons');
    } catch (error) {
      console.error('Error fetching seasons:', error);
      return null;
    }
  }

  /**
   * Get weekly XP data for a user in a specific season
   */
  async getWeeklyXP(userkey: string, seasonId: number): Promise<WeeklyXPData[] | null> {
    try {
      const normalizedKey = this.normalizeUserkey(userkey);
      return await this.request(`/xp/user/${encodeURIComponent(normalizedKey)}/season/${seasonId}/weekly`);
    } catch (error) {
      console.error('Error fetching weekly XP:', error);
      return null;
    }
  }

  /**
   * Get enhanced profile with XP data
   */
  async getEnhancedProfileWithXP(userkey: string): Promise<(EthosScore & { xpData?: XPData }) | null> {
    try {
      // Get basic profile
      const profile = await this.getEthosScore(userkey);
      if (!profile) return null;

      // Get detailed XP data
      const xpData = await this.getXPData(userkey);
      
      return {
        ...profile,
        xpData: xpData || undefined
      };
    } catch (error) {
      console.error('Error fetching enhanced profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const ethosClient = new EthosLangChainClient();

// Helper functions for easy import
export async function getEthosScore(userkey: string): Promise<EthosScore | null> {
  return ethosClient.getEthosScore(userkey);
}

export async function getXPData(userkey: string): Promise<XPData | null> {
  return ethosClient.getXPData(userkey);
}

export async function getEnhancedProfile(userkey: string): Promise<(EthosScore & { xpData?: XPData }) | null> {
  return ethosClient.getEnhancedProfileWithXP(userkey);
}