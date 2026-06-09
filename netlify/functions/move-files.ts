import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event: HandlerEvent) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { moves } = body;

    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: moves (array of { from, to })' }) };
    }

    const results = [];
    for (const { from, to } of moves) {
      if (!from || !to) continue;
      const { error: moveError } = await supabaseAdmin.storage
        .from('photos')
        .move(from, to);

      if (moveError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Failed to move ${from}: ${moveError.message}` }),
        };
      }
      results.push({ from, to });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ moved: results }),
    };
  } catch (error: any) {
    console.error('Error in move-files function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
