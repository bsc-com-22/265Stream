import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('artist_profiles')
        .select(`
            id, artist_name, genre, bio, verified, follower_count,
            user:profiles!artist_profiles_user_id_fkey(avatar_url)
        `)
        .eq('status', 'approved')
        .order('follower_count', { ascending: false });

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Success:', data);
    }
}
run();
