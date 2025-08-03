/**
 * Express.js route for LangChain agent
 * This can be easily adapted to Next.js API routes
 */

import { Request, Response } from 'express';
import { queryEthosAgent, type AgentResponse, type AgentRequest } from './langchain-agent.js';

// Main LangChain agent endpoint
export async function handleLangChainQuery(req: Request, res: Response): Promise<void> {
  try {
    // Validate request
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { query, maxTokens, temperature }: AgentRequest = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      res.status(400).json({ 
        error: 'Query is required and must be a string' 
      });
      return;
    }

    if (query.length > 1000) {
      res.status(400).json({ 
        error: 'Query too long. Maximum 1000 characters.' 
      });
      return;
    }

    // Get Groq API key from environment
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      res.status(500).json({ 
        error: 'GROQ_API_KEY not configured' 
      });
      return;
    }

    // Execute agent query
    const result = await queryEthosAgent(query, groqApiKey);

    // Prepare response
    const response: AgentResponse = {
      ...result,
      timestamp: new Date().toISOString()
    };

    // Set caching headers for successful responses
    if (result.success && result.executionTime < 5000) {
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'CDN-Cache-Control': 'public, max-age=300'
      });
    }

    res.status(result.success ? 200 : 500).json(response);
  } catch (error) {
    console.error('LangChain route error:', error);
    
    const errorResponse: AgentResponse = {
      success: false,
      response: 'Internal server error',
      executionTime: 0,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
}

// Health check endpoint for the agent
export async function handleAgentHealth(req: Request, res: Response): Promise<void> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      groq_configured: !!groqApiKey,
      version: '1.0.0'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}