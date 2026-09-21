import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

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

router.post('/:id/follow', async (req, res) => {
  const { id: following_id } = req.params;
  const { follower_id } = req.body;

  if (!follower_id) return res.status(400).json({ error: 'follower_id is required' });
  if (follower_id === following_id) return res.status(400).json({ error: "Can't follow yourself" });

  const { error } = await supabase.from('follows').insert({ follower_id, following_id });
  if (error) return res.status(500).json({ error: error.message });
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
