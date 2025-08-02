/**
 * Dynamic API Executor - Handles real-time API calls based on Groq AI analysis
 * This system allows users to ask any question and get real data from Ethos Network
 */

import { ethosClient } from "./ethos-client";

export interface APIExecutionResult {
  success: boolean;
  data: any;
  message: string;
  isRealData: boolean;
}

export class DynamicAPIExecutor {
  
  /**
   * Execute API call based on user intent and parameters
   */
  static async executeAPICall(intent: string, parameters: any): Promise<APIExecutionResult> {
    try {
      switch (intent) {
        case 'user_profile':
          return await this.getUserProfile(parameters.userkey);
          
        case 'user_stats':
          return await this.getUserStats(parameters.userkey, parameters.timeframe);
          
        case 'user_reviews':
          return await this.getUserReviews(parameters.userkey);
          
        case 'user_comparison':
          return await this.compareUsers(parameters.userkeys);
          
        case 'leaderboard':
          return await this.getLeaderboard(parameters.limit, parameters.metric);
          
        case 'search_users':
          return await this.searchUsers(parameters.query);
          
        default:
          return {
            success: false,
            data: null,
            message: `Intent "${intent}" not supported`,
            isRealData: false
          };
      }
    } catch (error) {
      console.error('API execution error:', error);
      return {
        success: false,
        data: null,
        message: `API call failed: ${error instanceof Error ? error.message : String(error)}`,
        isRealData: false
      };
    }
  }
  
  private static async getUserProfile(userkey: string): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const profile = await ethosClient.getProfileData(userkey);
    
    return {
      success: !!profile,
      data: profile,
      message: profile ? "Profile data retrieved successfully" : "User not found in Ethos Network",
      isRealData: !!profile
    };
  }
  
  private static async getUserStats(userkey: string, timeframe: string = 'week'): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const profile = await ethosClient.getProfileData(userkey);
    const activity = profile ? await ethosClient.getActivityObjects(userkey, 50) : [];
    
    if (!profile) {
      return {
        success: false,
        data: null,
        message: "User not found in Ethos Network",
        isRealData: false
      };
    }
    
    // Calculate timeframe-specific stats
    const now = new Date();
    let periodStart = new Date();
    
    switch (timeframe) {
      case 'day':
        periodStart.setDate(now.getDate() - 1);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
      default:
        periodStart = new Date(0); // All time
    }
    
    const periodActivity = activity.filter(act => 
      new Date(act.timestamp) >= periodStart
    );
    
    const periodScore = periodActivity.reduce((sum, act) => sum + (act.score || 0), 0);
    
    const stats = {
      ...profile,
      timeframe,
      periodScore,
      periodActivity: periodActivity.length
    };
    
    return {
      success: true,
      data: stats,
      message: "Statistics retrieved successfully",
      isRealData: true
    };
  }
  
  private static async getUserReviews(userkey: string): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const reviews = await ethosClient.getReviews(userkey);
    
    return {
      success: true,
      data: reviews,
      message: `Retrieved ${reviews.length} reviews`,
      isRealData: reviews.length > 0
    };
  }
  
  private static async compareUsers(userkeys: string[]): Promise<APIExecutionResult> {
    if (!userkeys || userkeys.length < 2) {
      return {
        success: false,
        data: null,
        message: "Two user identifiers required for comparison",
        isRealData: false
      };
    }
    
    const comparison = await ethosClient.compareProfiles(userkeys[0], userkeys[1]);
    
    return {
      success: !!(comparison.profile1 && comparison.profile2),
      data: comparison,
      message: comparison.profile1 && comparison.profile2 ? 
        "Comparison completed successfully" : 
        "One or both users not found",
      isRealData: !!(comparison.profile1 && comparison.profile2)
    };
  }
  
  private static async getLeaderboard(limit: number = 10, metric: string = 'score'): Promise<APIExecutionResult> {
    const leaderboard = await ethosClient.getLeaderboard(limit);
    
    return {
      success: leaderboard.length > 0,
      data: leaderboard,
      message: `Retrieved top ${leaderboard.length} users`,
      isRealData: leaderboard.length > 0
    };
  }
  
  private static async searchUsers(query: string): Promise<APIExecutionResult> {
    if (!query) {
      return {
        success: false,
        data: null,
        message: "Search query required",
        isRealData: false
      };
    }
    
    const results = await ethosClient.searchProfiles(query);
    
    return {
      success: true,
      data: results,
      message: `Found ${results.length} users matching "${query}"`,
      isRealData: results.length > 0
    };
  }
}