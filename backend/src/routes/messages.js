import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /messages/:userId/:otherUserId — conversation between two users
// Note: mobile app should also subscribe to Supabase Realtime on the
// `messages` table directly for live updates — this endpoint is for
// loading conversation history.
router.get('/:userId/:otherUserId', async (req, res) => {
  const { userId, otherUserId } = req.params;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /messages — send a message
router.post('/', async (req, res) => {
  const { sender_id, recipient_id, content } = req.body;

  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id, recipient_id, content })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
