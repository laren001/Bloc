import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /stories — active stories only (not expired), grouped by user on the client
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('stories')
    .select('*, profiles(username, avatar_url)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /stories — create a new story
// Users can post multiple stories within the same 24hr window — each is its own
// row with its own expires_at, so earlier ones don't get overwritten or blocked.
router.post('/', upload.single('image'), async (req, res) => {
  const { user_id, location, event_tag } = req.body;

  if (!req.file) return res.status(400).json({ error: 'Image is required' });

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'bloc/stories' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const { data, error } = await supabase
      .from('stories')
      .insert({ user_id, image_url: uploadResult.secure_url, location, event_tag })
      .select('*, profiles(username, avatar_url)')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
