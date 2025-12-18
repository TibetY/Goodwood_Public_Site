import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
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

    // Parse request body
    const { committeeId } = JSON.parse(event.body || '{}');

    if (!committeeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Committee ID is required' })
      };
    }

    // Delete all members first (foreign key constraint)
    await supabaseAdmin
      .from('committee_members')
      .delete()
      .eq('committee_id', committeeId);

    // Delete the committee
    const { error: deleteError } = await supabaseAdmin
      .from('committees')
      .delete()
      .eq('id', committeeId);

    if (deleteError) {
      console.error('Error deleting committee:', deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: deleteError.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error: any) {
    console.error('Error in delete-committee function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
