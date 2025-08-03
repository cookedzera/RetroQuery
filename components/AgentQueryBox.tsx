/**
 * Frontend component for LangChain Agent queries
 * Compatible with both Express.js and Next.js setups
 */

import React, { useState } from 'react';

interface AgentResponse {
  success: boolean;
  response: string;
  executionTime: number;
  timestamp: string;
}

export default function AgentQueryBox() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example queries for users
  const exampleQueries = [
    "What is cookedzera's reputation score?",
    "Check vitalik.eth's Ethos Network data",
    "Show me farcaster:3621's onchain reputation",
    "Compare 0x742d35Cc6064F7AF4B5A9D8E5A6E02f4d6a6A9C7 reputation"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Try Next.js API route first, fallback to Express endpoint
      const endpoints = ['/api/langchain-agent', '/api/langchain/query'];
      
      let result = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query.trim() }),
          });

          if (res.ok) {
            result = await res.json();
            break;
          }
        } catch (err) {
          // Try next endpoint
          continue;
        }
      }

      if (!result) {
        throw new Error('Failed to connect to LangChain agent');
      }

      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          LangChain AI Agent
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Ask questions about Web3 reputation data using natural language. 
          The AI agent will automatically fetch Ethos Network data when needed.
        </p>
      </div>

      {/* Example queries */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Try these examples:</p>
        <div className="flex flex-wrap gap-2">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Query form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about any wallet address, ENS name, or Farcaster profile..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            disabled={loading}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Supports: wallet addresses (0x...), ENS names (.eth), Farcaster IDs (farcaster:123), Twitter usernames
        </p>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-blue-700 dark:text-blue-300">
              AI agent is processing your query...
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Agent Response</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {response.executionTime}ms • {new Date(response.timestamp).toLocaleTimeString()}
            </div>
          </div>
          
          <div className="prose dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
              {response.response}
            </pre>
          </div>

          {response.success && (
            <div className="mt-3 text-xs text-green-600 dark:text-green-400">
              ✓ Query completed successfully
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Powered by:</strong> LangChain + Groq Mixtral-8x7B + Ethos Network API
          <br />
          <strong>Deployment ready:</strong> Optimized for Vercel Edge Functions with fast responses
        </p>
      </div>
    </div>
  );
}

// Example usage for fetch API (for vanilla JS/TS projects)
export const queryLangChainAgent = async (query: string): Promise<AgentResponse> => {
  const response = await fetch('/api/langchain-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Example usage for different frameworks
export const exampleUsage = {
  // Next.js
  nextjs: `
// pages/index.tsx
import AgentQueryBox from '../components/AgentQueryBox';

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <AgentQueryBox />
    </div>
  );
}
  `,
  
  // React (Express.js backend)
  react: `
// App.tsx
import AgentQueryBox from './components/AgentQueryBox';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <AgentQueryBox />
    </div>
  );
}
  `,
  
  // Vanilla JS fetch
  vanilla: `
// Query the agent programmatically
const response = await fetch('/api/langchain-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    query: "What is vitalik.eth's reputation score?" 
  })
});

const result = await response.json();
console.log(result.response);
  `
};