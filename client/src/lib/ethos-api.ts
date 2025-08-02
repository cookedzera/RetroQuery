import { apiRequest } from "@/lib/queryClient";

export class EthosApi {
  static async getUser(userkey: string) {
    try {
      const response = await apiRequest('GET', `/api/ethos/user/${userkey}`);
      return response.json();
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  static async getUserStats(userkey: string, period: string = 'week') {
    try {
      const response = await apiRequest('GET', `/api/ethos/user/${userkey}/stats?period=${period}`);
      return response.json();
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }

  static async getUserReviews(userkey: string) {
    try {
      const response = await apiRequest('GET', `/api/ethos/user/${userkey}/reviews`);
      return response.json();
    } catch (error) {
      console.error('Failed to get user reviews:', error);
      return null;
    }
  }

  static async getLeaderboard(limit: number = 10, orderBy: string = 'xp') {
    try {
      const response = await apiRequest('GET', `/api/ethos/leaderboard?limit=${limit}&orderBy=${orderBy}`);
      return response.json();
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return null;
    }
  }

  static async compareUsers(userkeys: string[]) {
    try {
      const response = await apiRequest('POST', '/api/ethos/compare', { userkeys });
      return response.json();
    } catch (error) {
      console.error('Failed to compare users:', error);
      return null;
    }
  }

  static async searchUser(query: string) {
    try {
      const response = await apiRequest('GET', `/api/ethos/search?query=${encodeURIComponent(query)}`);
      return response.json();
    } catch (error) {
      console.error('Failed to search user:', error);
      return null;
    }
  }

  static async processNaturalLanguageQuery(query: string) {
    try {
      const response = await apiRequest('POST', '/api/ai/query', { query });
      return response.json();
    } catch (error) {
      console.error('Failed to process natural language query:', error);
      return null;
    }
  }
}
