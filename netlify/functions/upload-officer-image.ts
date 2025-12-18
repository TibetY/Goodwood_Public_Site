import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handler: Handler = async (event: HandlerEvent) => {
  // Initialize Supabase client inside handler to access runtime env vars
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify user is authenticated
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Parse the multipart form data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Content-Type must be application/json' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { fileName, fileData, fileType, officerName } = body;

    if (!fileName || !fileData || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: fileName, fileData, fileType' })
      };
    }

    // Validate file type
    if (!fileType.startsWith('image/')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File must be an image' })
      };
    }

    // Convert base64 to buffer
    const base64Data = fileData.split(',')[1] || fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File size exceeds 5MB limit' })
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop();

    const sanitizedName = officerName
      ? officerName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '_')          // Replace spaces with underscores
        .replace(/-+/g, '_')           // Replace hyphens with underscores
        .replace(/_+/g, '_')           // Replace multiple underscores with single
        .trim()
      : 'officer';

    const uniqueFileName = `${sanitizedName}_${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('officer-images')
      .upload(uniqueFileName, buffer, {
        contentType: fileType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: uploadError.message })
      };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('officer-images')
      .getPublicUrl(uniqueFileName);

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: urlData.publicUrl,
        path: uploadData.path
      })
    };
  } catch (error: any) {
    console.error('Error in upload-officer-image function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
