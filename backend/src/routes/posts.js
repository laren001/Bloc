import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
});

const MENTION_REGEX = /@([a-zA-Z0-9_.]+)/g;

// Flattens Supabase's nested post_tags(profiles(...)) shape into a plain
// array of tagged profile objects on each post.
function withFlatTags(post) {
  const { post_tags, ...rest } = post;
  return {
    ...rest,
    tagged_users: (post_tags || []).map((t) => t.profiles).filter(Boolean),
  };
}

// Pulls @handles out of caption text and returns only the ones that match
// real usernames, as { id, username } pairs. Non-matching @words (typos,
// made-up handles) are silently ignored — they stay as plain text in the
// caption and never reach the notifications table.
async function resolveMentions(caption, authorId) {
  if (!caption) return [];

  const handles = [...new Set(
    [...caption.matchAll(MENTION_REGEX)].map((m) => m[1].toLowerCase())
  )];
  if (handles.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', handles);

  if (error) {
    console.error('Failed to resolve mentions', error);
    return [];
  }

  // Exclude self-mentions — no point notifying someone they mentioned themselves.
  return (data || []).filter((p) => p.id !== authorId);
}

// GET /posts — chronological feed
router.get('/', async (req, res) => {
  const { viewer_id } = req.query;

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, avatar_url), likes(count), comments(count), post_tags(profiles(id, username, avatar_url))')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  let likedPostIds = new Set();
  if (viewer_id) {
    const { data: viewerLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', viewer_id);
    likedPostIds = new Set((viewerLikes || []).map((l) => l.post_id));
  }

  const posts = data.map((post) => ({
    ...withFlatTags(post),
    like_count: post.likes?.[0]?.count ?? 0,
    comment_count: post.comments?.[0]?.count ?? 0,
    liked_by_viewer: likedPostIds.has(post.id),
  }));

  res.json(posts);
});

// POST /posts — create a new post (photo or short video + caption).
// tagged_user_ids arrives as a JSON-stringified array of profile IDs
// (multipart form fields are always strings, so the client stringifies
// the array before sending and we parse it back out here).
router.post('/', upload.single('image'), async (req, res) => {
  const { user_id, caption, location, tagged_user_ids } = req.body;

  if (!req.file) return res.status(400).json({ error: 'A photo or video is required' });

  const isVideo = req.file.mimetype.startsWith('video/');

  let taggedIds = [];
  if (tagged_user_ids) {
    try {
      const parsed = JSON.parse(tagged_user_ids);
      if (Array.isArray(parsed)) {
        taggedIds = [...new Set(parsed)].filter((id) => id && id !== user_id);
      }
    } catch (err) {
      console.error('Failed to parse tagged_user_ids', err);
    }
  }

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'bloc/posts', resource_type: isVideo ? 'video' : 'image' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const thumbnail_url = isVideo
      ? cloudinary.url(uploadResult.public_id, { resource_type: 'video', format: 'jpg' })
      : null;

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id,
        image_url: uploadResult.secure_url,
        media_type: isVideo ? 'video' : 'photo',
        thumbnail_url,
        caption,
        location,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (taggedIds.length > 0) {
      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(taggedIds.map((tagged_user_id) => ({ post_id: post.id, tagged_user_id })));
      if (tagError) console.error('Failed to save post tags', tagError);

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(taggedIds.map((recipient_id) => ({
          recipient_id,
          actor_id: user_id,
          type: 'tag',
          post_id: post.id,
        })));
      if (notifError) console.error('Failed to create tag notifications', notifError);
    }

    // Mentions are parsed from caption text and notified separately from
    // tags. A user can be both tagged AND mentioned on the same post (e.g.
    // tagged via the picker, and also referenced by name in the caption) —
    // that's intentional, they're different actions, so no de-duping against
    // taggedIds here.
    const mentioned = await resolveMentions(caption, user_id);
    if (mentioned.length > 0) {
      const { error: mentionNotifError } = await supabase
        .from('notifications')
        .insert(mentioned.map(({ id: recipient_id }) => ({
          recipient_id,
          actor_id: user_id,
          type: 'mention',
          post_id: post.id,
        })));
      if (mentionNotifError) console.error('Failed to create mention notifications', mentionNotifError);
    }

    res.status(201).json({ ...post, tagged_users: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /posts/:id/like
router.post('/:id/like', async (req, res) => {
  const { user_id } = req.body;
  const { id: post_id } = req.params;

  const { error } = await supabase.from('likes').insert({ user_id, post_id });
  if (error) return res.status(500).json({ error: error.message });

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', post_id).maybeSingle();
  if (post && post.user_id !== user_id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_id: post.user_id,
      actor_id: user_id,
      type: 'like',
      post_id,
    });
    if (notifError) console.error('Failed to create like notification', notifError);
  }

  res.status(201).json({ success: true });
});

// DELETE /posts/:id/like
router.delete('/:id/like', async (req, res) => {
  const { user_id } = req.body;
  const { id: post_id } = req.params;

  const { error } = await supabase.from('likes').delete().match({ user_id, post_id });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /posts/:id/comments
router.post('/:id/comments', async (req, res) => {
  const { user_id, content } = req.body;
  const { id: post_id } = req.params;

  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id, post_id, content })
    .select('*, profiles(username, avatar_url)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', post_id).maybeSingle();
  if (post && post.user_id !== user_id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_id: post.user_id,
      actor_id: user_id,
      type: 'comment',
      post_id,
      comment_preview: content.slice(0, 140),
    });
    if (notifError) console.error('Failed to create comment notification', notifError);
  }

  res.status(201).json(data);
});

// GET /posts/:id/comments
router.get('/:id/comments', async (req, res) => {
  const { id: post_id } = req.params;

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, avatar_url)')
    .eq('post_id', post_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;