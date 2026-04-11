import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Content-Type must be application/json' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { fileName, fileData, fileType, folderPath } = body;

    if (!fileName || !fileData || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: fileName, fileData, fileType' }),
      };
    }

    if (!fileType.startsWith('image/')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'File must be an image' }) };
    }

    // Convert base64 to buffer
    const base64Data = fileData.split(',')[1] || fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_FILE_SIZE) {
      return { statusCode: 400, body: JSON.stringify({ error: 'File size exceeds 10MB limit' }) };
    }

    // Build the storage path: folderPath/filename
    const storagePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('photos')
      .upload(storagePath, buffer, {
        contentType: fileType,
        cacheControl: '86400',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('photos')
      .getPublicUrl(storagePath);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: urlData.publicUrl, path: uploadData.path }),
    };
  } catch (error: any) {
    console.error('Error in upload-photo function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
