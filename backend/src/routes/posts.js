import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
});

const POST_SELECT = `
  *,
  profiles!user_id(username, avatar_url),
  likes(count),
  comments(count),
  reposts(count),
  post_tags(profiles(id, username, avatar_url)),
  caption_mentions(profiles(id, username, avatar_url))
`;

function withFlatTags(post) {
  const { post_tags, caption_mentions, ...rest } = post;
  return {
    ...rest,
    tagged_users: (post_tags || []).map((t) => t.profiles).filter(Boolean),
    mentioned_users: (caption_mentions || []).map((m) => m.profiles).filter(Boolean),
  };
}

function withFlatCommentMentions(comment) {
  const { comment_mentions, ...rest } = comment;
  return {
    ...rest,
    mentioned_users: (comment_mentions || []).map((m) => m.profiles).filter(Boolean),
  };
}

async function resolveMentions(text) {
  const names = [...new Set((text || '').match(/@([a-zA-Z0-9]+)/g)?.map((m) => m.slice(1)) || [])];
  if (names.length === 0) return [];

  const results = await Promise.all(
    names.map((name) => supabase.from('profiles').select('id, username').ilike('username', name))
  );

  const merged = new Map();
  results.forEach((r) => (r.data || []).forEach((p) => merged.set(p.id, p)));
  return [...merged.values()];
}

// Shapes a raw post row (or a repost's nested original post) into the
// object the mobile app expects, folding in whether the viewer has
// liked/reposted it.
function buildPostEntry(post, likedPostIds, repostedPostIds) {
  return {
    ...withFlatTags(post),
    like_count: post.likes?.[0]?.count ?? 0,
    comment_count: post.comments?.[0]?.count ?? 0,
    repost_count: post.reposts?.[0]?.count ?? 0,
    liked_by_viewer: likedPostIds.has(post.id),
    reposted_by_viewer: repostedPostIds.has(post.id),
  };
}

// GET /posts — chronological feed, merging original posts and reposts
// into one timeline sorted by whichever action happened most recently
// (a repost's own created_at, not the original post's).
router.get('/', async (req, res) => {
  const { viewer_id } = req.query;

  const [{ data: postsData, error: postsError }, { data: repostsData, error: repostsError }] = await Promise.all([
    supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(50),
    supabase
      .from('reposts')
      .select(`id, created_at, profiles!user_id(id, username, avatar_url), posts!original_post_id(${POST_SELECT})`)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (postsError) return res.status(500).json({ error: postsError.message });
  if (repostsError) return res.status(500).json({ error: repostsError.message });

  let likedPostIds = new Set();
  let repostedPostIds = new Set();
  if (viewer_id) {
    const [{ data: viewerLikes }, { data: viewerReposts }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', viewer_id),
      supabase.from('reposts').select('original_post_id').eq('user_id', viewer_id),
    ]);
    likedPostIds = new Set((viewerLikes || []).map((l) => l.post_id));
    repostedPostIds = new Set((viewerReposts || []).map((r) => r.original_post_id));
  }

  const originalEntries = (postsData || []).map((post) => ({
    feed_key: `post:${post.id}`,
    sort_at: post.created_at,
    is_repost: false,
    ...buildPostEntry(post, likedPostIds, repostedPostIds),
  }));

  const repostEntries = (repostsData || [])
    .filter((r) => r.posts) // guards against a repost of a since-deleted post
    .map((r) => ({
      feed_key: `repost:${r.id}`,
      sort_at: r.created_at,
      is_repost: true,
      reposted_by: r.profiles,
      ...buildPostEntry(r.posts, likedPostIds, repostedPostIds),
    }));

  const merged = [...originalEntries, ...repostEntries]
    .sort((a, b) => new Date(b.sort_at) - new Date(a.sort_at))
    .slice(0, 50);

  res.json(merged);
});

// POST /posts — create a new post (photo or short video + caption)
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

    const mentionedProfiles = await resolveMentions(caption);
    const mentionedIds = mentionedProfiles.map((p) => p.id).filter((id) => id !== user_id);

    if (mentionedIds.length > 0) {
      const { error: mentionError } = await supabase
        .from('caption_mentions')
        .insert(mentionedIds.map((mentioned_user_id) => ({ post_id: post.id, mentioned_user_id })));
      if (mentionError) console.error('Failed to save caption mentions', mentionError);

      const { error: mentionNotifError } = await supabase
        .from('notifications')
        .insert(mentionedIds.map((recipient_id) => ({
          recipient_id,
          actor_id: user_id,
          type: 'mention',
          post_id: post.id,
        })));
      if (mentionNotifError) console.error('Failed to create caption mention notifications', mentionNotifError);
    }

    res.status(201).json({
      ...post,
      tagged_users: [],
      mentioned_users: mentionedProfiles.filter((p) => mentionedIds.includes(p.id)),
    });
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

// POST /posts/:id/repost — public repost to the reposter's own feed/profile.
// Reposting your own post is allowed but doesn't notify yourself.
router.post('/:id/repost', async (req, res) => {
  const { user_id } = req.body;
  const { id: original_post_id } = req.params;

  const { data, error } = await supabase
    .from('reposts')
    .insert({ user_id, original_post_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already reposted' });
    return res.status(500).json({ error: error.message });
  }

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', original_post_id).maybeSingle();
  if (post && post.user_id !== user_id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_id: post.user_id,
      actor_id: user_id,
      type: 'repost',
      post_id: original_post_id,
    });
    if (notifError) console.error('Failed to create repost notification', notifError);
  }

  res.status(201).json(data);
});

// DELETE /posts/:id/repost — undo a repost
router.delete('/:id/repost', async (req, res) => {
  const { user_id } = req.body;
  const { id: original_post_id } = req.params;

  const { error } = await supabase.from('reposts').delete().match({ user_id, original_post_id });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /posts/:id/comments
router.post('/:id/comments', async (req, res) => {
  const { user_id, content } = req.body;
  const { id: post_id } = req.params;

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ user_id, post_id, content })
    .select('*, profiles(username, avatar_url)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', post_id).maybeSingle();
  const mentionedProfiles = await resolveMentions(content);
  const mentionedIds = new Set(mentionedProfiles.map((p) => p.id));
  const preview = content.slice(0, 140);

  if (mentionedProfiles.length > 0) {
    const { error: mentionError } = await supabase
      .from('comment_mentions')
      .insert(mentionedProfiles.map((p) => ({ comment_id: comment.id, mentioned_user_id: p.id })));
    if (mentionError) console.error('Failed to save comment mentions', mentionError);
  }

  const notificationsToInsert = [];

  if (post && post.user_id !== user_id) {
    notificationsToInsert.push({
      recipient_id: post.user_id,
      actor_id: user_id,
      type: mentionedIds.has(post.user_id) ? 'mention' : 'comment',
      post_id,
      comment_preview: preview,
    });
  }

  for (const id of mentionedIds) {
    if (id === user_id) continue;
    if (post && id === post.user_id) continue;
    notificationsToInsert.push({
      recipient_id: id,
      actor_id: user_id,
      type: 'mention',
      post_id,
      comment_preview: preview,
    });
  }

  if (notificationsToInsert.length > 0) {
    const { error: notifError } = await supabase.from('notifications').insert(notificationsToInsert);
    if (notifError) console.error('Failed to create comment/mention notifications', notifError);
  }

  res.status(201).json({ ...comment, mentioned_users: mentionedProfiles });
});

// GET /posts/:id/comments
router.get('/:id/comments', async (req, res) => {
  const { id: post_id } = req.params;

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, avatar_url), comment_mentions(profiles(id, username, avatar_url))')
    .eq('post_id', post_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(withFlatCommentMentions));
});

export default router;