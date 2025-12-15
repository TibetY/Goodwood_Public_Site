import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
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

    // Get pagination parameters
    const page = parseInt(event.queryStringParameters?.page || '1');
    const perPage = parseInt(event.queryStringParameters?.perPage || '50');

    // List all users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      console.error('Error listing users:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Transform users data to include relevant information
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      display_name: u.user_metadata?.display_name || '',
      phone_number: u.user_metadata?.phone_number || '',
      email_confirmed_at: u.email_confirmed_at,
      invited_at: u.invited_at
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        users,
        total: data.users.length,
        page,
        perPage
      })
    };
  } catch (error: any) {
    console.error('Error in list-members function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
