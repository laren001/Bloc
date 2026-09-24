import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB cap, same as posts
});

function previewText(msg) {
  if (msg.content) return msg.content;
  if (msg.media_type === 'video') return '🎥 Video';
  if (msg.media_type === 'photo') return '📷 Photo';
  return '';
}

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
        last_message: previewText(msg),
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

// POST /messages - send a message. Accepts either a JSON body (text-only,
// unchanged from before) or multipart form data with a "media" file
// (photo or video, with optional accompanying text in "content").
router.post('/', upload.single('media'), async (req, res) => {
  const { sender_id, recipient_id, content } = req.body;

  if (!sender_id || !recipient_id) {
    return res.status(400).json({ error: 'sender_id and recipient_id are required' });
  }
  if (!content && !req.file) {
    return res.status(400).json({ error: 'A message needs text or media' });
  }

  let media_url = null;
  let media_type = null;
  let thumbnail_url = null;

  if (req.file) {
    const isVideo = req.file.mimetype.startsWith('video/');
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'bloc/dm_media', resource_type: isVideo ? 'video' : 'image' },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      media_url = uploadResult.secure_url;
      media_type = isVideo ? 'video' : 'photo';
      thumbnail_url = isVideo
        ? cloudinary.url(uploadResult.public_id, { resource_type: 'video', format: 'jpg' })
        : null;
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id,
      recipient_id,
      content: content || null,
      media_url,
      media_type,
      thumbnail_url,
    })
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