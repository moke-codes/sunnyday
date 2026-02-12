import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { blueskyClient } from '@/services/blueskyClient';
import { pushFeedContents, removeFeedContents } from '@/services/feedgenClient';
import { loadCuratedFeeds, saveCuratedFeeds } from '@/services/sessionStorage';
const DEFAULT_AUTOMATION = {
    enabled: false,
    mode: 'words',
    pattern: '',
    caseSensitive: false,
};
export const useToolsStore = defineStore('tools', () => {
    const lists = ref([]);
    const starterPacks = ref([]);
    const actorSearchResults = ref([]);
    const members = ref([]);
    const loading = ref(false);
    const operationResult = ref(null);
    const curatedFeeds = ref(loadInitialFeeds());
    const activeFeedId = ref(curatedFeeds.value[0]?.id ?? null);
    const selectedMemberCount = computed(() => members.value.length);
    const activeFeed = computed(() => {
        if (!activeFeedId.value)
            return null;
        return curatedFeeds.value.find((feed) => feed.id === activeFeedId.value) ?? null;
    });
    watch(curatedFeeds, (feeds) => {
        saveCuratedFeeds(feeds);
    }, { deep: true });
    async function refreshLists() {
        loading.value = true;
        try {
            lists.value = await blueskyClient.getViewerLists();
        }
        finally {
            loading.value = false;
        }
    }
    async function loadListMembers(listUri) {
        loading.value = true;
        try {
            members.value = await blueskyClient.getListMembers(listUri);
        }
        finally {
            loading.value = false;
        }
    }
    async function refreshStarterPacks() {
        loading.value = true;
        try {
            starterPacks.value = await blueskyClient.getViewerStarterPacks();
        }
        finally {
            loading.value = false;
        }
    }
    async function loadStarterPackMembers(starterPack) {
        loading.value = true;
        try {
            members.value = await blueskyClient.getStarterPackMembers(starterPack);
        }
        finally {
            loading.value = false;
        }
    }
    async function loadStarterPackMembersFromReference(reference) {
        loading.value = true;
        try {
            const starterPack = await blueskyClient.getStarterPackByReference(reference);
            members.value = await blueskyClient.getStarterPackMembers(starterPack);
            if (!starterPacks.value.some((pack) => pack.uri === starterPack.uri)) {
                starterPacks.value = [starterPack, ...starterPacks.value];
            }
            return starterPack;
        }
        finally {
            loading.value = false;
        }
    }
    async function searchActors(query) {
        loading.value = true;
        try {
            actorSearchResults.value = await blueskyClient.searchActors(query);
            return actorSearchResults.value;
        }
        finally {
            loading.value = false;
        }
    }
    async function loadStarterPacksForActor(actor) {
        loading.value = true;
        try {
            starterPacks.value = await blueskyClient.getStarterPacksByActor(actor);
        }
        finally {
            loading.value = false;
        }
    }
    async function convertListToStarterPack(payload) {
        loading.value = true;
        try {
            const response = await blueskyClient.createStarterPackFromMembers({
                name: payload.name,
                description: payload.description,
                members: payload.selectedMembers,
            });
            operationResult.value = response.result;
            await refreshStarterPacks();
            return response;
        }
        finally {
            loading.value = false;
        }
    }
    async function addToExistingList(listUri, selectedMembers) {
        loading.value = true;
        try {
            operationResult.value = await blueskyClient.addMembersToList(listUri, selectedMembers);
        }
        finally {
            loading.value = false;
        }
    }
    async function createNewListAndAddMembers(listName, selectedMembers, description, isPrivate) {
        loading.value = true;
        try {
            const listUri = await blueskyClient.createList({
                name: listName,
                description,
                private: isPrivate,
            });
            operationResult.value = await blueskyClient.addMembersToList(listUri, selectedMembers);
            await refreshLists();
            return listUri;
        }
        finally {
            loading.value = false;
        }
    }
    async function searchPosts(query, author) {
        return blueskyClient.searchPosts(query, author);
    }
    function createFeed(name) {
        const trimmed = name.trim();
        if (!trimmed)
            return null;
        const now = new Date().toISOString();
        const feed = {
            id: generateId(),
            name: trimmed,
            description: '',
            publishedDescription: '',
            iconDataUrl: undefined,
            publishedIconDataUrl: undefined,
            automation: { ...DEFAULT_AUTOMATION },
            publishedAutomation: { ...DEFAULT_AUTOMATION },
            draftPosts: [],
            publishedPosts: [],
            isDirty: false,
            lastPublishError: null,
            createdAt: now,
            updatedAt: now,
        };
        curatedFeeds.value = [feed, ...curatedFeeds.value];
        activeFeedId.value = feed.id;
        return feed;
    }
    function setActiveFeed(feedId) {
        if (!curatedFeeds.value.some((feed) => feed.id === feedId))
            return;
        activeFeedId.value = feedId;
    }
    function updateFeedDetails(feedId, details) {
        curatedFeeds.value = curatedFeeds.value.map((feed) => {
            if (feed.id !== feedId)
                return feed;
            const hasIconField = Object.prototype.hasOwnProperty.call(details, 'iconDataUrl');
            const nextDescription = details.description !== undefined ? details.description : feed.description;
            const nextIcon = details.clearIcon
                ? undefined
                : hasIconField
                    ? details.iconDataUrl
                    : feed.iconDataUrl;
            const updated = {
                ...feed,
                description: nextDescription,
                iconDataUrl: nextIcon,
                updatedAt: new Date().toISOString(),
            };
            return {
                ...updated,
                isDirty: calculateFeedDirty(updated),
            };
        });
    }
    function renameFeed(feedId, name) {
        const trimmed = name.trim();
        if (!trimmed)
            return;
        curatedFeeds.value = curatedFeeds.value.map((feed) => {
            if (feed.id !== feedId)
                return feed;
            return {
                ...feed,
                name: trimmed,
                updatedAt: new Date().toISOString(),
            };
        });
    }
    async function deleteFeed(feedId) {
        const targetFeed = curatedFeeds.value.find((feed) => feed.id === feedId);
        if (!targetFeed)
            return;
        const rkey = targetFeed.blueskyFeedRkey ?? extractFeedRkey(targetFeed.blueskyFeedUri);
        if (rkey) {
            loading.value = true;
            try {
                await blueskyClient.deleteFeedGeneratorRecord(rkey);
                if (targetFeed.blueskyFeedUri) {
                    await removeFeedContents(targetFeed.blueskyFeedUri);
                }
            }
            catch (error) {
                const message = error.message || 'Failed to delete feed on Bluesky.';
                curatedFeeds.value = curatedFeeds.value.map((feed) => feed.id === feedId
                    ? {
                        ...feed,
                        lastPublishError: message,
                        updatedAt: new Date().toISOString(),
                    }
                    : feed);
                throw new Error(`Could not delete published feed on Bluesky: ${message}`);
            }
            finally {
                loading.value = false;
            }
        }
        else if (targetFeed.blueskyFeedUri) {
            await removeFeedContents(targetFeed.blueskyFeedUri);
        }
        curatedFeeds.value = curatedFeeds.value.filter((feed) => feed.id !== feedId);
        if (!curatedFeeds.value.length) {
            const fallback = createFeed('Default Feed');
            activeFeedId.value = fallback?.id ?? null;
            return;
        }
        if (activeFeedId.value === feedId) {
            activeFeedId.value = curatedFeeds.value[0].id;
        }
    }
    function updateFeedAutomation(feedId, automation) {
        curatedFeeds.value = curatedFeeds.value.map((feed) => {
            if (feed.id !== feedId)
                return feed;
            return {
                ...feed,
                automation: { ...automation },
                isDirty: calculateFeedDirty({ ...feed, automation: { ...automation } }),
                updatedAt: new Date().toISOString(),
            };
        });
    }
    function isPostInActiveFeed(uri) {
        const feed = activeFeed.value;
        if (!feed)
            return false;
        return feed.draftPosts.some((post) => post.uri === uri);
    }
    function addPostToActiveFeed(post) {
        const feed = activeFeed.value;
        if (!feed)
            return;
        if (feed.draftPosts.some((item) => item.uri === post.uri))
            return;
        curatedFeeds.value = curatedFeeds.value.map((item) => {
            if (item.id !== feed.id)
                return item;
            const draftPosts = [post, ...item.draftPosts];
            return {
                ...item,
                draftPosts,
                isDirty: calculateFeedDirty({ ...item, draftPosts }),
                updatedAt: new Date().toISOString(),
            };
        });
    }
    function removePostFromActiveFeed(uri) {
        const feed = activeFeed.value;
        if (!feed)
            return;
        curatedFeeds.value = curatedFeeds.value.map((item) => {
            if (item.id !== feed.id)
                return item;
            const draftPosts = item.draftPosts.filter((post) => post.uri !== uri);
            return {
                ...item,
                draftPosts,
                isDirty: calculateFeedDirty({ ...item, draftPosts }),
                updatedAt: new Date().toISOString(),
            };
        });
    }
    function publishActiveFeed() {
        const feed = activeFeed.value;
        if (!feed)
            return;
        const publishedAt = new Date().toISOString();
        curatedFeeds.value = curatedFeeds.value.map((item) => {
            if (item.id !== feed.id)
                return item;
            return {
                ...item,
                publishedPosts: [...item.draftPosts],
                publishedAutomation: { ...item.automation },
                publishedDescription: item.description,
                publishedIconDataUrl: item.iconDataUrl,
                isDirty: false,
                lastPublishedAt: publishedAt,
                lastPublishError: null,
                updatedAt: publishedAt,
            };
        });
    }
    async function publishActiveFeedToBluesky() {
        const feed = activeFeed.value;
        if (!feed) {
            throw new Error('No active feed selected.');
        }
        loading.value = true;
        try {
            const description = buildFeedDescription(feed);
            const published = await blueskyClient.publishFeedGenerator({
                feedId: feed.id,
                displayName: feed.name,
                description: feed.description?.trim() || description,
                iconDataUrl: feed.iconDataUrl,
            });
            const publishedAt = new Date().toISOString();
            let publishError = null;
            if (import.meta.env.VITE_FEEDGEN_URL && import.meta.env.VITE_FEEDGEN_SECRET) {
                try {
                    await pushFeedContents(published.uri, feed.draftPosts.map((p) => p.uri));
                }
                catch (err) {
                    publishError = err.message ?? 'Failed to push feed contents to feed generator.';
                    throw new Error(publishError);
                }
            }
            else {
                publishError =
                    'Feed contents were not pushed (set VITE_FEEDGEN_URL and VITE_FEEDGEN_SECRET). The feed may appear empty until you configure and re-publish.';
            }
            curatedFeeds.value = curatedFeeds.value.map((item) => {
                if (item.id !== feed.id)
                    return item;
                return {
                    ...item,
                    publishedPosts: [...item.draftPosts],
                    publishedAutomation: { ...item.automation },
                    publishedDescription: item.description,
                    publishedIconDataUrl: item.iconDataUrl,
                    isDirty: false,
                    lastPublishedAt: publishedAt,
                    blueskyFeedUri: published.uri,
                    blueskyFeedRkey: published.rkey,
                    lastPublishError: publishError,
                    updatedAt: publishedAt,
                };
            });
            return published;
        }
        catch (error) {
            const message = error.message || 'Failed to publish feed to Bluesky.';
            curatedFeeds.value = curatedFeeds.value.map((item) => {
                if (item.id !== feed.id)
                    return item;
                return {
                    ...item,
                    lastPublishError: message,
                    updatedAt: new Date().toISOString(),
                };
            });
            throw error;
        }
        finally {
            loading.value = false;
        }
    }
    function discardActiveFeedChanges() {
        const feed = activeFeed.value;
        if (!feed)
            return;
        curatedFeeds.value = curatedFeeds.value.map((item) => {
            if (item.id !== feed.id)
                return item;
            return {
                ...item,
                draftPosts: [...item.publishedPosts],
                automation: { ...item.publishedAutomation },
                description: item.publishedDescription,
                iconDataUrl: item.publishedIconDataUrl,
                isDirty: false,
                updatedAt: new Date().toISOString(),
            };
        });
    }
    async function pushActiveFeedContentsOnly() {
        const feed = activeFeed.value;
        if (!feed?.blueskyFeedUri) {
            throw new Error('Publish the feed to Bluesky first so it has a feed URI.');
        }
        loading.value = true;
        try {
            await pushFeedContents(feed.blueskyFeedUri, feed.draftPosts.map((p) => p.uri));
            curatedFeeds.value = curatedFeeds.value.map((item) => {
                if (item.id !== feed.id)
                    return item;
                return { ...item, lastPublishError: null, updatedAt: new Date().toISOString() };
            });
        }
        finally {
            loading.value = false;
        }
    }
    return {
        lists,
        starterPacks,
        actorSearchResults,
        members,
        loading,
        operationResult,
        selectedMemberCount,
        curatedFeeds,
        activeFeedId,
        activeFeed,
        refreshLists,
        loadListMembers,
        refreshStarterPacks,
        loadStarterPackMembers,
        loadStarterPackMembersFromReference,
        searchActors,
        loadStarterPacksForActor,
        convertListToStarterPack,
        addToExistingList,
        createNewListAndAddMembers,
        searchPosts,
        createFeed,
        setActiveFeed,
        renameFeed,
        updateFeedDetails,
        deleteFeed,
        updateFeedAutomation,
        isPostInActiveFeed,
        addPostToActiveFeed,
        removePostFromActiveFeed,
        publishActiveFeed,
        publishActiveFeedToBluesky,
        pushActiveFeedContentsOnly,
        discardActiveFeedChanges,
    };
});
function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `feed-${Math.random().toString(36).slice(2, 10)}`;
}
function extractFeedRkey(uri) {
    if (!uri)
        return null;
    const match = uri.match(/\/app\.bsky\.feed\.generator\/([^/?#]+)$/);
    return match?.[1] ?? null;
}
function loadInitialFeeds() {
    const stored = loadCuratedFeeds();
    if (stored?.length) {
        return stored.map(normalizeStoredFeed);
    }
    const now = new Date().toISOString();
    return [
        {
            id: generateId(),
            name: 'Default Feed',
            description: '',
            publishedDescription: '',
            iconDataUrl: undefined,
            publishedIconDataUrl: undefined,
            automation: { ...DEFAULT_AUTOMATION },
            publishedAutomation: { ...DEFAULT_AUTOMATION },
            draftPosts: [],
            publishedPosts: [],
            isDirty: false,
            lastPublishError: null,
            createdAt: now,
            updatedAt: now,
        },
    ];
}
function normalizeStoredFeed(feed) {
    const publishedAutomation = feed.publishedAutomation ?? { ...feed.automation };
    const publishedPosts = feed.publishedPosts ?? feed.posts ?? [];
    const draftPosts = feed.draftPosts ?? feed.posts ?? publishedPosts;
    const normalized = {
        id: feed.id,
        name: feed.name,
        description: feed.description ?? '',
        publishedDescription: feed.publishedDescription ?? feed.description ?? '',
        iconDataUrl: feed.iconDataUrl,
        publishedIconDataUrl: feed.publishedIconDataUrl ?? feed.iconDataUrl,
        automation: feed.automation ?? { ...DEFAULT_AUTOMATION },
        publishedAutomation,
        draftPosts,
        publishedPosts,
        isDirty: typeof feed.isDirty === 'boolean'
            ? feed.isDirty
            : calculateFeedDirty({
                ...feed,
                automation: feed.automation ?? { ...DEFAULT_AUTOMATION },
                publishedAutomation,
                draftPosts,
                publishedPosts,
                isDirty: false,
            }),
        lastPublishedAt: feed.lastPublishedAt,
        blueskyFeedUri: feed.blueskyFeedUri,
        blueskyFeedRkey: feed.blueskyFeedRkey,
        lastPublishError: feed.lastPublishError ?? null,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
    };
    return normalized;
}
function calculateFeedDirty(feed) {
    if ((feed.description || '') !== (feed.publishedDescription || ''))
        return true;
    if ((feed.iconDataUrl || '') !== (feed.publishedIconDataUrl || ''))
        return true;
    if (!isAutomationEqual(feed.automation, feed.publishedAutomation))
        return true;
    return !arePostListsEqual(feed.draftPosts, feed.publishedPosts);
}
function isAutomationEqual(a, b) {
    return (a.enabled === b.enabled &&
        a.mode === b.mode &&
        a.pattern === b.pattern &&
        a.caseSensitive === b.caseSensitive);
}
function arePostListsEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i].uri !== b[i].uri)
            return false;
    }
    return true;
}
function buildFeedDescription(feed) {
    const mode = feed.automation.mode;
    const pattern = feed.automation.pattern.trim();
    const filterPart = pattern ? `${mode}: ${pattern}` : `${mode} rules`;
    return `Managed by Sunnyday. ${feed.draftPosts.length} curated posts. Automation ${feed.automation.enabled ? 'enabled' : 'disabled'} (${filterPart}).`;
}
