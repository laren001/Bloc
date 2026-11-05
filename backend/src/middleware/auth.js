import { supabase } from '../config/supabase.js';

// Verifies the Supabase access token sent by the mobile app and attaches
// the real, authenticated user id to the request. The mobile app already
// carries a session from supabase-js — this makes the backend actually
// check it instead of trusting whatever id the client claims to be.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.userId = data.user.id;
  next();
}