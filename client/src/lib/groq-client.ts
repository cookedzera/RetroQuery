export class GroqClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_GROQ_API_KEY || '';
  }

  async chat(messages: Array<{ role: string; content: string }>, model: string = 'llama-3.1-70b-versatile') {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async parseQuery(query: string): Promise<{
    intent: string;
    parameters: Record<string, any>;
    natural_response: string;
  }> {
    const systemPrompt = `You are an AI assistant for the Ethos Network Web3 reputation terminal. 

Parse natural language queries about Web3 reputation data and extract:
- Intent: xp_query, attestation_lookup, user_comparison, leaderboard, reputation_score, trend_analysis
- Parameters: usernames (with @), addresses (0x...), timeframes (week, month, year), metrics (xp, reputation, attestations)

Respond with a JSON object containing:
{
  "intent": "the detected intent",
  "parameters": {
    "addresses": ["array of addresses"],
    "usernames": ["array of usernames without @"],
    "timeframe": "detected timeframe",
    "metric": "detected metric",
    "comparison": boolean
  },
  "natural_response": "A human-readable response in terminal style"
}

For queries you cannot parse, respond with intent: "help" and suggest alternatives.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    const response = await this.chat(messages);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        intent: 'help',
        parameters: {},
        natural_response: 'Unable to parse query. Try asking about XP, attestations, or user comparisons.'
      };
    }
  }
}

export const groqClient = new GroqClient();
