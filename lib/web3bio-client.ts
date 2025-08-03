/**
 * Web3.bio Profile API Client
 * Resolves cross-platform social identities (Twitter, Farcaster, ENS, etc.)
 */

export interface Web3BioProfile {
  address?: string;
  avatar?: string;
  description?: string;
  displayName?: string;
  identity: string;
  platform: string;
  profileUrl?: string;
  resolved?: boolean;
}

export interface Web3BioResponse {
  address?: string;
  avatar?: string;
  description?: string;
  displayName?: string;
  identity: string;
  platform: string;
  profiles?: Web3BioProfile[];
  profileUrl?: string;
  resolved?: boolean;
}

export class Web3BioClient {
  private baseUrl = 'https://api.web3.bio';

  /**
   * Resolve a profile by identity (ENS, Twitter handle, Farcaster username, etc.)
   */
  async resolveProfile(identity: string): Promise<Web3BioResponse | null> {
    try {
      console.log(`Web3.bio: Resolving profile for ${identity}`);
      
      const response = await fetch(`${this.baseUrl}/profile/${encodeURIComponent(identity)}`);
      
      if (!response.ok) {
        console.log(`Web3.bio: Profile not found for ${identity} (${response.status})`);
        return null;
      }

      const data = await response.json();
      console.log(`Web3.bio: Found profile for ${identity}:`, data);
      
      return data as Web3BioResponse;
    } catch (error) {
      console.error('Web3.bio API error:', error);
      return null;
    }
  }

  /**
   * Find connected Twitter profile for a given identity
   */
  async findTwitterProfile(identity: string): Promise<string | null> {
    const profile = await this.resolveProfile(identity);
    
    if (!profile?.profiles) {
      return null;
    }

    // Look for Twitter/X profile in connected accounts
    const twitterProfile = profile.profiles.find(p => 
      p.platform === 'twitter' || p.platform === 'x'
    );

    if (twitterProfile) {
      console.log(`Web3.bio: Found Twitter profile ${twitterProfile.identity} for ${identity}`);
      return twitterProfile.identity;
    }

    return null;
  }

  /**
   * Find connected Farcaster profile for a given identity
   */
  async findFarcasterProfile(identity: string): Promise<string | null> {
    const profile = await this.resolveProfile(identity);
    
    if (!profile?.profiles) {
      return null;
    }

    // Look for Farcaster profile in connected accounts
    const farcasterProfile = profile.profiles.find(p => 
      p.platform === 'farcaster'
    );

    if (farcasterProfile) {
      console.log(`Web3.bio: Found Farcaster profile ${farcasterProfile.identity} for ${identity}`);
      return farcasterProfile.identity;
    }

    return null;
  }

  /**
   * Get all connected social profiles for display
   */
  async getConnectedProfiles(identity: string): Promise<{
    twitter?: string;
    farcaster?: string;
    ens?: string;
    address?: string;
  }> {
    const profiles = await this.resolveProfile(identity);
    
    if (!profiles) {
      return {};
    }

    const connections: any = {};

    // Web3.bio returns an array of profiles for the same person across platforms
    const profileArray = Array.isArray(profiles) ? profiles : [profiles];

    for (const profile of profileArray) {
      // Extract from primary identity
      if (profile.platform === 'ens' && profile.identity.endsWith('.eth')) {
        connections.ens = profile.identity;
      } else if (profile.platform === 'ethereum' && profile.identity.startsWith('0x')) {
        connections.address = profile.identity;
      } else if (profile.platform === 'farcaster') {
        connections.farcaster = profile.identity;
      }

      // Extract from links object - Web3.bio stores social links here
      if (profile.links) {
        console.log(`Web3.bio: Processing links for ${profile.platform}:`, Object.keys(profile.links));
        
        // Twitter can be under 'twitter' or 'x' 
        const twitterLink = profile.links.twitter || profile.links.x;
        if (twitterLink?.handle) {
          connections.twitter = twitterLink.handle;
          console.log(`Web3.bio: Found Twitter handle: ${twitterLink.handle}`);
        }
        
        // Farcaster link
        if (profile.links.farcaster?.handle) {
          connections.farcaster = profile.links.farcaster.handle;
          console.log(`Web3.bio: Found Farcaster handle: ${profile.links.farcaster.handle}`);
        }
      }

      // Extract address if available
      if (profile.address && profile.address.startsWith('0x')) {
        connections.address = profile.address;
      }
    }

    console.log(`Web3.bio: Extracted connections for ${identity}:`, connections);
    return connections;
  }
}