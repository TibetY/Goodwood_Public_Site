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
    // Verify authentication
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
    const { paths } = body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: paths (array of file paths)' }) };
    }

    const { data, error: deleteError } = await supabaseAdmin.storage
      .from('photos')
      .remove(paths);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return { statusCode: 500, body: JSON.stringify({ error: deleteError.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ deleted: data }),
    };
  } catch (error: any) {
    console.error('Error in delete-photo function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
