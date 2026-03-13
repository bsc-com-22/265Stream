// =============================================
// 265Stream - Supabase Client Configuration
// =============================================
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration. Check your .env file.');
    process.exit(1);
}

/**
 * Public Supabase client (uses anon key)
 * - Respects RLS policies
 * - Used for operations on behalf of authenticated users
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * Admin Supabase client (uses service role key)
 * - BYPASSES RLS policies
 * - Used for backend admin operations, user management, etc.
 * - NEVER expose this client or key to the frontend
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * Creates a Supabase client using a user's JWT token
 * This ensures RLS policies are enforced for the specific user
 */
export function createUserClient(accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export { supabaseUrl, supabaseAnonKey };
