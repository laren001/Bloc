import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /posts — chronological feed
// Optional ?viewer_id=... to include whether the requesting user has liked each post.
router.get('/', async (req, res) => {
const { viewer_id } = req.query;

const { data, error } = await supabase
.from('posts')
.select('*, profiles!user_id(username, avatar_url), likes(count), comments(count)')
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
...post,
like_count: post.likes?.[0]?.count ?? 0,
comment_count: post.comments?.[0]?.count ?? 0,
liked_by_viewer: likedPostIds.has(post.id),
}));

res.json(posts);
});

// POST /posts — create a new post (photo upload + caption)
router.post('/', upload.single('image'), async (req, res) => {
const { user_id, caption, location } = req.body;

if (!req.file) return res.status(400).json({ error: 'Image is required' });

try {
const uploadResult = await new Promise((resolve, reject) => {
const stream = cloudinary.uploader.upload_stream(
{ folder: 'bloc/posts' },
(error, result) => (error ? reject(error) : resolve(result))
);
stream.end(req.file.buffer);
});

const { data, error } = await supabase
  .from('posts')
  .insert({ user_id, image_url: uploadResult.secure_url, caption, location })
  .select()
  .single();

if (error) return res.status(500).json({ error: error.message });
res.status(201).json(data);

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