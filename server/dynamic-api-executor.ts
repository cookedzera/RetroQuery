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

        case 'user_activities':
          return await this.getUserActivities(parameters.userkey, parameters.direction, parameters.activityType, parameters.limit);

        case 'user_activity_history':
          return await this.getUserActivityHistory(parameters.userkey, parameters.timeframe, parameters.activityType);

        case 'activity_feed':
          return await this.getActivityFeed(parameters.filter, parameters.limit, parameters.dayRange);

        case 'activity_details':
          return await this.getActivityDetails(parameters.activityType, parameters.id);

        case 'user_votes':
          return await this.getUserVotes(parameters.userkey, parameters.activityType, parameters.activityId);

        case 'review_details':
          return await this.getReviewDetails(parameters.authorUserKey, parameters.subjectUserKey);

        case 'user_networks':
          return await this.getUserNetworks(parameters.userkey);

        case 'reputation_trends':
          return await this.getReputationTrends(parameters.userkey, parameters.timeframe);
          
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
    
    if (!profile) {
      return {
        success: false,
        data: null,
        message: "User not found in Ethos Network",
        isRealData: false
      };
    }

    // Get real XP data using new Ethos API endpoints
    const now = new Date();
    let periodStart = new Date();
    let timeframeXP = 0;
    let weeklyDetails = null;
    
    try {
      switch (timeframe) {
        case 'day':
          // Daily XP not supported by API - return 0
          periodStart.setDate(now.getDate() - 1);
          timeframeXP = 0;
          break;
        case 'week':
          // Get real weekly XP from current season (Season 1)
          const weeklyData = await ethosClient.getUserWeeklyXP(userkey, 1);
          if (weeklyData && weeklyData.length > 0) {
            const currentWeekData = weeklyData[weeklyData.length - 1];
            timeframeXP = currentWeekData.weeklyXp || 0;
            weeklyDetails = {
              weeklyXP: currentWeekData.weeklyXp || 0,
              totalSeasonXP: currentWeekData.cumulativeXp || 0
            };
          }
          periodStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          // Aggregate last 4 weeks for monthly data
          const monthlyData = await ethosClient.getUserWeeklyXP(userkey, 1);
          if (monthlyData && monthlyData.length >= 4) {
            const last4Weeks = monthlyData.slice(-4);
            timeframeXP = last4Weeks.reduce((sum, week) => sum + (week.weeklyXp || 0), 0);
          }
          periodStart.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          // Year timeframe uses total XP
          const yearlyTotalXP = await ethosClient.getUserTotalXP(userkey);
          timeframeXP = yearlyTotalXP;
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
        default:
          // All time = total XP
          const allTimeTotalXP = await ethosClient.getUserTotalXP(userkey);
          timeframeXP = allTimeTotalXP;
          periodStart = new Date(0);
      }
    } catch (error) {
      console.error('Error fetching XP data:', error);
      // Fallback to profile XP if API calls fail
      timeframeXP = 0;
    }
    
    const stats = {
      ...profile,
      totalXP: await ethosClient.getUserTotalXP(userkey),
      timeframeXP: timeframeXP, // Real XP for the specific timeframe
      timeframe,
      periodRange: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      weeklyDetails
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
  
  // New comprehensive activity and history methods
  private static async getUserActivities(userkey: string, direction: string = 'all', activityType?: string, limit: number = 50): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const activities = await ethosClient.getUserActivities(userkey, direction, activityType, limit);
    
    return {
      success: true, // Always successful, even if no activities found
      data: {
        activities,
        userkey,
        direction,
        activityType: activityType || 'all',
        total: activities.length
      },
      message: activities.length > 0 ? 
        `Retrieved ${activities.length} activities for ${userkey}` : 
        `No activities found for ${userkey}`,
      isRealData: true // This is real API data, even if empty
    };
  }

  private static async getUserActivityHistory(userkey: string, timeframe: string = 'month', activityType?: string): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const history = await ethosClient.getUserActivityHistory(userkey, timeframe, activityType);
    
    return {
      success: history.activities.length > 0,
      data: history,
      message: `Retrieved ${history.activities.length} activities from the last ${timeframe}`,
      isRealData: history.activities.length > 0
    };
  }

  private static async getActivityFeed(filter?: string[], limit: number = 50, dayRange?: number): Promise<APIExecutionResult> {
    const feed = await ethosClient.getActivityFeed(filter, limit, dayRange);
    
    return {
      success: feed.activities.length > 0,
      data: feed,
      message: `Retrieved ${feed.activities.length} activities from feed`,
      isRealData: feed.activities.length > 0
    };
  }

  private static async getActivityDetails(activityType: string, id: number): Promise<APIExecutionResult> {
    if (!activityType || !id) {
      return {
        success: false,
        data: null,
        message: "Activity type and ID required",
        isRealData: false
      };
    }
    
    const activity = await ethosClient.getActivityDetails(activityType, id);
    
    return {
      success: !!activity,
      data: activity,
      message: activity ? "Activity details retrieved" : "Activity not found",
      isRealData: !!activity
    };
  }

  private static async getUserVotes(userkey: string, activityType: string, activityId: number): Promise<APIExecutionResult> {
    if (!userkey || !activityType || !activityId) {
      return {
        success: false,
        data: null,
        message: "User, activity type, and activity ID required",
        isRealData: false
      };
    }
    
    const votes = await ethosClient.getVotesForActivity(activityType, activityId);
    
    return {
      success: votes.length > 0,
      data: {
        votes,
        userkey,
        activityType,
        activityId,
        total: votes.length
      },
      message: `Retrieved ${votes.length} votes for activity`,
      isRealData: votes.length > 0
    };
  }

  private static async getReviewDetails(authorUserKey: string, subjectUserKey: string): Promise<APIExecutionResult> {
    if (!authorUserKey || !subjectUserKey) {
      return {
        success: false,
        data: null,
        message: "Author and subject user keys required",
        isRealData: false
      };
    }
    
    const review = await ethosClient.getReviewBetweenUsers(authorUserKey, subjectUserKey);
    
    return {
      success: !!review,
      data: review,
      message: review ? "Review details retrieved" : "No review found between users",
      isRealData: !!review
    };
  }

  private static async getUserNetworks(userkey: string): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const networks = await ethosClient.getUserNetworks(userkey);
    
    return {
      success: Object.keys(networks).length > 0,
      data: networks,
      message: `Retrieved network connections for ${userkey}`,
      isRealData: Object.keys(networks).length > 0
    };
  }

  private static async getReputationTrends(userkey: string, timeframe: string = 'month'): Promise<APIExecutionResult> {
    if (!userkey) {
      return {
        success: false,
        data: null,
        message: "User identifier required",
        isRealData: false
      };
    }
    
    const trends = await ethosClient.getReputationTrends(userkey, timeframe);
    
    return {
      success: trends.dataPoints.length > 0,
      data: trends,
      message: `Retrieved reputation trends for the last ${timeframe}`,
      isRealData: trends.dataPoints.length > 0
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