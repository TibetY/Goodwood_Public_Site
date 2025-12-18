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

    // Parse request body
    const { id, committee_id, name, position } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!committee_id || !name || position === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Committee ID, name, and position are required' })
      };
    }

    // Upsert member
    const memberData = {
      committee_id: parseInt(committee_id),
      name,
      position: parseInt(position)
    };

    let result;
    if (id) {
      // Update existing member
      result = await supabaseAdmin
        .from('committee_members')
        .update(memberData)
        .eq('id', id)
        .select()
        .single();
    } else {
      // Insert new member
      result = await supabaseAdmin
        .from('committee_members')
        .insert(memberData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error upserting committee member:', result.error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: result.error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        member: result.data
      })
    };
  } catch (error: any) {
    console.error('Error in upsert-committee-member function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
