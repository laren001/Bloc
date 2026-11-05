import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /notifications/:userId — a user can only view their OWN notifications.
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  if (req.userId !== userId) {
    return res.status(403).json({ error: "You can't view another user's notifications" });
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(username, display_name, avatar_url), posts(image_url, thumbnail_url, media_type)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /notifications/read — the reader is always the verified caller.
router.patch('/read', async (req, res) => {
  const user_id = req.userId;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', user_id)
    .eq('read', false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;