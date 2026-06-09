import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event: HandlerEvent) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (event.httpMethod !== 'GET') {
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

    const path = event.queryStringParameters?.path || '';
    const includeAll = event.queryStringParameters?.includeAll === 'true';

    const { data, error: listError } = await supabaseAdmin.storage
      .from('photos')
      .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      return { statusCode: 500, body: JSON.stringify({ error: listError.message }) };
    }

    const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
    const rawItems = (data || []).filter((item) => {
      if (includeAll) return true;
      if (item.name === '.emptyFolderPlaceholder') return false;
      if (item.name === '.folder-meta.json') return false;
      return item.id === null || IMAGE_EXTENSIONS.test(item.name);
    });

    const items = await Promise.all(
      rawItems.map(async (item) => {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        const isFolder = item.id === null;

        let metadata: Record<string, any> | undefined;
        if (isFolder) {
          try {
            const { data: metaFile } = await supabaseAdmin.storage
              .from('photos')
              .download(`${fullPath}/.folder-meta.json`);
            if (metaFile) {
              metadata = JSON.parse(await metaFile.text());
            }
          } catch {
            // no metadata file
          }
        }

        return {
          name: item.name,
          id: item.id,
          isFolder,
          path: fullPath,
          updatedAt: item.updated_at,
          ...(metadata ? { metadata } : {}),
        };
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ items }),
    };
  } catch (error: any) {
    console.error('Error in list-folder function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
