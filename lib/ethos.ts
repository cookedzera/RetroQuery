/**
 * Ethos Network API utility for Next.js projects
 * Simple, clean implementation for getEthosScore function
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

/**
 * Get Ethos Network reputation score for a given userkey
 * Supports multiple input formats: addresses, ENS, Farcaster IDs, usernames
 */
export async function getEthosScore(userkey: string): Promise<EthosScore | null> {
  try {
    const normalizedKey = normalizeUserkey(userkey);
    const userData = await lookupUser(normalizedKey);
    
    if (!userData) {
      return null;
    }

    return {
      userkey: userData.userkeys?.[0] || normalizedKey,
      score: userData.score || 0,
      rank: userData.rank,
      xpTotal: userData.xpTotal || 0,
      reviewCount: calculateReviewCount(userData.stats),
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
 * Normalize userkey to proper format for Ethos API
 */
function normalizeUserkey(input: string): string {
  const cleaned = input.trim();
  
  // Handle Ethereum addresses
  if (cleaned.startsWith('0x') && cleaned.length === 42) {
    return `address:${cleaned}`;
  }
  
  // Handle ENS names
  if (cleaned.endsWith('.eth')) {
    return `address:${cleaned}`;
  }
  
  // Handle explicit formats (already properly formatted)
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
  
  // Default: treat as username and try different platforms
  return cleaned;
}

/**
 * Look up user data using various Ethos API endpoints
 */
async function lookupUser(userkey: string): Promise<any> {
  const baseUrl = 'https://api.ethos.network/api/v2';
  
  // Try Twitter/X lookup first (most common)
  try {
    const xResult = await request(`${baseUrl}/users/by/x`, {
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
    const farcasterResult = await request(`${baseUrl}/users/by/farcaster/usernames`, {
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
      const addressResult = await request(`${baseUrl}/users/by/address`, {
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
      const profileResult = await request(`${baseUrl}/users/by/profile-id`, {
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

/**
 * Make HTTP request to Ethos API
 */
async function request(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Ethos-Client': 'next-js-v1.0',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Ethos API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate total review count from stats object
 */
function calculateReviewCount(stats: any): number {
  if (!stats?.review?.received) return 0;
  
  const received = stats.review.received;
  return (received.positive || 0) + (received.neutral || 0) + (received.negative || 0);
}

/**
 * Helper function to convert different userkey formats
 * For use in frontend components
 */
export function convertUserkey(input: string, targetFormat: 'address' | 'farcaster' | 'twitter'): string {
  const cleaned = input.trim();
  
  switch (targetFormat) {
    case 'address':
      if (cleaned.startsWith('0x')) return `address:${cleaned}`;
      if (cleaned.endsWith('.eth')) return `address:${cleaned}`;
      return cleaned;
      
    case 'farcaster':
      if (cleaned.startsWith('farcaster:')) return cleaned;
      if (/^\d+$/.test(cleaned)) return `farcaster:${cleaned}`;
      return `service:farcaster:${cleaned}`;
      
    case 'twitter':
      if (cleaned.startsWith('service:x.com:')) return cleaned;
      return `service:x.com:username:${cleaned.replace('@', '')}`;
      
    default:
      return cleaned;
  }
}