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
    const { folderPath } = body;

    if (!folderPath || typeof folderPath !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: folderPath' }) };
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('photos')
      .upload(`${folderPath}/.emptyFolderPlaceholder`, new Uint8Array(0), {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Create folder error:', uploadError);
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ path: folderPath }),
    };
  } catch (error: any) {
    console.error('Error in create-folder function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
