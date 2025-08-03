/**
 * Enhanced Ethos Network XP Agent with detailed tracking
 * Handles all XP-related queries including weekly data, seasonal tracking, and leaderboard rankings
 */

import { getEthosScore, getXPData, getEnhancedProfile } from '../lib/ethos-langchain';

export async function handleXPQuery(query: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  
  // Extract user identifier from the query
  const userMatch = query.match(/(?:user|profile|for|of)\s+([a-zA-Z0-9_.-]+(?:\.eth)?|0x[a-fA-F0-9]{40})/i);
  const userkey = userMatch ? userMatch[1] : null;
  
  if (!userkey) {
    return "I need a username or identifier to check XP data. Please specify the user like: 'serpinxbt weekly xp' or 'check dwr.eth XP'.";
  }

  try {
    // Handle weekly XP queries
    if (lowerQuery.includes('weekly') || lowerQuery.includes('week')) {
      const enhancedProfile = await getEnhancedProfile(userkey);
      
      if (!enhancedProfile?.xpData) {
        return `No detailed XP data found for ${userkey}. They may not have participated in the current XP season.`;
      }

      const { xpData } = enhancedProfile;
      let response = `${enhancedProfile.displayName || enhancedProfile.username || userkey} Weekly XP Summary:\n\n`;
      response += `🎯 Total XP (All Seasons): ${xpData.totalXP.toLocaleString()}\n`;
      response += `📊 Current Season XP: ${(xpData.currentSeasonXP || 0).toLocaleString()}\n`;
      
      if (xpData.leaderboardRank) {
        response += `🏆 Leaderboard Rank: #${xpData.leaderboardRank.toLocaleString()}\n`;
      }
      
      if (xpData.weeklyData && xpData.weeklyData.length > 0) {
        response += `\n📈 Recent Weekly Performance:\n`;
        const recentWeeks = xpData.weeklyData.slice(-4); // Show last 4 weeks
        recentWeeks.forEach(week => {
          response += `• Week ${week.week}: +${week.weeklyXp.toLocaleString()} XP (Cumulative: ${week.cumulativeXp.toLocaleString()})\n`;
        });
      }
      
      return response;
    }
    
    // Handle leaderboard/rank queries
    if (lowerQuery.includes('rank') || lowerQuery.includes('leaderboard')) {
      const xpData = await getXPData(userkey);
      
      if (!xpData) {
        return `No XP data found for ${userkey}. They may not have an active Ethos Network profile.`;
      }
      
      let response = `${userkey} Leaderboard Status:\n\n`;
      response += `🎯 Total XP: ${xpData.totalXP.toLocaleString()}\n`;
      response += `📊 Current Season: ${(xpData.currentSeasonXP || 0).toLocaleString()} XP\n`;
      
      if (xpData.leaderboardRank) {
        response += `🏆 Rank: #${xpData.leaderboardRank.toLocaleString()}\n`;
      } else {
        response += `🏆 Rank: Not ranked (insufficient activity)\n`;
      }
      
      return response;
    }
    
    // Handle general XP queries
    if (lowerQuery.includes('xp') || lowerQuery.includes('experience')) {
      const xpData = await getXPData(userkey);
      
      if (!xpData) {
        return `No XP data found for ${userkey}. They may not have an active Ethos Network profile.`;
      }
      
      let response = `${userkey} XP Summary:\n\n`;
      response += `🎯 Total XP (All Seasons): ${xpData.totalXP.toLocaleString()}\n`;
      response += `📊 Current Season XP: ${(xpData.currentSeasonXP || 0).toLocaleString()}\n`;
      
      if (xpData.leaderboardRank) {
        response += `🏆 Leaderboard Rank: #${xpData.leaderboardRank.toLocaleString()}\n`;
      }
      
      return response;
    }
    
    return `I can help you check XP data. Try asking: "${userkey} weekly xp", "${userkey} leaderboard rank", or "${userkey} total xp".`;
    
  } catch (error) {
    console.error('XP query error:', error);
    return `Error fetching XP data for ${userkey}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}