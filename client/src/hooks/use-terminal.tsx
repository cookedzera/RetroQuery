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
                addOutput('│ (Ethos API doesn\'t provide timeframe-specific data)│');
                addOutput(`│ Total XP: ${String(data.totalXP?.toLocaleString() || 0).padEnd(37)} │`);
              } else {
                addOutput(`│ Total XP: ${String(data.totalXP?.toLocaleString() || 0).padEnd(37)} │`);
              }
              if (data.timeframe) {
                const timeframeName = data.timeframe.charAt(0).toUpperCase() + data.timeframe.slice(1);
                addOutput(`│ Timeframe: ${timeframeName.padEnd(36)} │`);
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
        
      } else {
        // Generic display for other data types
        addOutput('═══ DATA RETRIEVED ═══');
        if (apiResult.isRealData) {
          addOutput('⚡ LIVE DATA FROM ETHOS NETWORK API');
        }
        addOutput(`RESULT: ${JSON.stringify(data, null, 2)}`);
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
