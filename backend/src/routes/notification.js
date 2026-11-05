import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /notifications/:userId — recent notifications with actor profile
// info and the related post's thumbnail, where relevant.
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(username, display_name, avatar_url), posts(image_url, thumbnail_url, media_type)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /notifications/read — mark all of a user's notifications as read
router.patch('/read', async (req, res) => {
  const { user_id } = req.body;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', user_id)
    .eq('read', false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;