/**
 * Ethos Network API Client
 * Official API integration for Web3 reputation data
 */

export interface EthosProfile {
  address: string;
  score: number;
  reviewCount: number;
  vouchCount: number;
  activity: EthosActivity[];
  credibility: {
    score: number;
    rank: number;
    percentile: number;
  };
}

export interface EthosActivity {
  id: string;
  type: 'review' | 'vouch' | 'slash';
  score: number;
  comment?: string;
  from: string;
  to: string;
  timestamp: string;
  ethAmount?: string; // For vouches
}

export interface EthosReview {
  id: string;
  fromAddress: string;
  toAddress: string;
  score: number;
  comment: string;
  timestamp: string;
}

export class EthosNetworkClient {
  private baseUrl = 'https://api.ethos.network/api/v2';
  private clientHeader: string;

  constructor(clientId: string = 'ethos-farcaster-terminal-v1.0') {
    this.clientHeader = clientId;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': this.clientHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Ethos API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getProfileScore(userkey: string): Promise<{ score: number; rank?: number }> {
    try {
      // Format userkey according to Ethos API docs
      const formattedUserkey = this.formatUserkey(userkey);
      const data = await this.request(`/profile/score?userkey=${encodeURIComponent(formattedUserkey)}`);
      return {
        score: data.score || 0,
        rank: data.rank || null
      };
    } catch (error) {
      console.error(`Failed to get profile score for ${userkey}:`, error);
      return { score: 0 };
    }
  }

  private formatUserkey(userkey: string): string {
    // Handle different userkey formats according to Ethos API docs
    if (userkey.startsWith('0x')) {
      return `address:${userkey}`;
    }
    if (userkey.includes('@')) {
      // Remove @ and treat as username - could be Twitter/X
      const username = userkey.replace('@', '');
      return `service:x.com:username:${username}`;
    }
    if (userkey.includes('.eth')) {
      // ENS names might be resolved to addresses
      return `address:${userkey}`;
    }
    // For profiles like 'cookedzera', try multiple formats
    // First try as Farcaster username (most common for Web3 users)
    return userkey; // Try direct userkey first, then we'll implement fallbacks
  }

  async getProfileData(userkey: string): Promise<EthosProfile | null> {
    // Try different lookup methods based on API documentation
    
    // 1. Try Farcaster username lookup first (most common for Web3 users)
    try {
      const farcasterResult = await this.request('/users/by/farcaster/usernames', {
        method: 'POST',
        body: JSON.stringify({ farcasterUsernames: [userkey] })
      });
      
      if (farcasterResult.users && farcasterResult.users.length > 0) {
        return this.transformUserData(farcasterResult.users[0].user);
      }
    } catch (error) {
      console.log(`Farcaster username lookup failed for ${userkey}`);
    }

    // 2. Try Twitter/X username lookup
    try {
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (xResult && xResult.length > 0) {
        return this.transformUserData(xResult[0]);
      }
    } catch (error) {
      console.log(`Twitter/X lookup failed for ${userkey}`);
    }

    // 3. Try as Ethereum address if it looks like one
    if (userkey.startsWith('0x') && userkey.length === 42) {
      try {
        const addressResult = await this.request('/users/by/address', {
          method: 'POST',
          body: JSON.stringify({ addresses: [userkey] })
        });
        
        if (addressResult && addressResult.length > 0) {
          return this.transformUserData(addressResult[0]);
        }
      } catch (error) {
        console.log(`Address lookup failed for ${userkey}`);
      }
    }

    // 4. Try as profile ID if it's numeric
    if (/^\d+$/.test(userkey)) {
      try {
        const profileIdResult = await this.request('/users/by/profile-id', {
          method: 'POST',
          body: JSON.stringify({ profileIds: [parseInt(userkey)] })
        });
        
        if (profileIdResult && profileIdResult.length > 0) {
          return this.transformUserData(profileIdResult[0]);
        }
      } catch (error) {
        console.log(`Profile ID lookup failed for ${userkey}`);
      }
    }

    return null;
  }

  private transformUserData(userData: any): EthosProfile & { xpTotal: number } {
    return {
      address: userData.userkeys?.[0] || userData.id?.toString() || '',
      score: userData.score || 0,
      reviewCount: (userData.stats?.review?.received?.positive || 0) + (userData.stats?.review?.received?.neutral || 0) + (userData.stats?.review?.received?.negative || 0),
      vouchCount: userData.stats?.vouch?.received?.count || 0,
      activity: [],
      credibility: {
        score: userData.score || 0,
        rank: 0, // Not provided in API response
        percentile: 0 // Not provided in API response
      },
      xpTotal: userData.xpTotal || 0
    };
  }

  async getUserXP(userkey: string): Promise<number> {
    try {
      // First get the profile to find the correct userkey format
      const profile = await this.getProfileData(userkey);
      if (!profile || !profile.address) {
        return 0;
      }
      
      // Use the correct userkey from the profile data
      const correctUserkey = profile.address;
      const xpTotal = await this.request(`/xp/user/${encodeURIComponent(correctUserkey)}`);
      return typeof xpTotal === 'number' ? xpTotal : 0;
    } catch (error) {
      console.error(`Failed to get XP for ${userkey}:`, error);
      return 0;
    }
  }

  async getUserXPBySeasonAndWeek(userkey: string, seasonId: number): Promise<any[]> {
    try {
      // Get weekly XP data for a specific season
      const weeklyData = await this.request(`/xp/user/${encodeURIComponent(userkey)}/season/${seasonId}/weekly`);
      return weeklyData || [];
    } catch (error) {
      console.error(`Failed to get weekly XP for ${userkey}:`, error);
      return [];
    }
  }

  async getXPForTimeframe(userkey: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      // First get the profile to find the correct userkey format
      const profile = await this.getProfileData(userkey);
      if (!profile || !profile.address) {
        return 0;
      }
      
      // For now, return 0 for timeframe-specific XP since Ethos API doesn't provide this granular data
      // In a real implementation, you would need to aggregate XP activities within the timeframe
      console.log(`Timeframe XP calculation not implemented for ${userkey} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
      return 0;
    } catch (error) {
      console.error(`Failed to get timeframe XP for ${userkey}:`, error);
      return 0;
    }
  }

  async getActivityObjects(userkey: string, limit: number = 10): Promise<EthosActivity[]> {
    try {
      // Use the correct activities endpoint with userkey parameter
      const data = await this.request(`/activities/userkey?userkey=${encodeURIComponent(userkey)}&limit=${limit}`);
      return (data || []).map((activity: any) => ({
        id: activity.id || String(Math.random()),
        type: activity.type || 'review',
        score: activity.score || 0,
        comment: activity.comment || '',
        from: activity.author || activity.from || '',
        to: activity.subject || activity.to || '',
        timestamp: activity.createdAt || activity.timestamp || new Date().toISOString(),
        ethAmount: activity.ethAmount
      }));
    } catch (error) {
      console.error(`Failed to get activity for ${userkey}:`, error);
      return [];
    }
  }

  async getReviews(userkey: string): Promise<EthosReview[]> {
    try {
      const data = await this.request(`/reviews?userkey=${encodeURIComponent(userkey)}`);
      return data.reviews || [];
    } catch (error) {
      console.error(`Failed to get reviews for ${userkey}:`, error);
      return [];
    }
  }

  async searchProfiles(query: string): Promise<EthosProfile[]> {
    try {
      const data = await this.request(`/search?q=${encodeURIComponent(query)}`);
      return data.profiles || [];
    } catch (error) {
      console.error(`Failed to search profiles for ${query}:`, error);
      return [];
    }
  }

  async getLeaderboard(limit: number = 10): Promise<EthosProfile[]> {
    try {
      const data = await this.request(`/leaderboard?limit=${limit}`);
      return data.profiles || [];
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  async compareProfiles(userkey1: string, userkey2: string): Promise<{
    profile1: EthosProfile | null;
    profile2: EthosProfile | null;
    comparison: {
      scoreDiff: number;
      rankDiff: number;
      reviewDiff: number;
      vouchDiff: number;
    } | null;
  }> {
    try {
      const [profile1, profile2] = await Promise.all([
        this.getProfileData(userkey1),
        this.getProfileData(userkey2)
      ]);

      let comparison = null;
      if (profile1 && profile2) {
        comparison = {
          scoreDiff: profile1.score - profile2.score,
          rankDiff: (profile2.credibility.rank || 0) - (profile1.credibility.rank || 0), // Lower rank is better
          reviewDiff: profile1.reviewCount - profile2.reviewCount,
          vouchDiff: profile1.vouchCount - profile2.vouchCount
        };
      }

      return { profile1, profile2, comparison };
    } catch (error) {
      console.error(`Failed to compare profiles ${userkey1} vs ${userkey2}:`, error);
      return { profile1: null, profile2: null, comparison: null };
    }
  }

  // XP API Methods
  async getCurrentSeason(): Promise<{ id: number; name: string; week: number }> {
    try {
      const data = await this.request('/xp/seasons');
      return data.currentSeason;
    } catch (error) {
      console.error('Error fetching current season:', error);
      throw error;
    }
  }

  async getUserTotalXP(userkey: string): Promise<number> {
    try {
      // Get user profile with Twitter/X lookup to find proper userkey
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (!xResult || xResult.length === 0 || !xResult[0].userkeys || xResult[0].userkeys.length === 0) {
        return 0;
      }
      
      const ethosUserkey = xResult[0].userkeys[0]; // Use the first userkey from Ethos
      const xp = await this.request(`/xp/user/${encodeURIComponent(ethosUserkey)}`);
      return xp || 0;
    } catch (error) {
      console.error('Error fetching user total XP:', error);
      return 0;
    }
  }

  async getUserSeasonXP(userkey: string, seasonId: number): Promise<number> {
    try {
      // Get user profile with Twitter/X lookup to find proper userkey
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (!xResult || xResult.length === 0 || !xResult[0].userkeys || xResult[0].userkeys.length === 0) {
        return 0;
      }
      
      const ethosUserkey = xResult[0].userkeys[0]; // Use the first userkey from Ethos
      const xp = await this.request(`/xp/user/${encodeURIComponent(ethosUserkey)}/season/${seasonId}`);
      return xp || 0;
    } catch (error) {
      console.error('Error fetching user season XP:', error);
      return 0;
    }
  }

  async getUserWeeklyXP(userkey: string, seasonId: number): Promise<Array<{ week: number; weeklyXp: number; cumulativeXp: number }>> {
    try {
      // Get user profile with Twitter/X lookup to find proper userkey
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (!xResult || xResult.length === 0 || !xResult[0].userkeys || xResult[0].userkeys.length === 0) {
        return [];
      }
      
      const ethosUserkey = xResult[0].userkeys[0]; // Use the first userkey from Ethos
      const weeklyData = await this.request(`/xp/user/${encodeURIComponent(ethosUserkey)}/season/${seasonId}/weekly`);
      return weeklyData || [];
    } catch (error) {
      console.error('Error fetching user weekly XP:', error);
      return [];
    }
  }

  async getUserXPRank(userkey: string): Promise<number> {
    try {
      const formattedUserkey = this.formatUserkey(userkey);
      const rank = await this.request(`/xp/user/${encodeURIComponent(formattedUserkey)}/leaderboard-rank`);
      return rank || 0;
    } catch (error) {
      console.error('Error fetching user XP rank:', error);
      return 0;
    }
  }
}

export const ethosClient = new EthosNetworkClient();