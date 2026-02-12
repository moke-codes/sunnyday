/**
 * Minimal feed generator for Sunnyday curated feeds.
 * Implements describeFeedGenerator, getFeedSkeleton, and internal set-feed.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;
const DID = process.env.FEEDGEN_DID;
const SECRET = process.env.FEEDGEN_SECRET;
const DATA_DIR = process.env.FEEDGEN_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'feed-posts.json');

if (!DID) {
  console.error('Missing FEEDGEN_DID');
  process.exit(1);
}

function normalizeFeedUri(uri) {
  if (typeof uri !== 'string') return '';
  return uri.trim();
}

// feed at-uri -> ordered list of post at-uris (persisted to disk)
let feedPosts = new Map();

function loadPersisted() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const obj = JSON.parse(raw);
      feedPosts = new Map(Object.entries(obj).map(([k, v]) => [normalizeFeedUri(k), Array.isArray(v) ? v : []]));
      console.log(`Loaded ${feedPosts.size} feed(s) from ${DATA_FILE}`);
    }
  } catch (err) {
    console.warn('Could not load persisted feeds:', err.message);
  }
}

function savePersisted() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj = Object.fromEntries(feedPosts);
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 0), 'utf8');
  } catch (err) {
    console.error('Could not save feeds:', err.message);
  }
}

loadPersisted();

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
  const feed = normalizeFeedUri(req.query.feed);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const cursor = req.query.cursor || '0';

  if (!feed) {
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
  const key = normalizeFeedUri(feedUri);
  const uris = postUris.filter((u) => typeof u === 'string');
  feedPosts.set(key, uris);
  savePersisted();
  res.json({ ok: true, count: uris.length });
});

// DELETE /internal/set-feed — remove feed (e.g. when feed is deleted on Bluesky)
app.delete('/internal/set-feed', authInternal, (req, res) => {
  const feedUri = req.query.feedUri || req.body?.feedUri;
  if (!feedUri) {
    res.status(400).json({ error: 'Missing feedUri' });
    return;
  }
  feedPosts.delete(normalizeFeedUri(feedUri));
  savePersisted();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Feed generator listening on port ${PORT}, DID=${DID}`);
});
