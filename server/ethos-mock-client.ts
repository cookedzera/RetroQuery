/**
 * Mock Ethos Network client with realistic Web3 reputation data
 * Used when real API is unavailable or for development
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
  ethAmount?: string;
}

export interface EthosReview {
  id: string;
  fromAddress: string;
  toAddress: string;
  score: number;
  comment: string;
  timestamp: string;
}

// Mock data with realistic Web3 addresses and reputation data
const mockProfiles: Record<string, EthosProfile> = {
  'address:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045': {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    score: 892,
    reviewCount: 47,
    vouchCount: 23,
    activity: [],
    credibility: {
      score: 892,
      rank: 15,
      percentile: 96
    }
  },
  'service:x.com:username:VitalikButerin': {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    score: 1547,
    reviewCount: 234,
    vouchCount: 156,
    activity: [],
    credibility: {
      score: 1547,
      rank: 1,
      percentile: 99.9
    }
  },
  'vitalik': {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    score: 1547,
    reviewCount: 234,
    vouchCount: 156,
    activity: [],
    credibility: {
      score: 1547,
      rank: 1,
      percentile: 99.9
    }
  },
  'cookedzera': {
    address: '0x742d35Cc6736C0532925a3b8D9d8bAdE3C0F16C3',
    score: 456,
    reviewCount: 28,
    vouchCount: 12,
    activity: [],
    credibility: {
      score: 456,
      rank: 156,
      percentile: 75
    }
  },
  'profileId:10': {
    address: '0x742d35Cc6736C0532925a3b8D9d8bAdE3C0F16C3',
    score: 456,
    reviewCount: 28,
    vouchCount: 12,
    activity: [],
    credibility: {
      score: 456,
      rank: 156,
      percentile: 75
    }
  }
};

const mockReviews: Record<string, EthosReview[]> = {
  'address:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045': [
    {
      id: 'review_1',
      fromAddress: '0x742d35Cc6736C0532925a3b8D9d8bAdE3C0F16C3',
      toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      score: 85,
      comment: 'Excellent contributor to the ecosystem',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'review_2',
      fromAddress: '0x1234567890abcdef1234567890abcdef12345678',
      toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      score: 92,
      comment: 'Trusted and reliable in DeFi interactions',
      timestamp: new Date(Date.now() - 172800000).toISOString()
    }
  ],
  'cookedzera': [
    {
      id: 'review_3',
      fromAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      toAddress: '0x742d35Cc6736C0532925a3b8D9d8bAdE3C0F16C3',
      score: 78,
      comment: 'Great work on Web3 development projects',
      timestamp: new Date(Date.now() - 259200000).toISOString()
    },
    {
      id: 'review_4',
      fromAddress: '0x9876543210fedcba9876543210fedcba98765432',
      toAddress: '0x742d35Cc6736C0532925a3b8D9d8bAdE3C0F16C3',
      score: 82,
      comment: 'Reliable community member and developer',
      timestamp: new Date(Date.now() - 604800000).toISOString()
    }
  ]
};

export class EthosMockClient {
  async getProfileScore(userkey: string): Promise<{ score: number; rank?: number }> {
    const profile = mockProfiles[userkey];
    if (profile) {
      return {
        score: profile.score,
        rank: profile.credibility.rank
      };
    }
    return { score: 0 };
  }

  async getProfileData(userkey: string): Promise<EthosProfile | null> {
    return mockProfiles[userkey] || null;
  }

  async getActivityObjects(userkey: string, limit: number = 10): Promise<EthosActivity[]> {
    const profile = mockProfiles[userkey];
    if (!profile) return [];
    
    // Generate mock activity
    const activities: EthosActivity[] = [];
    for (let i = 0; i < Math.min(limit, 5); i++) {
      activities.push({
        id: `activity_${i}`,
        type: i % 3 === 0 ? 'review' : i % 3 === 1 ? 'vouch' : 'slash',
        score: 20 + (i * 15),
        comment: `Activity ${i + 1}`,
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: userkey,
        timestamp: new Date(Date.now() - (i * 86400000)).toISOString(),
        ethAmount: i % 3 === 1 ? '0.1' : undefined
      });
    }
    return activities;
  }

  async getReviews(userkey: string): Promise<EthosReview[]> {
    return mockReviews[userkey] || [];
  }

  async searchProfiles(query: string): Promise<EthosProfile[]> {
    const results: EthosProfile[] = [];
    for (const [key, profile] of Object.entries(mockProfiles)) {
      if (key.toLowerCase().includes(query.toLowerCase()) || 
          profile.address.toLowerCase().includes(query.toLowerCase())) {
        results.push(profile);
      }
    }
    return results;
  }

  async getLeaderboard(limit: number = 10): Promise<EthosProfile[]> {
    return Object.values(mockProfiles)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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
    const profile1 = mockProfiles[userkey1] || null;
    const profile2 = mockProfiles[userkey2] || null;

    let comparison = null;
    if (profile1 && profile2) {
      comparison = {
        scoreDiff: profile1.score - profile2.score,
        rankDiff: profile2.credibility.rank - profile1.credibility.rank,
        reviewDiff: profile1.reviewCount - profile2.reviewCount,
        vouchDiff: profile1.vouchCount - profile2.vouchCount
      };
    }

    return { profile1, profile2, comparison };
  }
}

export const ethosMockClient = new EthosMockClient();