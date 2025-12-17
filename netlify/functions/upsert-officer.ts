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
        const { id, title, name, image, position } = JSON.parse(event.body || '{}');

        // Validate required fields
        if (!title || position === undefined) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Title and position are required' })
            };
        }

        // Upsert officer
        const officerData = {
            title,
            name: name || 'TBA',
            image: image || null,
            position: parseInt(position)
        };

        let result;
        if (id) {
            // Update existing officer
            result = await supabaseAdmin
                .from('officers')
                .update(officerData)
                .eq('id', id)
                .select()
                .single();
        } else {
            // Insert new officer
            result = await supabaseAdmin
                .from('officers')
                .insert(officerData)
                .select()
                .single();
        }

        if (result.error) {
            console.error('Error upserting officer:', result.error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: result.error.message })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                officer: result.data
            })
        };
    } catch (error: any) {
        console.error('Error in upsert-officer function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};