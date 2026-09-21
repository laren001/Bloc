import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import postsRouter from './routes/posts.js';
import storiesRouter from './routes/stories.js';
import messagesRouter from './routes/messages.js';
import usersRouter from './routes/users.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'Bloc API is running' }));

app.use('/posts', postsRouter);
app.use('/stories', storiesRouter);
app.use('/messages', messagesRouter);
app.use('/users', usersRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Bloc API running on port ${PORT}`));
