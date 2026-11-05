import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { requireAuth } from './middleware/auth.js';
import postsRouter from './routes/posts.js';
import storiesRouter from './routes/stories.js';
import messagesRouter from './routes/messages.js';
import usersRouter from './routes/users.js';
import notificationsRouter from './routes/notifications.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'Bloc API is running' }));

// Every route below verifies the caller's real identity from their
// Supabase session token — routes no longer trust a user_id sent in the
// request body.
app.use('/posts', requireAuth, postsRouter);
app.use('/messages', requireAuth, messagesRouter);
app.use('/users', requireAuth, usersRouter);
app.use('/notifications', requireAuth, notificationsRouter);

// NOT YET COVERED: stories.js and its mobile screens (StoriesBar,
// CreateStoryScreen, StoryViewer, HomeScreen) were never reviewed in this
// pass — wrapping this route without also updating those screens to send
// an auth header would break Stories outright. Left unauthenticated
// intentionally until that's done as its own follow-up.
app.use('/stories', storiesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Bloc API running on port ${PORT}`));