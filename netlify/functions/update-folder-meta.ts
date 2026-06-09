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
    const { folderPath, metadata } = body;

    if (!folderPath || typeof folderPath !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: folderPath' }) };
    }

    if (!metadata || typeof metadata !== 'object') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: metadata' }) };
    }

    const metaContent = JSON.stringify(metadata, null, 2);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('photos')
      .upload(`${folderPath}/.folder-meta.json`,
        new TextEncoder().encode(metaContent), {
          contentType: 'application/json',
          upsert: true,
        });

    if (uploadError) {
      console.error('Update metadata error:', uploadError);
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ path: folderPath, metadata }),
    };
  } catch (error: any) {
    console.error('Error in update-folder-meta function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
