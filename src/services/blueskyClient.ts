import { BskyAgent } from '@atproto/api';
import type {
  ActorSearchResult,
  BskyList,
  CuratedPostMedia,
  CuratedPostSearchPage,
  ListMember,
  OperationResult,
  StarterPack,
  UserIdentity,
} from '@/types/bluesky';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface PublishFeedGeneratorPayload {
  feedId: string;
  displayName: string;
  description?: string;
  iconDataUrl?: string;
}

const service = 'https://bsky.social';
const listPurpose = 'app.bsky.graph.defs#curatelist';

class BlueskyClient {
  private agent: BskyAgent;

  constructor() {
    this.agent = new BskyAgent({ service });
  }

  get session() {
    return this.agent.session;
  }

  get isAuthenticated() {
    return Boolean(this.agent.session?.did);
  }

  async login(payload: LoginPayload) {
    const response = await this.agent.login(payload);
    return response.data;
  }

  async resumeSession(session: any) {
    await this.agent.resumeSession(session);
  }

  async logout() {
    await this.agent.logout();
  }

  async getViewerProfile(): Promise<UserIdentity> {
    const actor = this.requireDid();
    const response = await this.agent.getProfile({ actor });
    return {
      did: response.data.did,
      handle: response.data.handle,
      displayName: response.data.displayName,
      avatar: response.data.avatar,
    };
  }

  async getViewerLists(): Promise<BskyList[]> {
    const actor = this.requireDid();
    const api: any = this.agent.api;
    const response = await api.app.bsky.graph.getLists({ actor, limit: 100 });
    const lists = response.data?.lists ?? [];
    return lists.map((list: any) => ({
      uri: list.uri,
      cid: list.cid,
      name: list.name,
      description: list.description,
      purpose: list.purpose,
    }));
  }

  async getListMembers(listUri: string): Promise<ListMember[]> {
    const api: any = this.agent.api;
    let cursor: string | undefined;
    const members: ListMember[] = [];

    do {
      const response = await api.app.bsky.graph.getList({ list: listUri, cursor, limit: 100 });
      for (const item of response.data?.items ?? []) {
        const subject = item.subject;
        if (!subject?.did || !subject?.handle) continue;
        members.push({
          did: subject.did,
          handle: subject.handle,
          displayName: subject.displayName,
          avatar: subject.avatar,
        });
      }
      cursor = response.data?.cursor;
    } while (cursor);

    return dedupeMembers(members);
  }

  async createList(input: { name: string; description?: string; private?: boolean }) {
    const api: any = this.agent.api;
    const repo = this.requireDid();
    const response = await api.com.atproto.repo.createRecord({
      repo,
      collection: 'app.bsky.graph.list',
      record: {
        name: input.name,
        description: input.description,
        purpose: listPurpose,
        createdAt: new Date().toISOString(),
      },
    });
    return response.data.uri;
  }

  async addMembersToList(listUri: string, members: ListMember[]): Promise<OperationResult> {
    const api: any = this.agent.api;
    const repo = this.requireDid();
    const seen = new Set<string>();
    let added = 0;
    let skipped = 0;
    const unresolved: string[] = [];

    for (const member of members) {
      if (!member.did) {
        unresolved.push(member.handle || 'unknown');
        continue;
      }
      if (seen.has(member.did)) {
        skipped += 1;
        continue;
      }
      seen.add(member.did);
      try {
        await api.com.atproto.repo.createRecord({
          repo,
          collection: 'app.bsky.graph.listitem',
          record: {
            list: listUri,
            subject: member.did,
            createdAt: new Date().toISOString(),
          },
        });
        added += 1;
      } catch {
        skipped += 1;
      }
    }

    return { added, skipped, unresolved };
  }

  async createStarterPackFromMembers(input: {
    name: string;
    description?: string;
    members: ListMember[];
  }): Promise<{ starterPackUri: string; listUri: string; result: OperationResult }> {
    const api: any = this.agent.api;
    const repo = this.requireDid();

    const listUri = await this.createList({ name: `${input.name} (source)` });
    const result = await this.addMembersToList(listUri, input.members);

    const response = await api.com.atproto.repo.createRecord({
      repo,
      collection: 'app.bsky.graph.starterpack',
      record: {
        name: input.name,
        description: input.description,
        list: listUri,
        createdAt: new Date().toISOString(),
      },
    });

    return {
      starterPackUri: response.data.uri,
      listUri,
      result,
    };
  }

  async getViewerStarterPacks(): Promise<StarterPack[]> {
    const actor = this.requireDid();
    return this.getStarterPacksByActor(actor);
  }

  async searchActors(query: string): Promise<ActorSearchResult[]> {
    const api: any = this.agent.api;
    const term = query.trim();
    if (!term) return [];
    const response = await api.app.bsky.actor.searchActorsTypeahead({
      term,
      limit: 10,
    });
    return (response.data?.actors ?? []).map((actor: any) => ({
      did: actor.did,
      handle: actor.handle,
      displayName: actor.displayName,
      avatar: actor.avatar,
    }));
  }

  async getStarterPacksByActor(actor: string): Promise<StarterPack[]> {
    const api: any = this.agent.api;
    const did = await this.resolveActorDid(actor);
    const response = await api.app.bsky.graph.getActorStarterPacks({ actor: did, limit: 100 });
    return (response.data?.starterPacks ?? []).map((pack: any) => ({
      uri: pack.uri,
      cid: pack.cid,
      name: pack.record?.name ?? 'Untitled Starter Pack',
      description: pack.record?.description,
      listUri: pack.record?.list,
    }));
  }

  async getStarterPackMembers(starterPack: StarterPack): Promise<ListMember[]> {
    if (!starterPack.listUri) return [];
    return this.getListMembers(starterPack.listUri);
  }

  async getStarterPackByReference(reference: string): Promise<StarterPack> {
    const api: any = this.agent.api;
    const trimmed = reference.trim();
    if (!trimmed) {
      throw new Error('Starter pack link is empty.');
    }

    const parsed = await this.parseStarterPackReference(trimmed);
    const did = await this.resolveActorDid(parsed.actor);
    const response = await api.com.atproto.repo.getRecord({
      repo: did,
      collection: 'app.bsky.graph.starterpack',
      rkey: parsed.rkey,
    });

    const record = response.data?.value;
    const listUri = record?.list;
    if (!listUri) {
      throw new Error('Starter pack does not include a list.');
    }

    return {
      uri: response.data?.uri ?? `at://${did}/app.bsky.graph.starterpack/${parsed.rkey}`,
      cid: response.data?.cid,
      name: record?.name ?? 'Starter Pack',
      description: record?.description,
      listUri,
    };
  }

  async searchPosts(query: string, author?: string, cursor?: string): Promise<CuratedPostSearchPage> {
    const api: any = this.agent.api;
    const finalQuery = author ? `from:${author} ${query}`.trim() : query.trim();
    if (!finalQuery) {
      return { posts: [], cursor: null };
    }
    const response = await api.app.bsky.feed.searchPosts({
      q: finalQuery,
      limit: 50,
      sort: 'latest',
      cursor,
    });
    const rawEntries: any[] = response.data?.posts ?? [];
    const rawPosts: any[] = rawEntries.map((entry) => unwrapSearchEntryPost(entry)).filter(Boolean);
    const hydratedByUri = await this.hydratePostsByUri(rawPosts.map((post) => post.uri).filter(Boolean));
    const profileByActor = await this.hydrateProfilesByActor(
      rawPosts.flatMap((post) => {
        const hydrated = hydratedByUri.get(post?.uri) ?? post;
        const actors = [
          post?.author?.did,
          post?.author?.handle,
          hydrated?.author?.did,
          hydrated?.author?.handle,
          extractDidFromAtUri(post?.uri),
          extractDidFromAtUri(hydrated?.uri),
        ];
        return actors.filter((value): value is string => typeof value === 'string' && value.length > 0);
      }),
    );

    const normalizedPosts = rawPosts.map((rawPost: any) => {
      const post = hydratedByUri.get(rawPost.uri) ?? rawPost;
      return normalizePostView(rawPost, post, profileByActor);
    });

    return {
      posts: normalizedPosts,
      cursor: response.data?.cursor ?? null,
    };
  }

  private async hydratePostsByUri(uris: string[]) {
    const api: any = this.agent.api;
    const result = new Map<string, any>();
    if (!uris.length) return result;

    const chunkSize = 25;
    for (let i = 0; i < uris.length; i += chunkSize) {
      const batch = uris.slice(i, i + chunkSize);
      try {
        const response = await api.app.bsky.feed.getPosts({ uris: batch });
        for (const post of response.data?.posts ?? []) {
          if (post?.uri) {
            result.set(post.uri, post);
          }
        }
      } catch {
        // Keep base search payload when hydration fails.
      }
    }
    return result;
  }

  private async hydrateProfilesByActor(actors: string[]) {
    const api: any = this.agent.api;
    const result = new Map<string, any>();
    const uniqueActors = [...new Set(actors)];
    if (!uniqueActors.length) return result;

    const chunkSize = 25;
    for (let i = 0; i < uniqueActors.length; i += chunkSize) {
      const batch = uniqueActors.slice(i, i + chunkSize);
      try {
        const response = await api.app.bsky.actor.getProfiles({ actors: batch });
        for (const profile of response.data?.profiles ?? []) {
          if (profile?.did) {
            result.set(profile.did, profile);
          }
          if (profile?.handle) {
            result.set(profile.handle, profile);
          }
        }
      } catch {
        // Keep base author payload when profile hydration fails.
      }
    }

    // Fallback: if batch endpoint is partial/unavailable, fetch remaining profiles one-by-one.
    const missing = uniqueActors.filter((actor) => !result.has(actor));
    for (const actor of missing) {
      try {
        const response = await this.agent.getProfile({ actor });
        if (response.data?.did) {
          result.set(response.data.did, response.data);
        }
        if (response.data?.handle) {
          result.set(response.data.handle, response.data);
        }
      } catch {
        // Ignore individual profile failures.
      }
    }

    return result;
  }

  async publishFeedGenerator(payload: PublishFeedGeneratorPayload) {
    const api: any = this.agent.api;
    const repo = this.requireDid();
    const serviceDid = import.meta.env.VITE_BSKY_FEEDGEN_DID;
    if (!serviceDid) {
      throw new Error('Missing VITE_BSKY_FEEDGEN_DID. Configure it before publishing to Bluesky.');
    }

    const rkey = makeFeedRkey(payload.feedId);
    const avatarBlob = payload.iconDataUrl
      ? await this.uploadBlobFromDataUrl(payload.iconDataUrl)
      : undefined;

    const response = await api.com.atproto.repo.putRecord({
      repo,
      collection: 'app.bsky.feed.generator',
      rkey,
      record: {
        did: serviceDid,
        displayName: payload.displayName.trim(),
        description: payload.description?.trim() || undefined,
        avatar: avatarBlob,
        createdAt: new Date().toISOString(),
      },
      validate: false,
    });

    return {
      uri: response.data?.uri ?? `at://${repo}/app.bsky.feed.generator/${rkey}`,
      cid: response.data?.cid,
      rkey,
    };
  }

  async deleteFeedGeneratorRecord(rkey: string) {
    const api: any = this.agent.api;
    const repo = this.requireDid();
    await api.com.atproto.repo.deleteRecord({
      repo,
      collection: 'app.bsky.feed.generator',
      rkey,
    });
  }

  private async uploadBlobFromDataUrl(dataUrl: string) {
    const api: any = this.agent.api;
    const blob = dataUrlToBlob(dataUrl);
    const response = await api.com.atproto.repo.uploadBlob(blob);
    return response.data?.blob;
  }

  private requireDid() {
    const did = this.agent.session?.did;
    if (!did) {
      throw new Error('You need to log in first.');
    }
    return did;
  }

  private async resolveActorDid(actor: string) {
    if (actor.startsWith('did:')) return actor;
    const api: any = this.agent.api;
    const response = await api.com.atproto.identity.resolveHandle({ handle: actor });
    const did = response.data?.did;
    if (!did) {
      throw new Error('Could not resolve starter pack owner handle.');
    }
    return did;
  }

  private async parseStarterPackReference(reference: string): Promise<{ actor: string; rkey: string }> {
    if (reference.startsWith('at://')) {
      const match = reference.match(
        /^at:\/\/([^/]+)\/app\.bsky\.graph\.starterpack\/([^/?#]+)/i,
      );
      if (!match) {
        throw new Error('Invalid starter pack at:// URI format.');
      }
      return { actor: match[1], rkey: match[2] };
    }

    let url: URL;
    try {
      url = new URL(reference);
    } catch {
      throw new Error('Invalid starter pack URL.');
    }

    if (url.hostname === 'go.bsky.app') {
      const expanded = await this.expandShortUrl(reference);
      return this.parseStarterPackReference(expanded);
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const lower = parts.map((part) => part.toLowerCase());

    if (lower[0] === 'starter-pack' && parts[1] && parts[2]) {
      return { actor: parts[1], rkey: parts[2] };
    }

    if (lower[0] === 'profile' && parts[1] && lower[2] === 'starter-pack' && parts[3]) {
      return { actor: parts[1], rkey: parts[3] };
    }

    throw new Error('Unsupported starter pack URL format.');
  }

  private async expandShortUrl(url: string) {
    const corsResolved = await this.tryResolveShortUrl(url, 'cors');
    if (corsResolved) return corsResolved;

    // Some go.bsky.app redirects do not allow CORS. This fallback can still expose final URL.
    const noCorsResolved = await this.tryResolveShortUrl(url, 'no-cors');
    if (noCorsResolved) return noCorsResolved;

    throw new Error(
      'Could not resolve short link automatically in browser-only mode. Paste the full bsky.app starter pack URL or at:// URI.',
    );
  }

  private async tryResolveShortUrl(url: string, mode: RequestMode) {
    try {
      const response = await fetch(url, { redirect: 'follow', mode });
      const resolvedUrl = response.url || '';
      if (!resolvedUrl) return null;
      if (resolvedUrl.includes('bsky.app/') || resolvedUrl.startsWith('at://')) {
        return resolvedUrl;
      }
      if (resolvedUrl !== url) {
        return resolvedUrl;
      }
      return null;
    } catch {
      return null;
    }
  }
}

function dedupeMembers(members: ListMember[]) {
  const seen = new Set<string>();
  const output: ListMember[] = [];
  for (const member of members) {
    if (seen.has(member.did)) continue;
    seen.add(member.did);
    output.push(member);
  }
  return output;
}

function normalizePostView(
  rawPost: any,
  hydratedPost: any,
  profileByActor: Map<string, any>,
) {
  const post = hydratedPost ?? rawPost;
  const authorDid =
    post?.author?.did ??
    rawPost?.author?.did ??
    extractDidFromAtUri(post?.uri) ??
    extractDidFromAtUri(rawPost?.uri);
  const authorHandle = post?.author?.handle ?? rawPost?.author?.handle;
  const profile = (authorDid && profileByActor.get(authorDid)) || (authorHandle && profileByActor.get(authorHandle));
  const mergedAuthor = {
    ...rawPost?.author,
    ...post?.author,
    did: profile?.did ?? post?.author?.did ?? rawPost?.author?.did ?? authorDid,
    displayName: profile?.displayName ?? post?.author?.displayName ?? rawPost?.author?.displayName,
    avatar: profile?.avatar ?? post?.author?.avatar ?? rawPost?.author?.avatar,
    handle: post?.author?.handle ?? rawPost?.author?.handle,
  };
  const normalized = {
    uri: post.uri,
    cid: post.cid,
    text: post.record?.text ?? '',
    authorDisplayName: normalizeAuthorDisplayName(mergedAuthor),
    authorHandle: mergedAuthor?.handle ?? 'unknown',
    authorAvatar: normalizeAuthorAvatar(mergedAuthor),
    media: extractMediaFromPost(post, authorDid),
    createdAt: post.record?.createdAt ?? new Date().toISOString(),
  };
  return normalized;
}

function extractMediaFromPost(post: any, authorDid?: string): CuratedPostMedia[] {
  const resolvedDid: string | undefined = authorDid ?? post?.author?.did ?? extractDidFromAtUri(post?.uri);
  const fromView = extractMediaFromEmbed(post?.embed, resolvedDid);
  if (fromView.length) return fromView;
  return extractMediaFromEmbed(post?.record?.embed, resolvedDid);
}

function extractMediaFromEmbed(embed: unknown, authorDid?: string): CuratedPostMedia[] {
  const root = asRecord(embed);
  if (!root) return [];

  const type = asString(root.$type) ?? '';

  if (type.includes('recordWithMedia')) {
    return extractMediaFromEmbed(root.media, authorDid);
  }

  if (type.includes('images')) {
    const images = Array.isArray(root.images) ? root.images : [];
    const parsed: CuratedPostMedia[] = [];
    images.forEach((image) => {
      const item = asRecord(image);
      if (!item) return;
      const fullsize = asString(item.fullsize);
      const thumb = asString(item.thumb);
      const blobCid = getBlobCid(item.image);
      const blobUrl = blobCid && authorDid
        ? `https://cdn.bsky.app/img/feed_fullsize/plain/${authorDid}/${blobCid}@jpeg`
        : undefined;
      const blobThumb = blobCid && authorDid
        ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${blobCid}@jpeg`
        : undefined;
      const url = fullsize ?? thumb ?? blobUrl;
      if (!url) return;
      parsed.push({
        type: 'image',
        url,
        thumb: thumb ?? fullsize ?? blobThumb,
        alt: asString(item.alt),
      });
    });
    return parsed;
  }

  if (type.includes('video')) {
    const playlist = asString(root.playlist);
    const uri = asString(root.uri);
    const cid = asString(root.cid);
    const blobCid = getBlobCid(root.video);
    const blobPlaylist = blobCid && authorDid
      ? `https://video.bsky.app/watch/${authorDid}/${blobCid}/playlist.m3u8`
      : undefined;
    const blobThumb = blobCid && authorDid
      ? `https://video.bsky.app/watch/${authorDid}/${blobCid}/thumbnail.jpg`
      : undefined;
    const url = playlist ?? uri ?? cid ?? blobPlaylist;
    if (!url) return [];
    return [
      {
        type: 'video',
        url,
        thumb: asString(root.thumbnail) ?? blobThumb,
        alt: asString(root.alt),
      },
    ];
  }

  if (type.includes('external')) {
    const external = asRecord(root.external);
    const thumb = asString(external?.thumb);
    if (!thumb) return [];
    return [
      {
        type: 'image',
        url: thumb,
        thumb,
        alt: asString(external?.title),
      },
    ];
  }

  if (root.media) {
    return extractMediaFromEmbed(root.media, authorDid);
  }

  return [];
}

function normalizeAuthorDisplayName(author: any) {
  const display = asString(author?.displayName);
  if (display) return display;
  const handle = asString(author?.handle);
  if (handle) return handle.split('.')[0];
  return 'Unknown';
}

function normalizeAuthorAvatar(author: any) {
  const direct = asString(author?.avatar);
  if (direct) return direct;
  const did = asString(author?.did);
  const cid = getBlobCid(author?.avatar);
  if (did && cid) {
    return `https://cdn.bsky.app/img/avatar/plain/${did}/${cid}@jpeg`;
  }
  return undefined;
}

function getBlobCid(blob: unknown) {
  const record = asRecord(blob);
  if (!record) return undefined;
  const ref = asRecord(record.ref);
  return asString(ref?.$link) ?? asString(record.cid) ?? asString(record.$link);
}

function extractDidFromAtUri(uri: unknown) {
  const value = asString(uri);
  if (!value) return undefined;
  const match = value.match(/^at:\/\/(did:[^/]+)\//);
  return match?.[1];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function unwrapSearchEntryPost(entry: any) {
  const candidate = asRecord(entry);
  if (!candidate) return null;
  const nested = asRecord(candidate.post);
  if (nested) return nested;
  return candidate;
}

export const blueskyClient = new BlueskyClient();

function makeFeedRkey(feedId: string) {
  const normalized = feedId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'feed';
  return `sunnyday-${normalized}`;
}

function dataUrlToBlob(dataUrl: string) {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid icon data URL.');
  }
  const mime = parts[0].match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
