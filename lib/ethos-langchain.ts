/**
 * Ethos Network API utility for LangChain agent
 * Handles userkey normalization and score fetching
 */

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

export class EthosLangChainClient {
  private baseUrl = 'https://api.ethos.network/api/v2';

  /**
   * Normalize userkey to proper Ethos format
   */
  normalizeUserkey(input: string): string {
    // Remove whitespace
    const cleaned = input.trim();
    
    // Handle Ethereum addresses
    if (cleaned.startsWith('0x') && cleaned.length === 42) {
      return `address:${cleaned}`;
    }
    
    // Handle ENS names
    if (cleaned.endsWith('.eth')) {
      return `address:${cleaned}`;
    }
    
    // Handle explicit formats
    if (cleaned.startsWith('address:') || 
        cleaned.startsWith('service:') || 
        cleaned.startsWith('profileId:')) {
      return cleaned;
    }
    
    // Handle farcaster: prefix
    if (cleaned.startsWith('farcaster:')) {
      const id = cleaned.replace('farcaster:', '');
      return `service:farcaster:${id}`;
    }
    
    // Handle twitter: or x: prefix
    if (cleaned.startsWith('twitter:') || cleaned.startsWith('x:')) {
      const username = cleaned.split(':')[1];
      return `service:x.com:username:${username}`;
    }
    
    // Default: assume it's a username and try Twitter/X first
    return cleaned;
  }

  /**
   * Fetch Ethos score for a given userkey
   */
  async getEthosScore(userkey: string): Promise<EthosScore | null> {
    try {
      const normalizedKey = this.normalizeUserkey(userkey);
      
      // Try different lookup methods based on the userkey format
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

  private async lookupUser(userkey: string): Promise<any> {
    console.log(`Looking up user: ${userkey}`);
    
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
        console.log(`Address lookup failed for ${address}:`, error);
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
}

// Export singleton instance
export const ethosClient = new EthosLangChainClient();

// Helper function for easy import
export async function getEthosScore(userkey: string): Promise<EthosScore | null> {
  return ethosClient.getEthosScore(userkey);
}