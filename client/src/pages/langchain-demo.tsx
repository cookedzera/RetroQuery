/**
 * Demo page for LangChain AI Agent integration
 * Shows both terminal and LangChain agent side by side
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Terminal, Bot, Check, X } from 'lucide-react';

interface AgentResponse {
  success: boolean;
  response: string;
  executionTime: number;
  timestamp: string;
}

export default function LangChainDemo() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exampleQueries = [
    "What is cookedzera's reputation score?",
    "Check vitalik.eth's Ethos Network data",
    "Show me the reputation of 0x742d35Cc6064F7AF4B5A9D8E5A6E02f4d6a6A9C7",
    "Compare alice.eth vs bob.eth reputation",
    "What is farcaster:3621's onchain credibility?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/langchain/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-green-400 font-mono">
            Ethos AI Agent
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Natural language queries for Web3 reputation data powered by Groq Llama 3.3 + Ethos Network API. 
            Ask about any wallet, ENS name, or username using plain English.
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="bg-green-900 text-green-200">
              <Bot className="w-3 h-3 mr-1" />
              Groq Llama 3.3-70B
            </Badge>
            <Badge variant="secondary" className="bg-blue-900 text-blue-200">
              <Terminal className="w-3 h-3 mr-1" />
              Ethos Network API
            </Badge>
          </div>
        </div>

        {/* Query Interface */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Agent Query
            </CardTitle>
            <CardDescription className="text-gray-400">
              Ask questions about Web3 reputation data in natural language
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Example queries */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(example)}
                    className="text-xs border-gray-600 hover:bg-gray-700 text-gray-300"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            {/* Query form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about any wallet, ENS name, or username..."
                className="flex-1 bg-gray-900 border-gray-600 text-white"
                disabled={loading}
                maxLength={1000}
              />
              <Button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  'Ask AI'
                )}
              </Button>
            </form>

            {/* Status indicators */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-400">
                <span>Supports:</span>
                <code className="text-green-400">0x...</code>
                <code className="text-blue-400">.eth</code>
                <code className="text-purple-400">farcaster:123</code>
                <code className="text-orange-400">username</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="bg-blue-900/20 border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <div className="space-y-1">
                  <p className="text-blue-300 font-medium">AI Agent Processing...</p>
                  <p className="text-blue-400 text-sm">
                    Analyzing query → Calling Ethos API → Generating response
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <X className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-300 font-medium">Error</p>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response */}
        {response && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-green-400 flex items-center gap-2">
                  {response.success ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                  AI Agent Response
                </CardTitle>
                <div className="text-right text-sm text-gray-400">
                  <div>{response.executionTime}ms</div>
                  <div>{new Date(response.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <pre className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed">
                  {response.response}
                </pre>
              </div>
              
              {response.success && (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
                  <Check className="w-4 h-4" />
                  Query completed successfully with real Ethos Network data
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-300">Technical Architecture</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-400 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-green-400 font-medium mb-2">LangChain Agent</h4>
                <ul className="space-y-1">
                  <li>• Optimized query parsing</li>
                  <li>• Groq Llama 3.3-70B LLM</li>
                  <li>• Direct tool execution</li>
                  <li>• Natural language processing</li>
                </ul>
              </div>
              <div>
                <h4 className="text-blue-400 font-medium mb-2">Ethos Network Tool</h4>
                <ul className="space-y-1">
                  <li>• Real-time API calls</li>
                  <li>• Multi-format userkey support</li>
                  <li>• Reputation score retrieval</li>
                  <li>• XP and review data</li>
                </ul>
              </div>
              <div>
                <h4 className="text-purple-400 font-medium mb-2">Performance</h4>
                <ul className="space-y-1">
                  <li>• ~800ms avg response</li>
                  <li>• 15s timeout protection</li>
                  <li>• Edge function ready</li>
                  <li>• HTTP caching enabled</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Powered by LangChain + Groq Llama 3.3 + Ethos Network API
            <br />
            Optimized for fast responses with real-time Web3 reputation data
          </p>
        </div>
      </div>
    </div>
  );
}