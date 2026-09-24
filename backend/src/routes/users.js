import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /users/search?q=...&viewer_id=... — used by the post-tagging picker
// (and eventually a real Search tab). Must be declared before /:id below,
// or Express would treat "search" as an :id.
router.get('/search', async (req, res) => {
  const { q, viewer_id } = req.query;
  if (!q || !q.trim()) return res.json([]);

  const term = q.trim();
  const pattern = `%${term}%`;

  const [{ data: byUsername, error: usernameError }, { data: byDisplayName, error: displayNameError }] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_url').ilike('username', pattern).limit(20),
    supabase.from('profiles').select('id, username, display_name, avatar_url').ilike('display_name', pattern).limit(20),
  ]);

  if (usernameError) return res.status(500).json({ error: usernameError.message });
  if (displayNameError) return res.status(500).json({ error: displayNameError.message });

  const merged = new Map();
  [...(byUsername || []), ...(byDisplayName || [])].forEach((p) => merged.set(p.id, p));

  let results = [...merged.values()];
  if (viewer_id) results = results.filter((p) => p.id !== viewer_id);

  // Usernames that start with the search term rank above ones that just
  // contain it somewhere in the middle.
  const lowerTerm = term.toLowerCase();
  results.sort((a, b) => {
    const aStarts = a.username?.toLowerCase().startsWith(lowerTerm) ? 0 : 1;
    const bStarts = b.username?.toLowerCase().startsWith(lowerTerm) ? 0 : 1;
    return aStarts - bStarts;
  });

  res.json(results.slice(0, 20));
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { viewer_id } = req.query;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!profile) return res.status(404).json({ error: 'User not found' });

  const [{ count: followers_count }, { count: following_count }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
  ]);

  let is_following_viewer_target = false;
  if (viewer_id) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', viewer_id)
      .eq('following_id', id)
      .maybeSingle();
    is_following_viewer_target = !!followRow;
  }

  res.json({
    ...profile,
    followers_count: followers_count ?? 0,
    following_count: following_count ?? 0,
    is_following_viewer_target,
  });
});

router.get('/:id/posts', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, avatar_url), likes(count), comments(count)')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const posts = data.map((post) => ({
    ...post,
    like_count: post.likes?.[0]?.count ?? 0,
    comment_count: post.comments?.[0]?.count ?? 0,
  }));

  res.json(posts);
});

// POST /users/:id/avatar — upload or replace a profile avatar image.
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) return res.status(400).json({ error: 'Avatar image is required' });

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'bloc/avatars' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: uploadResult.secure_url })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/follow', async (req, res) => {
  const { id: following_id } = req.params;
  const { follower_id } = req.body;

  if (!follower_id) return res.status(400).json({ error: 'follower_id is required' });
  if (follower_id === following_id) return res.status(400).json({ error: "Can't follow yourself" });

  const { error } = await supabase.from('follows').insert({ follower_id, following_id });
  if (error) return res.status(500).json({ error: error.message });

  const { error: notifError } = await supabase.from('notifications').insert({
    recipient_id: following_id,
    actor_id: follower_id,
    type: 'follow',
  });
  if (notifError) console.error('Failed to create follow notification', notifError);

  res.status(201).json({ success: true });
});

router.delete('/:id/follow', async (req, res) => {
  const { id: following_id } = req.params;
  const { follower_id } = req.body;

  if (!follower_id) return res.status(400).json({ error: 'follower_id is required' });

  const { error } = await supabase.from('follows').delete().match({ follower_id, following_id });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;