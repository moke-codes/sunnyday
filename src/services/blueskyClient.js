import { BskyAgent } from '@atproto/api';
const service = 'https://bsky.social';
const listPurpose = 'app.bsky.graph.defs#curatelist';
class BlueskyClient {
    agent;
    constructor() {
        this.agent = new BskyAgent({ service });
    }
    get session() {
        return this.agent.session;
    }
    get isAuthenticated() {
        return Boolean(this.agent.session?.did);
    }
    async login(payload) {
        const response = await this.agent.login(payload);
        return response.data;
    }
    async resumeSession(session) {
        await this.agent.resumeSession(session);
    }
    async logout() {
        await this.agent.logout();
    }
    async getViewerProfile() {
        const actor = this.requireDid();
        const response = await this.agent.getProfile({ actor });
        return {
            did: response.data.did,
            handle: response.data.handle,
            displayName: response.data.displayName,
            avatar: response.data.avatar,
        };
    }
    async getViewerLists() {
        const actor = this.requireDid();
        const api = this.agent.api;
        const response = await api.app.bsky.graph.getLists({ actor, limit: 100 });
        const lists = response.data?.lists ?? [];
        return lists.map((list) => ({
            uri: list.uri,
            cid: list.cid,
            name: list.name,
            description: list.description,
            purpose: list.purpose,
        }));
    }
    async getListMembers(listUri) {
        const api = this.agent.api;
        let cursor;
        const members = [];
        do {
            const response = await api.app.bsky.graph.getList({ list: listUri, cursor, limit: 100 });
            for (const item of response.data?.items ?? []) {
                const subject = item.subject;
                if (!subject?.did || !subject?.handle)
                    continue;
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
    async createList(input) {
        const api = this.agent.api;
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
    async addMembersToList(listUri, members) {
        const api = this.agent.api;
        const repo = this.requireDid();
        const seen = new Set();
        let added = 0;
        let skipped = 0;
        const unresolved = [];
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
            }
            catch {
                skipped += 1;
            }
        }
        return { added, skipped, unresolved };
    }
    async createStarterPackFromMembers(input) {
        const api = this.agent.api;
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
    async getViewerStarterPacks() {
        const actor = this.requireDid();
        return this.getStarterPacksByActor(actor);
    }
    async searchActors(query) {
        const api = this.agent.api;
        const term = query.trim();
        if (!term)
            return [];
        const response = await api.app.bsky.actor.searchActorsTypeahead({
            term,
            limit: 10,
        });
        return (response.data?.actors ?? []).map((actor) => ({
            did: actor.did,
            handle: actor.handle,
            displayName: actor.displayName,
            avatar: actor.avatar,
        }));
    }
    async getStarterPacksByActor(actor) {
        const api = this.agent.api;
        const did = await this.resolveActorDid(actor);
        const response = await api.app.bsky.graph.getActorStarterPacks({ actor: did, limit: 100 });
        return (response.data?.starterPacks ?? []).map((pack) => ({
            uri: pack.uri,
            cid: pack.cid,
            name: pack.record?.name ?? 'Untitled Starter Pack',
            description: pack.record?.description,
            listUri: pack.record?.list,
        }));
    }
    async getStarterPackMembers(starterPack) {
        if (!starterPack.listUri)
            return [];
        return this.getListMembers(starterPack.listUri);
    }
    async getStarterPackByReference(reference) {
        const api = this.agent.api;
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
    async searchPosts(query, author) {
        const api = this.agent.api;
        const finalQuery = author ? `from:${author} ${query}`.trim() : query;
        const response = await api.app.bsky.feed.searchPosts({
            q: finalQuery,
            limit: 50,
            sort: 'latest',
        });
        return (response.data?.posts ?? []).map((post) => ({
            uri: post.uri,
            cid: post.cid,
            text: post.record?.text ?? '',
            authorHandle: post.author?.handle ?? 'unknown',
            createdAt: post.record?.createdAt ?? new Date().toISOString(),
        }));
    }
    async publishFeedGenerator(payload) {
        const api = this.agent.api;
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
    async deleteFeedGeneratorRecord(rkey) {
        const api = this.agent.api;
        const repo = this.requireDid();
        await api.com.atproto.repo.deleteRecord({
            repo,
            collection: 'app.bsky.feed.generator',
            rkey,
        });
    }
    async uploadBlobFromDataUrl(dataUrl) {
        const api = this.agent.api;
        const blob = dataUrlToBlob(dataUrl);
        const response = await api.com.atproto.repo.uploadBlob(blob);
        return response.data?.blob;
    }
    requireDid() {
        const did = this.agent.session?.did;
        if (!did) {
            throw new Error('You need to log in first.');
        }
        return did;
    }
    async resolveActorDid(actor) {
        if (actor.startsWith('did:'))
            return actor;
        const api = this.agent.api;
        const response = await api.com.atproto.identity.resolveHandle({ handle: actor });
        const did = response.data?.did;
        if (!did) {
            throw new Error('Could not resolve starter pack owner handle.');
        }
        return did;
    }
    async parseStarterPackReference(reference) {
        if (reference.startsWith('at://')) {
            const match = reference.match(/^at:\/\/([^/]+)\/app\.bsky\.graph\.starterpack\/([^/?#]+)/i);
            if (!match) {
                throw new Error('Invalid starter pack at:// URI format.');
            }
            return { actor: match[1], rkey: match[2] };
        }
        let url;
        try {
            url = new URL(reference);
        }
        catch {
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
    async expandShortUrl(url) {
        const corsResolved = await this.tryResolveShortUrl(url, 'cors');
        if (corsResolved)
            return corsResolved;
        // Some go.bsky.app redirects do not allow CORS. This fallback can still expose final URL.
        const noCorsResolved = await this.tryResolveShortUrl(url, 'no-cors');
        if (noCorsResolved)
            return noCorsResolved;
        throw new Error('Could not resolve short link automatically in browser-only mode. Paste the full bsky.app starter pack URL or at:// URI.');
    }
    async tryResolveShortUrl(url, mode) {
        try {
            const response = await fetch(url, { redirect: 'follow', mode });
            const resolvedUrl = response.url || '';
            if (!resolvedUrl)
                return null;
            if (resolvedUrl.includes('bsky.app/') || resolvedUrl.startsWith('at://')) {
                return resolvedUrl;
            }
            if (resolvedUrl !== url) {
                return resolvedUrl;
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
function dedupeMembers(members) {
    const seen = new Set();
    const output = [];
    for (const member of members) {
        if (seen.has(member.did))
            continue;
        seen.add(member.did);
        output.push(member);
    }
    return output;
}
export const blueskyClient = new BlueskyClient();
function makeFeedRkey(feedId) {
    const normalized = feedId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'feed';
    return `sunnyday-${normalized}`;
}
function dataUrlToBlob(dataUrl) {
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
