import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /users/search?q=... - viewer is always the verified caller, so
// they are automatically excluded from their own search results.
router.get('/search', async (req, res) => {
  const { q } = req.query;
  const viewer_id = req.userId;
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

  const results = [...merged.values()].filter((p) => p.id !== viewer_id);

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
  const viewer_id = req.userId;

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

  const { data: followRow } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', viewer_id)
    .eq('following_id', id)
    .maybeSingle();

  res.json({
    ...profile,
    followers_count: followers_count ?? 0,
    following_count: following_count ?? 0,
    is_following_viewer_target: !!followRow,
  });
});

router.get('/:id/posts', async (req, res) => {
  const { id } = req.params;

  const [{ data: postsData, error: postsError }, { data: repostsData, error: repostsError }] = await Promise.all([
    supabase
      .from('posts')
      .select(`
        *,
        profiles!user_id(username, avatar_url),
        likes(count),
        comments(count),
        reposts(count),
        post_tags(profiles(id, username, avatar_url)),
        caption_mentions(profiles(id, username, avatar_url))
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reposts')
      .select(`
        id, created_at,
        profiles!user_id(id, username, avatar_url),
        posts!original_post_id(
          *,
          profiles!user_id(username, avatar_url),
          likes(count),
          comments(count),
          reposts(count),
          post_tags(profiles(id, username, avatar_url)),
          caption_mentions(profiles(id, username, avatar_url))
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (postsError) return res.status(500).json({ error: postsError.message });
  if (repostsError) return res.status(500).json({ error: repostsError.message });

  const buildEntry = (post) => {
    const { post_tags, caption_mentions, ...rest } = post;
    return {
      ...rest,
      tagged_users: (post_tags || []).map((t) => t.profiles).filter(Boolean),
      mentioned_users: (caption_mentions || []).map((m) => m.profiles).filter(Boolean),
      like_count: post.likes?.[0]?.count ?? 0,
      comment_count: post.comments?.[0]?.count ?? 0,
      repost_count: post.reposts?.[0]?.count ?? 0,
    };
  };

  const originalEntries = (postsData || []).map((post) => ({
    feed_key: `post:${post.id}`,
    sort_at: post.created_at,
    is_repost: false,
    ...buildEntry(post),
  }));

  const repostEntries = (repostsData || [])
    .filter((r) => r.posts)
    .map((r) => ({
      feed_key: `repost:${r.id}`,
      sort_at: r.created_at,
      is_repost: true,
      reposted_by: r.profiles,
      ...buildEntry(r.posts),
    }));

  const merged = [...originalEntries, ...repostEntries].sort(
    (a, b) => new Date(b.sort_at) - new Date(a.sort_at)
  );

  res.json(merged);
});

// POST /users/:id/avatar - a user can only replace their OWN avatar.
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;

  if (req.userId !== id) {
    return res.status(403).json({ error: "You can't update another user's avatar" });
  }
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
  const follower_id = req.userId;

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
  const follower_id = req.userId;

  const { error } = await supabase.from('follows').delete().match({ follower_id, following_id });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;