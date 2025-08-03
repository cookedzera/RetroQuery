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
    // Try Twitter/X lookup first (most common)
    try {
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (xResult && xResult.length > 0) {
        return xResult[0];
      }
    } catch (error) {
      // Continue to next method
    }

    // Try Farcaster lookup
    try {
      const farcasterResult = await this.request('/users/by/farcaster/usernames', {
        method: 'POST',
        body: JSON.stringify({ farcasterUsernames: [userkey] })
      });
      
      if (farcasterResult.users && farcasterResult.users.length > 0) {
        return farcasterResult.users[0].user;
      }
    } catch (error) {
      // Continue to next method
    }

    // Try address lookup if it looks like an address
    if (userkey.startsWith('0x') || userkey.includes('address:')) {
      try {
        const address = userkey.replace('address:', '');
        const addressResult = await this.request('/users/by/address', {
          method: 'POST',
          body: JSON.stringify({ addresses: [address] })
        });
        
        if (addressResult && addressResult.length > 0) {
          return addressResult[0];
        }
      } catch (error) {
        // Continue
      }
    }

    // Try profile ID if numeric
    if (/^\d+$/.test(userkey)) {
      try {
        const profileResult = await this.request('/users/by/profile-id', {
          method: 'POST',
          body: JSON.stringify({ profileIds: [parseInt(userkey)] })
        });
        
        if (profileResult && profileResult.length > 0) {
          return profileResult[0];
        }
      } catch (error) {
        // Final attempt failed
      }
    }

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