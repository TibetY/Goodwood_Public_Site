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

        // Fetch all officers
        const { data: officers, error: officersError } = await supabaseAdmin
            .from('officers')
            .select('*')
            .order('position', { ascending: true });

        if (officersError) {
            console.error('Error fetching officers:', officersError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: officersError.message })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                officers: officers || []
            })
        };
    } catch (error: any) {
        console.error('Error in list-officers function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};