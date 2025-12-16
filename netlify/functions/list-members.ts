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
    const offset = (page - 1) * perPage;

    // Fetch profiles with pagination
    const { data: profiles, error: profilesError, count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('display_name')
      .range(offset, offset + perPage - 1);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: profilesError.message })
      };
    }

    // Fetch auth users data to get email and last sign in
    const { data: authData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();

    if (authListError) {
      console.error('Error listing auth users:', authListError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: authListError.message })
      };
    }

    // Merge profile data with auth data
    const members = profiles.map(profile => {
      const authUser = authData.users.find(u => u.id === profile.id);
      return {
        id: profile.id,
        email: authUser?.email || '',
        display_name: profile.display_name || '',
        phone_number: profile.phone_number || '',
        title: profile.title || '',
        position: profile.position || '',
        dues_paid: profile.dues_paid || false,
        dues_paid_date: profile.dues_paid_date || null,
        member_number: profile.member_number || '',
        join_date: profile.join_date || null,
        created_at: profile.created_at,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        email_confirmed_at: authUser?.email_confirmed_at || null
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        members,
        total: count || 0,
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