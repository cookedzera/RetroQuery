import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { EthosApi } from "@/lib/ethos-api";

export function useTerminal() {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const aiQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/ai/query', { query });
      return response.json();
    }
  });

  useEffect(() => {
    bootSequence();
  }, []);

  const bootSequence = useCallback(() => {
    const bootMessages = [
      'ETHOS TERMINAL v2.1 INITIALIZING...',
      'LOADING WEB3 REPUTATION MODULE...',
      'CONNECTING TO GROQ AI NETWORK...',
      'ESTABLISHING ETHOS API CONNECTION...',
      'SCANNING BLOCKCHAIN DATA...',
      'NATURAL LANGUAGE PROCESSOR: ONLINE',
      'ATTESTATION ANALYZER: READY',
      'REPUTATION CALCULATOR: ACTIVE',
      '',
      'SYSTEM READY. TYPE "help" FOR AVAILABLE COMMANDS.',
      'ASK NATURAL LANGUAGE QUESTIONS ABOUT ETHOS NETWORK DATA.',
      ''
    ];

    let i = 0;
    const bootInterval = setInterval(() => {
      if (i < bootMessages.length) {
        addOutput(bootMessages[i]);
        i++;
      } else {
        clearInterval(bootInterval);
        setIsBooting(false);
      }
    }, 300);
  }, []);

  const addOutput = useCallback((text: string) => {
    setOutput(prev => [...prev, text]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  const handleCommand = useCallback(async (command: string) => {
    const cmd = command.toLowerCase().trim();
    
    // Add command to output
    addOutput(`ethos@terminal:~$ ${command}`);
    
    // Add to command history
    setCommandHistory(prev => [command, ...prev.slice(0, 49)]); // Keep last 50 commands
    setHistoryIndex(-1);
    
    // Add loading flicker effect
    setIsLoading(true);
    
    try {
      if (cmd === 'help') {
        await showHelp();
      } else if (cmd === 'clear') {
        clearOutput();
      } else if (cmd === 'history') {
        showHistory();
      } else if (cmd === 'export') {
        exportSession();
      } else if (cmd === 'about') {
        showAbout();
      } else if (cmd === 'settings') {
        addOutput('SETTINGS PANEL OPENED.');
        addOutput('');
      } else {
        // Natural language query
        await processNaturalLanguage(command);
      }
    } catch (error) {
      addOutput('ERROR: Failed to process command.');
      addOutput('');
    } finally {
      setIsLoading(false);
    }
  }, [addOutput, clearOutput, commandHistory, aiQueryMutation]);

  const processNaturalLanguage = useCallback(async (query: string) => {
    addOutput('ANALYZING QUERY...');
    addOutput('CONNECTING TO GROQ AI NETWORK...');
    
    try {
      const result = await aiQueryMutation.mutateAsync(query);
      
      // Show AI service status
      if (result.usingGroqAI) {
        addOutput('⚡ GROQ AI LLAMA 3.1-70B ONLINE');
      } else if (result.usingMockData) {
        addOutput('⚠ USING DEVELOPMENT MODE (NO API KEY)');
      }
      
      if (result.response) {
        let aiResponse;
        try {
          // Try to parse as JSON first
          aiResponse = JSON.parse(result.response);
        } catch {
          // If not JSON, treat as plain text
          aiResponse = { natural_response: result.response };
        }
        
        addOutput('PROCESSING COMPLETE.');
        addOutput('');
        
        if (aiResponse.natural_response) {
          const lines = aiResponse.natural_response.split('\n');
          lines.forEach((line: string) => addOutput(line));
        } else {
          addOutput('AI PROCESSING COMPLETE.');
          addOutput('Unable to generate response.');
        }
        
        addOutput('');
        
        // Display API results if available from the backend
        if (result.apiResult) {
          // Debug: Log the aiResponse structure
          console.log('AI Response:', aiResponse);
          console.log('Parameters:', aiResponse.parameters);
          console.log('Metric:', aiResponse.parameters?.metric);
          
          await displayApiResult(result.apiResult, result.extractedIntent, aiResponse.parameters?.metric);
        }
      } else {
        addOutput('ERROR: No response from AI service.');
        addOutput('');
      }
    } catch (error) {
      console.error('AI query error:', error);
      addOutput('ERROR: Failed to connect to AI service.');
      addOutput('Please check your connection and try again.');
      addOutput('');
    }
  }, [aiQueryMutation, addOutput]);

  const displayApiResult = useCallback(async (apiResult: any, intent: string, specificMetric?: string) => {
    try {
      // Debug: Log what we received
      console.log('Display function - Intent:', intent);
      console.log('Display function - Specific Metric:', specificMetric);
      if (!apiResult.success) {
        addOutput(`ERROR: ${apiResult.message || 'API call failed'}`);
        addOutput('');
        return;
      }

      const data = apiResult.data;
      if (!data) {
        addOutput('No data available.');
        addOutput('');
        return;
      }

      // Display results based on intent
      if (intent === 'user_profile') {
        // User Profile with modern styling
        addOutput('┌─ User Profile ─────────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live data from Ethos Network API                │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        addOutput(`│ Address: ${(data.address || 'Unknown').padEnd(38)} │`);
        addOutput(`│ Credibility Score: ${String(data.score?.toLocaleString() || 0).padEnd(30)} │`);
        addOutput(`│ Reviews Received: ${String(data.reviewCount || 0).padEnd(31)} │`);
        addOutput(`│ Vouches Received: ${String(data.vouchCount || 0).padEnd(31)} │`);
        if (data.credibility?.rank > 0) {
          addOutput(`│ Rank: #${String(data.credibility.rank).padEnd(39)} │`);
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');
        
      } else if (intent === 'user_stats') {
        // Show specific metric or all stats based on request
        if (specificMetric && specificMetric !== 'all') {
          switch (specificMetric) {
            case 'xp':
              // XP Data with modern styling
              addOutput('┌─ XP Data ──────────────────────────────────────────┐');
              if (apiResult.isRealData) {
                addOutput('│ ✓ Live data from Ethos Network API                │');
              }
              addOutput('├─────────────────────────────────────────────────────┤');
              if (data.timeframe && data.timeframe !== 'all') {
                const timeframeName = data.timeframe.charAt(0).toUpperCase() + data.timeframe.slice(1);
                addOutput(`│ ${timeframeName} XP: ${String(data.timeframeXP || 0).padEnd(35)} │`);
                
                // Show additional weekly details if available
                if (data.weeklyDetails && data.timeframe === 'week') {
                  addOutput(`│ This Week: ${String(data.weeklyDetails.weeklyXP?.toLocaleString() || 0).padEnd(35)} │`);
                  addOutput(`│ Season Total: ${String(data.weeklyDetails.totalSeasonXP?.toLocaleString() || 0).padEnd(33)} │`);
                }
                
                addOutput(`│ Total XP: ${String(data.totalXP?.toLocaleString() || 0).padEnd(37)} │`);
              } else {
                addOutput(`│ Total XP: ${String(data.totalXP?.toLocaleString() || 0).padEnd(37)} │`);
              }
              addOutput('└─────────────────────────────────────────────────────┘');
              addOutput('');
              break;
              
            case 'score':
              addOutput(`CREDIBILITY SCORE: ${data.score?.toLocaleString() || 0} ⭐`);
              break;
              
            case 'reviews':
              addOutput(`REVIEWS RECEIVED: ${data.reviewCount || 0} 📝`);
              break;
              
            case 'vouches':
              addOutput(`VOUCHES RECEIVED: ${data.vouchCount || 0} 🤝`);
              break;
              
            case 'rank':
              if (data.credibility?.rank > 0) {
                addOutput(`RANK: #${data.credibility.rank} 🏆`);
                if (data.credibility.percentile) {
                  addOutput(`PERCENTILE: ${data.credibility.percentile}%`);
                }
              } else {
                addOutput('RANK: Not available');
              }
              break;
              
            default:
              addOutput(`${specificMetric.toUpperCase()}: Data not available`);
          }
        } else {
          // Show all stats when no specific metric requested
          addOutput('═══ USER STATISTICS ═══');
          if (apiResult.isRealData) {
            addOutput('⚡ LIVE DATA FROM ETHOS NETWORK API');
          }
          if (data.totalXP) {
            addOutput(`TOTAL XP: ${data.totalXP?.toLocaleString() || 0} ⚡`);
          }
          addOutput(`CREDIBILITY SCORE: ${data.score?.toLocaleString() || 0} ⭐`);
          addOutput(`REVIEWS: ${data.reviewCount || 0} 📝`);
          addOutput(`VOUCHES: ${data.vouchCount || 0} 🤝`);
          if (data.timeframe) {
            addOutput(`TIMEFRAME: ${data.timeframe.toUpperCase()}`);
          }
        }
        addOutput('');
        
      } else if (intent === 'user_activities') {
        // User Activities Display
        addOutput('┌─ User Activities ─────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live activity data from Ethos Network API       │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.activities && data.activities.length > 0) {
          addOutput(`│ Found ${data.activities.length} activities (${data.direction || 'all'}) │`);
          addOutput('├─────────────────────────────────────────────────────┤');
          data.activities.slice(0, 5).forEach((activity: any, index: number) => {
            const type = activity.activityType || activity.type || 'activity';
            const date = activity.timestamp ? new Date(activity.timestamp).toLocaleDateString() : 'unknown';
            addOutput(`│ ${index + 1}. ${type.toUpperCase()} - ${date.padEnd(30)} │`);
          });
          if (data.activities.length > 5) {
            addOutput(`│ ... and ${data.activities.length - 5} more activities │`);
          }
        } else {
          addOutput('│ No activities found for this user                  │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'user_activity_history') {
        // Activity History with Trends
        addOutput('┌─ Activity History & Trends ──────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live historical data from Ethos Network API     │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.summary) {
          addOutput(`│ Timeframe: ${(data.summary.timeframe || 'unknown').toUpperCase().padEnd(38)} │`);
          addOutput(`│ Total Activities: ${String(data.summary.totalActivities || 0).padEnd(31)} │`);
          addOutput(`│ Given: ${String(data.summary.given || 0).padEnd(41)} │`);
          addOutput(`│ Received: ${String(data.summary.received || 0).padEnd(37)} │`);
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'activity_feed') {
        // Global Activity Feed
        addOutput('┌─ Global Activity Feed ────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live feed from Ethos Network API                │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.activities && data.activities.length > 0) {
          addOutput(`│ Showing latest ${data.activities.length} activities │`);
          addOutput('├─────────────────────────────────────────────────────┤');
          data.activities.slice(0, 10).forEach((activity: any, index: number) => {
            const type = activity.activityType || activity.type || 'activity';
            const author = activity.author?.username || activity.authorAddress || 'unknown';
            addOutput(`│ ${(index + 1).toString().padStart(2)}. ${type.toUpperCase()} by ${author.slice(0, 20)} │`);
          });
        } else {
          addOutput('│ No recent activities found                         │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'user_networks') {
        // Social Networks Display
        addOutput('┌─ Connected Social Networks ──────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live network data from Ethos Network API        │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        const networks = Object.keys(data);
        if (networks.length > 0) {
          networks.forEach(network => {
            const status = data[network].connected ? '✓' : '✗';
            addOutput(`│ ${status} ${network.toUpperCase().padEnd(45)} │`);
          });
        } else {
          addOutput('│ No connected networks found                        │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'reputation_trends') {
        // Reputation Trends Analysis
        addOutput('┌─ Reputation Trends ───────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live trend analysis from Ethos Network API      │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.summary) {
          addOutput(`│ Timeframe: ${(data.summary.timeframe || 'unknown').toUpperCase().padEnd(38)} │`);
          addOutput(`│ Score Change: ${String(data.summary.scoreChange || 0).padEnd(33)} │`);
          addOutput(`│ Reviews Received: ${String(data.summary.reviewsReceived || 0).padEnd(29)} │`);
          addOutput(`│ Vouches Received: ${String(data.summary.vouchesReceived || 0).padEnd(29)} │`);
        }
        if (data.dataPoints && data.dataPoints.length > 0) {
          addOutput('├─────────────────────────────────────────────────────┤');
          addOutput('│ Recent Trend Points:                               │');
          data.dataPoints.slice(0, 3).forEach((point: any) => {
            const date = new Date(point.date).toLocaleDateString();
            const change = point.scoreChange > 0 ? `+${point.scoreChange}` : point.scoreChange.toString();
            addOutput(`│ ${date}: ${change} score, ${point.activityCount} activities │`);
          });
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'user_votes') {
        // Voting Patterns Display
        addOutput('┌─ Voting Patterns ─────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live voting data from Ethos Network API         │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.votes && data.votes.length > 0) {
          const upvotes = data.votes.filter((v: any) => v.isUpvote).length;
          const downvotes = data.votes.length - upvotes;
          addOutput(`│ Total Votes: ${String(data.votes.length).padEnd(35)} │`);
          addOutput(`│ Upvotes: ${String(upvotes).padEnd(39)} │`);
          addOutput(`│ Downvotes: ${String(downvotes).padEnd(37)} │`);
        } else {
          addOutput('│ No voting data found                               │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'user_reviews') {
        // Enhanced Reviews Display
        addOutput('┌─ User Reviews ─────────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live review data from Ethos Network API         │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.reviews && data.reviews.length > 0) {
          addOutput(`│ Total Reviews: ${String(data.reviews.length).padEnd(33)} │`);
          data.reviews.slice(0, 3).forEach((review: any, index: number) => {
            const score = review.score || 0;
            const scoreIcon = score > 0 ? '👍' : score < 0 ? '👎' : '➡️';
            addOutput(`│ ${index + 1}. Score: ${score} ${scoreIcon} ${(review.comment || '').slice(0, 20)} │`);
          });
        } else {
          addOutput('│ No reviews found                                   │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'leaderboard') {
        // Enhanced Leaderboard Display
        addOutput('┌─ Leaderboard ──────────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live leaderboard from Ethos Network API         │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.leaderboard && data.leaderboard.length > 0) {
          data.leaderboard.slice(0, 10).forEach((user: any, index: number) => {
            const rank = index + 1;
            const name = (user.username || user.address || 'unknown').slice(0, 20);
            const score = user.score || 0;
            addOutput(`│ ${rank.toString().padStart(2)}. ${name.padEnd(20)} ${score.toLocaleString().padStart(10)} │`);
          });
        } else {
          addOutput('│ No leaderboard data available                      │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else if (intent === 'user_comparison') {
        // Enhanced User Comparison
        addOutput('┌─ User Comparison ──────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live comparison from Ethos Network API          │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        if (data.comparison && data.comparison.length >= 2) {
          const user1 = data.comparison[0];
          const user2 = data.comparison[1];
          addOutput(`│ User 1: ${(user1.username || user1.address || 'unknown').padEnd(37)} │`);
          addOutput(`│ Score: ${String(user1.score || 0).padEnd(41)} │`);
          addOutput(`│ User 2: ${(user2.username || user2.address || 'unknown').padEnd(37)} │`);
          addOutput(`│ Score: ${String(user2.score || 0).padEnd(41)} │`);
        } else {
          addOutput('│ Comparison data not available                      │');
        }
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');

      } else {
        // Generic display for other data types
        addOutput('┌─ Data Retrieved ──────────────────────────────────┐');
        if (apiResult.isRealData) {
          addOutput('│ ✓ Live data from Ethos Network API                │');
        }
        addOutput('├─────────────────────────────────────────────────────┤');
        addOutput('│ Raw data available - use specific commands for     │');
        addOutput('│ better formatted display                           │');
        addOutput('└─────────────────────────────────────────────────────┘');
        addOutput('');
      }
      
    } catch (error) {
      console.error('Display error:', error);
      addOutput('ERROR: Failed to display results.');
      addOutput('');
    }
  }, [addOutput]);

  const handleStructuredQuery = useCallback(async (aiResponse: any) => {
    // This function is deprecated - API results come directly from backend now
    // Just show a simple processing message
    try {
      addOutput('Processing with real-time API integration...');
      addOutput('');
    } catch (error) {
      console.error('Structured query error:', error);
    }
  }, [addOutput]);

  const showHelp = useCallback(async () => {
    const helpText = [
      'ETHOS TERMINAL - AVAILABLE COMMANDS:',
      '',
      'SYSTEM COMMANDS:',
      '  help      - Show this help message',
      '  clear     - Clear terminal screen',
      '  history   - Show command history',
      '  export    - Download session log',
      '  settings  - Open settings panel',
      '  about     - Show system information',
      '',
      'NATURAL LANGUAGE QUERIES:',
      '  "What was my XP this week?"',
      '  "Compare me with @vitalik"',
      '  "Who gave me attestations?"',
      '  "Show top users by reputation"',
      '  "What\'s my reputation trend?"',
      '',
      'SHORTCUTS:',
      '  ↑/↓ arrows - Navigate command history',
      '  Tab        - Auto-complete (coming soon)',
      '  Ctrl+L     - Clear screen',
      ''
    ];
    
    // Add delay for each line to simulate typing
    for (const line of helpText) {
      addOutput(line);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }, [addOutput]);

  const showHistory = useCallback(() => {
    addOutput('COMMAND HISTORY:');
    addOutput('');
    if (commandHistory.length === 0) {
      addOutput('No commands in history.');
    } else {
      commandHistory.slice(0, 10).forEach((cmd, i) => {
        addOutput(`${i + 1}. ${cmd}`);
      });
    }
    addOutput('');
  }, [addOutput, commandHistory]);

  const exportSession = useCallback(() => {
    const sessionData = output.join('\n');
    const blob = new Blob([sessionData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ethos-terminal-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addOutput('SESSION EXPORTED TO DOWNLOADS FOLDER.');
    addOutput('');
  }, [addOutput, output]);

  const showAbout = useCallback(() => {
    const aboutText = [
      'ETHOS AI TERMINAL v2.1',
      '═══════════════════════',
      '',
      'Powered by:',
      '• Groq AI (Llama 3.1 70B)',
      '• Ethos Network APIs',
      '• Web3 Reputation Protocol',
      '',
      'Features:',
      '• Natural language queries',
      '• Real-time data analysis',
      '• Retro CRT aesthetics',
      '• Mobile-optimized interface',
      '',
      'Built for the Ethos Network community.',
      'Where Web3 reputation meets retro computing.',
      ''
    ];
    
    aboutText.forEach(line => addOutput(line));
  }, [addOutput]);

  return {
    output,
    input,
    setInput,
    handleCommand,
    commandHistory,
    historyIndex,
    setHistoryIndex,
    isBooting,
    isLoading,
    clearOutput
  };
}
