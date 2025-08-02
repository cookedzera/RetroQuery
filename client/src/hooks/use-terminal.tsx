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
        
        // If we have structured parameters, make additional API calls for real data
        if (aiResponse.intent && aiResponse.parameters) {
          await handleStructuredQuery(aiResponse);
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

  const handleStructuredQuery = useCallback(async (aiResponse: any) => {
    // Execute dynamic API calls based on Groq's analysis
    const { intent, parameters, api_action } = aiResponse;
    
    try {
      if (intent === 'xp_query' || intent === 'attestation_lookup' || intent === 'reputation_score') {
        // Get user stats using real Ethos Network data
        let userkey = 'address:0x9876543210fedcba9876543210fedcba98765432'; // default
        
        if (parameters.usernames?.[0]) {
          userkey = parameters.usernames[0]; // Use username directly (no @ symbol)
        } else if (parameters.addresses?.[0]) {
          userkey = parameters.addresses[0];
        }
        
        const period = parameters.timeframe || 'week';
        
        const stats = await EthosApi.getUserStats(userkey, period);
        if (stats) {
          addOutput('ETHOS NETWORK DATA RETRIEVED:');
          if (stats.isRealData) {
            addOutput('⚡ LIVE DATA FROM ETHOS NETWORK API');
            addOutput(`CREDIBILITY SCORE: ${stats.score || stats.reputation || 0}`);
            addOutput(`PERIOD ACTIVITY: ${stats.periodScore || stats.periodXp || 0}`);
            addOutput(`REVIEWS: ${stats.reviews || stats.reviewCount || 0}`);
            addOutput(`VOUCHES: ${stats.vouches || stats.vouchCount || 0}`);
            addOutput(`RANK: #${stats.rank || 0}`);
            if (stats.percentile) addOutput(`PERCENTILE: ${stats.percentile}%`);
          } else {
            addOutput('⚠ USING MOCK DATA (DEVELOPMENT MODE)');
            addOutput(`XP: ${stats.xp?.toLocaleString() || 0}`);
            addOutput(`PERIOD XP: ${stats.periodXp || 0}`);
            addOutput(`REPUTATION: ${stats.reputation || 0}`);
            addOutput(`RANK: #${stats.rank || 0}`);
          }
          addOutput('');
        }
      } else if (intent === 'user_comparison' && parameters.usernames?.length > 0) {
        // Compare users with real Ethos data
        const username = parameters.usernames[0];
        const user = await EthosApi.searchUser(username);
        if (user) {
          if (Array.isArray(user)) {
            const profile = user[0];
            addOutput(`FOUND USER: ${profile.username || profile.address}`);
            addOutput(`SCORE: ${profile.score?.toLocaleString() || 0}`);
            addOutput(`REPUTATION: ${profile.reputation || 0}`);
            if (profile.isRealData) addOutput('⚡ LIVE ETHOS NETWORK DATA');
          } else {
            addOutput(`FOUND USER: ${user.username || user.address}`);
            addOutput(`SCORE: ${user.score?.toLocaleString() || user.xp?.toLocaleString() || 0}`);
            addOutput(`REPUTATION: ${user.reputation || 0}`);
            if (user.isRealData) addOutput('⚡ LIVE ETHOS NETWORK DATA');
          }
          addOutput('');
        }
      } else if (intent === 'leaderboard') {
        // Get leaderboard with real Ethos data
        const leaderboard = await EthosApi.getLeaderboard(10, parameters.metric || 'score');
        if (leaderboard) {
          addOutput('ETHOS NETWORK LEADERBOARD:');
          if (leaderboard.length > 0 && leaderboard[0].isRealData) {
            addOutput('⚡ LIVE DATA FROM ETHOS NETWORK API');
          }
          leaderboard.slice(0, 5).forEach((user: any, index: number) => {
            const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐';
            const displayName = user.username || user.address?.slice(0, 10) + '...';
            const score = user.score || user.xp || 0;
            addOutput(`${index + 1}. ${emoji} ${displayName} - ${score.toLocaleString()} SCORE`);
          });
          addOutput('');
        }
      } else if (intent === 'attestation_lookup') {
        // Get user reviews/attestations
        const userkey = parameters.addresses?.[0] || parameters.usernames?.[0] || 'address:0x9876543210fedcba9876543210fedcba98765432';
        const reviews = await EthosApi.getUserReviews(userkey);
        if (reviews && reviews.length > 0) {
          addOutput('USER REVIEWS RETRIEVED:');
          if (reviews[0].isRealData) {
            addOutput('⚡ LIVE ETHOS NETWORK REVIEWS');
          }
          reviews.slice(0, 5).forEach((review: any, index: number) => {
            const reviewer = review.attesterUsername || review.fromAddress?.slice(0, 10) + '...';
            addOutput(`${index + 1}. ${reviewer} - Score: ${review.score}`);
            if (review.comment) addOutput(`   "${review.comment}"`);
          });
          addOutput('');
        }
      }
    } catch (error) {
      console.error('Structured query error:', error);
      // Don't show error to user, the AI response is sufficient
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
