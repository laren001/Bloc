import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Service role key — backend only, never expose this to the mobile app.
// The mobile app uses the public anon key directly with Supabase's client SDK.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
