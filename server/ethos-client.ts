/**
 * Ethos Network API Client
 * Official API integration for Web3 reputation data
 */

export interface EthosUser {
  id: number;
  profileId: number;
  displayName: string;
  username: string;
  avatarUrl: string;
  description: string;
  score: number;
  status: string;
  userkeys: string[];
  xpTotal: number;
  xpStreakDays: number;
  links: {
    profile: string;
    scoreBreakdown: string;
  };
  stats: {
    review: {
      received: {
        negative: number;
        neutral: number;
        positive: number;
      };
    };
    vouch: {
      given: {
        amountWeiTotal: number;
        count: number;
      };
      received: {
        amountWeiTotal: number;
        count: number;
      };
    };
  };
}

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

  constructor(clientId: string = 'ethos-langchain-agent-v2.0') {
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

  // Enhanced user lookup methods for all identity types
  async getUsersByUserIds(userIds: number[]): Promise<EthosUser[]> {
    return this.request('/users/by/ids', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  async getUsersByAddresses(addresses: string[]): Promise<EthosUser[]> {
    return this.request('/users/by/address', {
      method: 'POST',
      body: JSON.stringify({ addresses }),
    });
  }

  async getUsersByProfileIds(profileIds: number[]): Promise<EthosUser[]> {
    return this.request('/users/by/profile-id', {
      method: 'POST',
      body: JSON.stringify({ profileIds }),
    });
  }

  async getUsersByTwitter(accountIdsOrUsernames: string[]): Promise<EthosUser[]> {
    return this.request('/users/by/x', {
      method: 'POST',
      body: JSON.stringify({ accountIdsOrUsernames }),
    });
  }

  async getUsersByDiscord(discordIds: string[]): Promise<EthosUser[]> {
    return this.request('/users/by/discord', {
      method: 'POST',
      body: JSON.stringify({ discordIds }),
    });
  }

  async getUsersByFarcaster(farcasterIds: string[]): Promise<EthosUser[]> {
    return this.request('/users/by/farcaster', {
      method: 'POST',
      body: JSON.stringify({ farcasterIds }),
    });
  }

  async getUsersByFarcasterUsernames(farcasterUsernames: string[]): Promise<{
    users: Array<{ user: EthosUser; username: string }>;
    notFoundUsernames: string[];
    errorUsernames: string[];
  }> {
    return this.request('/users/by/farcaster/usernames', {
      method: 'POST',
      body: JSON.stringify({ farcasterUsernames }),
    });
  }

  async getUsersByTelegram(telegramIds: string[]): Promise<EthosUser[]> {
    return this.request('/users/by/telegram', {
      method: 'POST',
      body: JSON.stringify({ telegramIds }),
    });
  }

  // Universal user lookup that tries multiple methods
  async findUser(identifier: string): Promise<EthosUser | null> {
    try {
      // Check for Ethereum address (0x...)
      if (identifier.match(/^0x[a-fA-F0-9]{40}$/)) {
        const users = await this.getUsersByAddresses([identifier]);
        return users[0] || null;
      }

      // Check for ENS name (.eth)
      if (identifier.endsWith('.eth')) {
        const users = await this.getUsersByAddresses([identifier]);
        return users[0] || null;
      }

      // Check for numeric Farcaster ID
      if (identifier.match(/^\d+$/) && parseInt(identifier) > 0) {
        const users = await this.getUsersByFarcaster([identifier]);
        return users[0] || null;
      }

      // Check for profile ID (profileId:123)
      if (identifier.startsWith('profileId:')) {
        const profileId = parseInt(identifier.replace('profileId:', ''));
        if (!isNaN(profileId)) {
          const users = await this.getUsersByProfileIds([profileId]);
          return users[0] || null;
        }
      }

      // Check for user ID (userId:123)
      if (identifier.startsWith('userId:')) {
        const userId = parseInt(identifier.replace('userId:', ''));
        if (!isNaN(userId)) {
          const users = await this.getUsersByUserIds([userId]);
          return users[0] || null;
        }
      }

      // Check for Telegram ID (telegram:123 or telegramId:123)
      if (identifier.startsWith('telegram:') || identifier.startsWith('telegramId:')) {
        const telegramId = identifier.replace(/^(telegram:|telegramId:)/, '');
        const users = await this.getUsersByTelegram([telegramId]);
        return users[0] || null;
      }

      // Check for Discord ID (discord:123 or discordId:123)
      if (identifier.startsWith('discord:') || identifier.startsWith('discordId:')) {
        const discordId = identifier.replace(/^(discord:|discordId:)/, '');
        const users = await this.getUsersByDiscord([discordId]);
        return users[0] || null;
      }

      // Check for explicit Farcaster username (farcaster:username)
      if (identifier.startsWith('farcaster:')) {
        const username = identifier.replace('farcaster:', '');
        const result = await this.getUsersByFarcasterUsernames([username]);
        return result.users[0]?.user || null;
      }

      // Try as Twitter/X username
      try {
        const users = await this.getUsersByTwitter([identifier]);
        if (users[0]) return users[0];
      } catch (error) {
        // Continue to next attempt
      }

      // Try as Farcaster username
      try {
        const result = await this.getUsersByFarcasterUsernames([identifier]);
        if (result.users[0]) return result.users[0].user;
      } catch (error) {
        // Continue to next attempt
      }

      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
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

  // Helper method to get raw user data without transformation
  private async getRawUserData(userkey: string): Promise<any> {
    // Try Twitter/X username lookup first (most common)
    try {
      const xResult = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (xResult && xResult.length > 0) {
        return xResult[0];
      }
    } catch (error) {
      console.log(`Twitter/X lookup failed for ${userkey}`);
    }

    // Try Farcaster username lookup
    try {
      const farcasterResult = await this.request('/users/by/farcaster/usernames', {
        method: 'POST',
        body: JSON.stringify({ farcasterUsernames: [userkey] })
      });
      
      if (farcasterResult.users && farcasterResult.users.length > 0) {
        return farcasterResult.users[0].user;
      }
    } catch (error) {
      console.log(`Farcaster username lookup failed for ${userkey}`);
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

  // New comprehensive activity and history methods
  async getUserActivities(userkey: string, direction: string = 'all', activityType?: string, limit: number = 50): Promise<any[]> {
    try {
      // First resolve the userkey to get the proper Ethos userkey
      const rawUserData = await this.getRawUserData(userkey);
      if (!rawUserData || !rawUserData.userkeys || rawUserData.userkeys.length === 0) {
        console.log(`No profile found for ${userkey}`);
        return [];
      }
      
      // Use the first userkey from the raw data
      const ethosUserkey = rawUserData.userkeys[0];
      
      // Use POST endpoint for profile activities based on direction
      let endpoint = '/activities/profile/all';
      if (direction === 'author' || direction === 'given') {
        endpoint = '/activities/profile/given';
      } else if (direction === 'subject' || direction === 'received') {
        endpoint = '/activities/profile/received';
      }
      
      const body: any = {
        userkey: ethosUserkey,
        limit,
        offset: 0,
        orderBy: {
          field: 'timestamp',
          direction: 'desc'
        }
      };
      
      if (activityType) {
        body.filter = [activityType];
      }
      
      const response = await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      return response?.values || [];
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
  }

  async getUserActivityHistory(userkey: string, timeframe: string = 'month', activityType?: string): Promise<{ activities: any[]; summary: any }> {
    try {
      const body: any = { userkey };
      
      if (activityType) {
        body.filter = [activityType];
      }
      
      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      switch (timeframe) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 1);
      }
      
      const activitiesGiven = await this.request('/activities/profile/given', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      const activitiesReceived = await this.request('/activities/profile/received', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      const allActivities = [
        ...(activitiesGiven.values || []),
        ...(activitiesReceived.values || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return {
        activities: allActivities,
        summary: {
          timeframe,
          totalActivities: allActivities.length,
          given: activitiesGiven.values?.length || 0,
          received: activitiesReceived.values?.length || 0
        }
      };
    } catch (error) {
      console.error('Error fetching user activity history:', error);
      return { activities: [], summary: { timeframe, totalActivities: 0, given: 0, received: 0 } };
    }
  }

  async getActivityFeed(filter?: string[], limit: number = 50, dayRange?: number): Promise<{ activities: any[]; total: number }> {
    try {
      const body: any = { limit };
      
      if (filter) {
        body.filter = filter;
      }
      
      if (dayRange) {
        body.dayRange = dayRange;
      }
      
      const feed = await this.request('/activities/feed', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      return {
        activities: feed.values || [],
        total: feed.total || 0
      };
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return { activities: [], total: 0 };
    }
  }

  async getActivityDetails(activityType: string, id: number): Promise<any> {
    try {
      return await this.request(`/activities/${activityType}/${id}`);
    } catch (error) {
      console.error('Error fetching activity details:', error);
      return null;
    }
  }

  async getVotesForActivity(activityType: string, activityId: number): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        type: activityType,
        activityId: activityId.toString()
      });
      
      const voteData = await this.request(`/votes?${params}`);
      return voteData.values || [];
    } catch (error) {
      console.error('Error fetching votes for activity:', error);
      return [];
    }
  }

  async getReviewBetweenUsers(authorUserKey: string, subjectUserKey: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        authorUserKey,
        subjectUserKey
      });
      
      return await this.request(`/reviews/latest/between?${params}`);
    } catch (error) {
      console.error('Error fetching review between users:', error);
      return null;
    }
  }

  async getUserNetworks(userkey: string): Promise<{ [network: string]: any }> {
    try {
      // First get the full user profile to see all connected networks
      const profiles = await this.request('/users/by/x', {
        method: 'POST',
        body: JSON.stringify({ accountIdsOrUsernames: [userkey] })
      });
      
      if (!profiles || profiles.length === 0) {
        return {};
      }
      
      const profile = profiles[0];
      const networks: { [network: string]: any } = {};
      
      // Extract network information from userkeys
      if (profile.userkeys) {
        profile.userkeys.forEach((userkey: string) => {
          if (userkey.startsWith('service:x.com:')) {
            networks.twitter = { userkey, connected: true };
          } else if (userkey.startsWith('service:farcaster:')) {
            networks.farcaster = { userkey, connected: true };
          } else if (userkey.startsWith('service:discord:')) {
            networks.discord = { userkey, connected: true };
          } else if (userkey.startsWith('service:telegram:')) {
            networks.telegram = { userkey, connected: true };
          } else if (userkey.startsWith('address:')) {
            networks.ethereum = { userkey, connected: true };
          }
        });
      }
      
      return networks;
    } catch (error) {
      console.error('Error fetching user networks:', error);
      return {};
    }
  }

  async getReputationTrends(userkey: string, timeframe: string = 'month'): Promise<{ dataPoints: any[]; summary: any }> {
    try {
      // Get user activities for the timeframe to calculate trends
      const history = await this.getUserActivityHistory(userkey, timeframe);
      
      const dataPoints: any[] = [];
      const summary = {
        timeframe,
        totalActivities: history.activities.length,
        scoreChange: 0,
        reviewsReceived: 0,
        vouchesReceived: 0
      };
      
      // Group activities by day/week based on timeframe
      const groupedActivities = this.groupActivitiesByTime(history.activities, timeframe);
      
      Object.entries(groupedActivities).forEach(([date, activities]) => {
        const scoreChange = activities.reduce((sum: number, activity: any) => {
          if (activity.activityType === 'review' || activity.activityType === 'vouch') {
            return sum + (activity.score || 0);
          }
          return sum;
        }, 0);
        
        dataPoints.push({
          date,
          scoreChange,
          activityCount: activities.length,
          activities
        });
      });
      
      // Calculate summary statistics
      summary.reviewsReceived = history.activities.filter(a => a.activityType === 'review').length;
      summary.vouchesReceived = history.activities.filter(a => a.activityType === 'vouch').length;
      summary.scoreChange = dataPoints.reduce((sum, point) => sum + point.scoreChange, 0);
      
      return { dataPoints, summary };
    } catch (error) {
      console.error('Error fetching reputation trends:', error);
      return { dataPoints: [], summary: { timeframe, totalActivities: 0, scoreChange: 0, reviewsReceived: 0, vouchesReceived: 0 } };
    }
  }

  private groupActivitiesByTime(activities: any[], timeframe: string): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    
    activities.forEach(activity => {
      if (!activity.timestamp) return;
      
      const date = new Date(activity.timestamp);
      let key: string;
      
      switch (timeframe) {
        case 'week':
          key = date.toISOString().split('T')[0]; // Daily grouping for week view
          break;
        case 'month':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0]; // Weekly grouping for month view
          break;
        case 'year':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Monthly grouping for year view
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(activity);
    });
    
    return grouped;
  }
}

export const ethosClient = new EthosNetworkClient();