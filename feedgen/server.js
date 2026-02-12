/**
 * Minimal feed generator for Sunnyday curated feeds.
 * Implements describeFeedGenerator, getFeedSkeleton, and internal set-feed.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;
const DID = process.env.FEEDGEN_DID;
const SECRET = process.env.FEEDGEN_SECRET;

if (!DID) {
  console.error('Missing FEEDGEN_DID');
  process.exit(1);
}

// feed at-uri -> ordered list of post at-uris
const feedPosts = new Map();

function authInternal(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!SECRET || token !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// GET /xrpc/app.bsky.feed.describeFeedGenerator
app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (_req, res) => {
  const feeds = Array.from(feedPosts.keys()).map((uri) => ({ uri }));
  res.json({
    did: DID,
    feeds,
  });
});

// GET /xrpc/app.bsky.feed.getFeedSkeleton
app.get('/xrpc/app.bsky.feed.getFeedSkeleton', (req, res) => {
  const feed = req.query.feed;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const cursor = req.query.cursor || '0';

  if (!feed || typeof feed !== 'string') {
    res.status(400).json({ error: 'Missing feed', message: 'UnknownFeed' });
    return;
  }

  const postUris = feedPosts.get(feed);
  if (!postUris || postUris.length === 0) {
    res.json({ feed: [] });
    return;
  }

  const offset = Math.max(0, parseInt(cursor, 10) || 0);
  const slice = postUris.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  const nextCursor = nextOffset < postUris.length ? String(nextOffset) : undefined;

  res.json({
    feed: slice.map((post) => ({ post })),
    ...(nextCursor !== undefined && { cursor: nextCursor }),
  });
});

// POST /internal/set-feed — called by Sunnyday after publish
app.post('/internal/set-feed', authInternal, (req, res) => {
  const { feedUri, postUris } = req.body;
  if (!feedUri || !Array.isArray(postUris)) {
    res.status(400).json({ error: 'Missing feedUri or postUris' });
    return;
  }
  const uris = postUris.filter((u) => typeof u === 'string');
  feedPosts.set(feedUri, uris);
  res.json({ ok: true, count: uris.length });
});

// DELETE /internal/set-feed — remove feed (e.g. when feed is deleted on Bluesky)
app.delete('/internal/set-feed', authInternal, (req, res) => {
  const feedUri = req.query.feedUri || req.body?.feedUri;
  if (!feedUri) {
    res.status(400).json({ error: 'Missing feedUri' });
    return;
  }
  feedPosts.delete(feedUri);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Feed generator listening on port ${PORT}, DID=${DID}`);
});
