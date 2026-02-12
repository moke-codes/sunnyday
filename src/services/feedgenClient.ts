/**
 * Client for the Sunnyday feed generator backend. Pushes feed contents after publish
 * and removes them when a feed is deleted.
 */

const baseUrl = import.meta.env.VITE_FEEDGEN_URL ?? '';
const secret = import.meta.env.VITE_FEEDGEN_SECRET ?? '';

export function isFeedgenConfigured(): boolean {
  return Boolean(baseUrl && secret);
}

export async function pushFeedContents(
  feedUri: string,
  postUris: string[],
): Promise<void> {
  if (!baseUrl || !secret) {
    throw new Error(
      'Feed generator URL and secret are required to publish feed contents. Set VITE_FEEDGEN_URL and VITE_FEEDGEN_SECRET in .env.',
    );
  }
  const url = `${baseUrl.replace(/\/$/, '')}/internal/set-feed`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ feedUri, postUris }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Feed generator returned ${response.status}: ${text || response.statusText}`,
    );
  }
}

export async function removeFeedContents(feedUri: string): Promise<void> {
  if (!baseUrl || !secret) return;
  const url = `${baseUrl.replace(/\/$/, '')}/internal/set-feed?feedUri=${encodeURIComponent(feedUri)}`;
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secret}` },
    });
  } catch {
    // Best effort; feed is already deleted on Bluesky
  }
}
