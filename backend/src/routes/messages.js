import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /messages/:userId - inbox: one row per conversation partner, with
// their profile, the most recent message, and how many are unread.
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  const { data: allMessages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const conversations = new Map();
  for (const msg of allMessages) {
    const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
    if (!conversations.has(otherId)) {
      conversations.set(otherId, {
        other_user_id: otherId,
        last_message: msg.content,
        last_message_at: msg.created_at,
        unread_count: 0,
      });
    }
    if (msg.recipient_id === userId && !msg.read) {
      conversations.get(otherId).unread_count += 1;
    }
  }

  const otherIds = [...conversations.keys()];
  if (otherIds.length === 0) return res.json([]);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', otherIds);

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const result = otherIds
    .map((id) => ({
      ...conversations.get(id),
      profile: profileMap.get(id) ?? null,
    }))
    .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

  res.json(result);
});

// GET /messages/:userId/:otherUserId - conversation between two users
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

// POST /messages - send a message
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

// PATCH /messages/read - mark all messages from other_user_id to user_id as read.
router.patch('/read', async (req, res) => {
  const { user_id, other_user_id } = req.body;

  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('recipient_id', user_id)
    .eq('sender_id', other_user_id)
    .eq('read', false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;