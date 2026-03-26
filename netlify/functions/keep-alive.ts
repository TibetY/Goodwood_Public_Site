import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler = schedule('0 * * * *', async () => {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from('officers').select('id').limit(1);

    if (error) {
        console.error('Supabase keep-alive ping failed:', error.message);
        return { statusCode: 500 };
    }

    console.log('Supabase keep-alive ping succeeded');
    return { statusCode: 200 };
});
