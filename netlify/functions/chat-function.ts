// netlify/functions/chat.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };


  try {
    const { messages } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Messages array required' })
      };
    }

    console.log(process.env.ANTHROPIC_API_KEY)

    // Call Anthropic API from the server
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a knowledgeable and friendly assistant for Goodwood Lodge No. 159, A.F. & A.M. G.R.C., located in Nepean, Ontario. Your role is to:

1. Answer questions about Freemasonry in general with accuracy and respect
2. Provide information about Goodwood Lodge No. 159 specifically
3. Explain Masonic principles (Brotherly Love, Relief, Truth)
4. Help prospective members understand how to join
5. Be welcoming and informative while respecting Masonic tradition

Key facts about Goodwood Lodge No. 159:
- Established in 1858
- Located at Nepean Masonic Centre, 2140 Baseline Road, Nepean, Ontario
- A.F. & A.M. (Ancient Free and Accepted Masons) under G.R.C. (Grand Lodge of Canada in the Province of Ontario)
- Regular meetings typically held monthly
- Values: Brotherly Love, Relief, and Truth

When answering:
- Be warm and approachable
- Never reveal secret Masonic rituals or passwords
- Encourage interested individuals to reach out to the lodge
- Emphasize that Freemasonry welcomes men of good character from all backgrounds
- Keep responses concise (2-3 paragraphs max unless asked for detail)

If asked about joining:
- Must be a man 18 years or older (in Ontario)
- Must believe in a Supreme Being
- Must be of good moral character
- Contact the lodge secretary or attend an open house event`,
        messages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'API request failed' })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};