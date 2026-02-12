import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import { useToolsStore } from '@/stores/tools';
import { useUiStore } from '@/stores/ui';
const tools = useToolsStore();
const ui = useUiStore();
const query = ref('');
const author = ref('');
const searchResults = ref([]);
const searchCursor = ref(null);
const hasMoreSearchResults = ref(false);
const isLoadingMore = ref(false);
const authorSearchContainer = ref(null);
const isAuthorDropdownOpen = ref(false);
const isSearchingAuthors = ref(false);
const highlightedAuthorIndex = ref(-1);
let authorSearchTimer;
const newFeedName = ref('');
const renameValue = ref(tools.activeFeed?.name ?? '');
const automation = ref(cloneAutomation());
const feedDescription = ref(tools.activeFeed?.description ?? '');
const feedIconPreview = ref(tools.activeFeed?.iconDataUrl);
const isDetailsOpen = ref(false);
const isAutomationOpen = ref(false);
const isSearching = ref(false);
const showDeleteFeedModal = ref(false);
const isPublishingFeed = ref(false);
const isPushingContent = ref(false);
const isDeletingFeed = ref(false);
const uiError = ref('');
const deleteCancelButton = ref(null);
const deleteConfirmButton = ref(null);
const deleteTriggerElement = ref(null);
let hlsLoaderPromise = null;
const hlsInstances = new Map();
const boundVideoUrls = new WeakMap();
const showAuthorDropdown = computed(() => {
    if (!isAuthorDropdownOpen.value)
        return false;
    if (isSearchingAuthors.value)
        return true;
    return author.value.trim().length >= 2;
});
const highlightedAuthorDid = computed(() => {
    const actor = tools.actorSearchResults[highlightedAuthorIndex.value];
    return actor?.did;
});
watch(() => tools.activeFeedId, () => {
    renameValue.value = tools.activeFeed?.name ?? '';
    feedDescription.value = tools.activeFeed?.description ?? '';
    feedIconPreview.value = tools.activeFeed?.iconDataUrl;
    automation.value = cloneAutomation();
}, { immediate: true });
onMounted(() => {
    document.addEventListener('click', onDocumentClick);
});
onBeforeUnmount(() => {
    if (authorSearchTimer)
        window.clearTimeout(authorSearchTimer);
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDeleteModalKeydown);
    document.body.style.overflow = '';
    hlsInstances.forEach((instance) => instance.destroy());
    hlsInstances.clear();
});
watch(showDeleteFeedModal, async (open) => {
    if (open) {
        document.addEventListener('keydown', onDeleteModalKeydown);
        document.body.style.overflow = 'hidden';
        await nextTick();
        deleteCancelButton.value?.focus();
        return;
    }
    document.removeEventListener('keydown', onDeleteModalKeydown);
    document.body.style.overflow = '';
    deleteTriggerElement.value?.focus();
});
watch(author, (value) => {
    const queryValue = value.trim();
    if (authorSearchTimer)
        window.clearTimeout(authorSearchTimer);
    if (queryValue.length < 2) {
        tools.actorSearchResults = [];
        isSearchingAuthors.value = false;
        highlightedAuthorIndex.value = -1;
        return;
    }
    isSearchingAuthors.value = true;
    authorSearchTimer = window.setTimeout(async () => {
        try {
            await tools.searchActors(queryValue);
            highlightedAuthorIndex.value = tools.actorSearchResults.length ? 0 : -1;
        }
        catch {
            tools.actorSearchResults = [];
            highlightedAuthorIndex.value = -1;
        }
        finally {
            isSearchingAuthors.value = false;
        }
    }, 300);
});
async function search() {
    isSearching.value = true;
    try {
        searchCursor.value = null;
        const page = await tools.searchPosts(query.value, author.value || undefined);
        searchResults.value = page.posts;
        searchCursor.value = page.cursor;
        hasMoreSearchResults.value = Boolean(page.cursor);
    }
    finally {
        isSearching.value = false;
    }
}
async function loadMoreSearchResults() {
    if (!hasMoreSearchResults.value || !searchCursor.value)
        return;
    if (isSearching.value || isLoadingMore.value)
        return;
    isLoadingMore.value = true;
    try {
        const page = await tools.searchPosts(query.value, author.value || undefined, searchCursor.value);
        const seen = new Set(searchResults.value.map((post) => post.uri));
        const next = page.posts.filter((post) => !seen.has(post.uri));
        searchResults.value = [...searchResults.value, ...next];
        searchCursor.value = page.cursor;
        hasMoreSearchResults.value = Boolean(page.cursor);
    }
    finally {
        isLoadingMore.value = false;
    }
}
function onSearchResultsScroll(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement))
        return;
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining < 180) {
        void loadMoreSearchResults();
    }
}
function createFeed() {
    uiError.value = '';
    const createFeedFn = tools.createFeed;
    const feed = typeof createFeedFn === 'function'
        ? createFeedFn(newFeedName.value)
        : fallbackCreateFeed(newFeedName.value);
    if (!feed)
        return;
    newFeedName.value = '';
    renameValue.value = feed.name;
    automation.value = cloneAutomation();
}
function renameActiveFeed() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const renameFeedFn = tools.renameFeed;
    if (typeof renameFeedFn === 'function') {
        renameFeedFn(tools.activeFeed.id, renameValue.value);
    }
    else {
        fallbackRenameFeed(tools.activeFeed.id, renameValue.value);
    }
    renameValue.value = tools.activeFeed.name;
}
async function deleteActiveFeed() {
    showDeleteFeedModal.value = false;
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    isDeletingFeed.value = true;
    const deleteFeedFn = tools.deleteFeed;
    if (typeof deleteFeedFn === 'function') {
        try {
            await deleteFeedFn(tools.activeFeed.id);
            ui.notifySuccess('Feed deleted.');
        }
        catch (error) {
            uiError.value = error.message || 'Failed to delete feed.';
            ui.notifyError(uiError.value);
            return;
        }
        finally {
            isDeletingFeed.value = false;
        }
    }
    else {
        fallbackDeleteFeed(tools.activeFeed.id);
        isDeletingFeed.value = false;
        ui.notifySuccess('Feed deleted.');
    }
    renameValue.value = tools.activeFeed?.name ?? '';
    automation.value = cloneAutomation();
}
function promptDeleteActiveFeed(event) {
    if (!tools.activeFeed)
        return;
    deleteTriggerElement.value = event.currentTarget;
    showDeleteFeedModal.value = true;
}
function cancelDeleteFeed() {
    showDeleteFeedModal.value = false;
}
async function confirmDeleteActiveFeed() {
    await deleteActiveFeed();
}
function clearAllDraftPosts() {
    if (!tools.activeFeed?.draftPosts.length)
        return;
    uiError.value = '';
    const clearDraftFn = tools.clearActiveFeedDraftPosts;
    if (typeof clearDraftFn === 'function') {
        clearDraftFn();
        ui.notifyInfo('Removed all draft posts from active feed.');
        return;
    }
    fallbackClearAllDraftPosts();
    ui.notifyInfo('Removed all draft posts from active feed.');
}
function saveAutomation() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const updateAutomationFn = tools.updateFeedAutomation;
    if (typeof updateAutomationFn === 'function') {
        updateAutomationFn(tools.activeFeed.id, { ...automation.value });
        return;
    }
    fallbackUpdateAutomation(tools.activeFeed.id, { ...automation.value });
}
function saveFeedDetails() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const updateDetailsFn = tools.updateFeedDetails;
    if (typeof updateDetailsFn === 'function') {
        updateDetailsFn(tools.activeFeed.id, {
            description: feedDescription.value,
            iconDataUrl: feedIconPreview.value,
        });
        return;
    }
    fallbackUpdateDetails(tools.activeFeed.id, {
        description: feedDescription.value,
        iconDataUrl: feedIconPreview.value,
    });
}
function togglePost(post) {
    uiError.value = '';
    const isPostInActiveFeedFn = tools.isPostInActiveFeed;
    const removePostFn = tools.removePostFromActiveFeed;
    const addPostFn = tools.addPostToActiveFeed;
    const inFeed = typeof isPostInActiveFeedFn === 'function'
        ? isPostInActiveFeedFn(post.uri)
        : Boolean(tools.activeFeed?.draftPosts.some((item) => item.uri === post.uri));
    if (inFeed) {
        if (typeof removePostFn === 'function') {
            removePostFn(post.uri);
            return;
        }
        fallbackRemovePost(post.uri);
        return;
    }
    if (typeof addPostFn === 'function') {
        addPostFn(post);
        return;
    }
    fallbackAddPost(post);
}
function cloneAutomation() {
    return {
        enabled: tools.activeFeed?.automation.enabled ?? false,
        mode: tools.activeFeed?.automation.mode ?? 'words',
        pattern: tools.activeFeed?.automation.pattern ?? '',
        caseSensitive: tools.activeFeed?.automation.caseSensitive ?? false,
    };
}
function fallbackCreateFeed(name) {
    const trimmed = name.trim();
    if (!trimmed)
        return null;
    const now = new Date().toISOString();
    const feed = {
        id: `feed-${Math.random().toString(36).slice(2, 10)}`,
        name: trimmed,
        description: '',
        publishedDescription: '',
        iconDataUrl: undefined,
        publishedIconDataUrl: undefined,
        automation: { enabled: false, mode: 'words', pattern: '', caseSensitive: false },
        publishedAutomation: {
            enabled: false,
            mode: 'words',
            pattern: '',
            caseSensitive: false,
        },
        draftPosts: [],
        publishedPosts: [],
        isDirty: false,
        lastPublishedAt: undefined,
        blueskyFeedUri: undefined,
        blueskyFeedRkey: undefined,
        lastPublishError: null,
        createdAt: now,
        updatedAt: now,
    };
    if (!Array.isArray(tools.curatedFeeds)) {
        uiError.value = 'Feed store is outdated. Refresh the page to continue.';
        return null;
    }
    tools.curatedFeeds = [feed, ...tools.curatedFeeds];
    tools.activeFeedId = feed.id;
    return feed;
}
function fallbackRenameFeed(feedId, name) {
    const trimmed = name.trim();
    if (!trimmed || !Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => feed.id === feedId ? { ...feed, name: trimmed, updatedAt: new Date().toISOString() } : feed);
}
function fallbackDeleteFeed(feedId) {
    if (!Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.filter((feed) => feed.id !== feedId);
    if (tools.activeFeedId === feedId) {
        tools.activeFeedId = tools.curatedFeeds[0]?.id ?? null;
    }
}
function fallbackUpdateAutomation(feedId, nextAutomation) {
    if (!Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => feed.id === feedId
        ? {
            ...feed,
            automation: { ...nextAutomation },
            isDirty: true,
            updatedAt: new Date().toISOString(),
        }
        : feed);
}
function fallbackUpdateDetails(feedId, details) {
    if (!Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => {
        if (feed.id !== feedId)
            return feed;
        const hasIconField = Object.prototype.hasOwnProperty.call(details, 'iconDataUrl');
        const description = details.description ?? feed.description ?? '';
        const iconDataUrl = details.clearIcon
            ? undefined
            : hasIconField
                ? details.iconDataUrl
                : feed.iconDataUrl;
        const isDirty = description !== (feed.publishedDescription ?? '') ||
            (iconDataUrl || '') !== (feed.publishedIconDataUrl || '') ||
            feed.isDirty;
        return {
            ...feed,
            description,
            iconDataUrl,
            isDirty,
            updatedAt: new Date().toISOString(),
        };
    });
}
function fallbackAddPost(post) {
    if (!tools.activeFeed || !Array.isArray(tools.curatedFeeds))
        return;
    if (tools.activeFeed.draftPosts.some((item) => item.uri === post.uri))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => feed.id === tools.activeFeed?.id
        ? {
            ...feed,
            draftPosts: [post, ...feed.draftPosts],
            isDirty: true,
            updatedAt: new Date().toISOString(),
        }
        : feed);
}
function fallbackRemovePost(uri) {
    if (!tools.activeFeed || !Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => feed.id === tools.activeFeed?.id
        ? {
            ...feed,
            draftPosts: feed.draftPosts.filter((post) => post.uri !== uri),
            isDirty: true,
            updatedAt: new Date().toISOString(),
        }
        : feed);
}
function fallbackClearAllDraftPosts() {
    if (!tools.activeFeed || !Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => feed.id === tools.activeFeed?.id
        ? {
            ...feed,
            draftPosts: [],
            isDirty: true,
            updatedAt: new Date().toISOString(),
        }
        : feed);
}
function publishActiveFeed() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    if (isPublishingFeed.value)
        return;
    const publishFn = tools.publishActiveFeedToBluesky;
    if (typeof publishFn === 'function') {
        isPublishingFeed.value = true;
        publishFn()
            .then(() => {
            ui.notifySuccess('Feed published to Bluesky.');
        })
            .catch((error) => {
            uiError.value = error.message || 'Failed to publish to Bluesky.';
            ui.notifyError(uiError.value);
        })
            .finally(() => {
            isPublishingFeed.value = false;
        });
        return;
    }
    uiError.value = 'Publish is unavailable in this runtime. Refresh the page.';
    ui.notifyError(uiError.value);
}
async function publishContentOnly() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    if (isPushingContent.value)
        return;
    const pushFn = tools.pushActiveFeedContentsOnly;
    if (typeof pushFn !== 'function') {
        uiError.value = 'Publish Content-only is unavailable. Refresh the page.';
        ui.notifyError(uiError.value);
        return;
    }
    isPushingContent.value = true;
    try {
        await pushFn();
        ui.notifySuccess('Feed content pushed.');
    }
    catch (error) {
        uiError.value = error.message || 'Failed to push feed contents.';
        ui.notifyError(uiError.value);
    }
    finally {
        isPushingContent.value = false;
    }
}
function discardChanges() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const discardFn = tools.discardActiveFeedChanges;
    if (typeof discardFn === 'function') {
        discardFn();
        feedDescription.value = tools.activeFeed?.description ?? '';
        feedIconPreview.value = tools.activeFeed?.iconDataUrl;
        return;
    }
    fallbackDiscard();
    feedDescription.value = tools.activeFeed?.description ?? '';
    feedIconPreview.value = tools.activeFeed?.iconDataUrl;
}
function fallbackDiscard() {
    if (!tools.activeFeed || !Array.isArray(tools.curatedFeeds))
        return;
    tools.curatedFeeds = tools.curatedFeeds.map((feed) => feed.id === tools.activeFeed?.id
        ? {
            ...feed,
            draftPosts: [...feed.publishedPosts],
            automation: { ...feed.publishedAutomation },
            description: feed.publishedDescription ?? '',
            iconDataUrl: feed.publishedIconDataUrl,
            isDirty: false,
            updatedAt: new Date().toISOString(),
        }
        : feed);
}
function onFeedIconSelected(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file)
        return;
    if (!file.type.startsWith('image/')) {
        uiError.value = 'Please select an image file for the feed icon.';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        feedIconPreview.value = typeof reader.result === 'string' ? reader.result : undefined;
        saveFeedDetails();
    };
    reader.onerror = () => {
        uiError.value = 'Could not read selected image.';
    };
    reader.readAsDataURL(file);
    target.value = '';
}
function clearFeedIcon() {
    feedIconPreview.value = undefined;
    saveFeedDetails();
}
function isHlsPlaylist(url) {
    return /\.m3u8($|\?)/i.test(url);
}
function cleanupVideoElement(element) {
    const existing = hlsInstances.get(element);
    if (existing) {
        existing.destroy();
        hlsInstances.delete(element);
    }
}
async function ensureHlsModule() {
    if (!hlsLoaderPromise) {
        hlsLoaderPromise = loadHlsFromCdn();
    }
    return hlsLoaderPromise;
}
async function attachVideoSource(element, url) {
    boundVideoUrls.set(element, url);
    cleanupVideoElement(element);
    if (!isHlsPlaylist(url)) {
        element.src = url;
        return;
    }
    const Hls = await ensureHlsModule();
    if (Hls && boundVideoUrls.get(element) === url) {
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(element);
            hlsInstances.set(element, hls);
            return;
        }
    }
    if (element.canPlayType('application/vnd.apple.mpegurl')) {
        element.src = url;
        return;
    }
    element.removeAttribute('src');
    element.load();
}
function bindVideoElement(element, url) {
    if (!(element instanceof HTMLVideoElement))
        return;
    const currentUrl = boundVideoUrls.get(element);
    if (currentUrl === url)
        return;
    void attachVideoSource(element, url);
}
function loadHlsFromCdn() {
    if (typeof window === 'undefined')
        return Promise.resolve(null);
    if (window.Hls)
        return Promise.resolve(window.Hls);
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js';
        script.async = true;
        script.onload = () => resolve(window.Hls ?? null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });
}
function openAuthorDropdown() {
    isAuthorDropdownOpen.value = true;
}
function closeAuthorDropdown() {
    isAuthorDropdownOpen.value = false;
}
function moveAuthorHighlight(step) {
    if (!isAuthorDropdownOpen.value) {
        isAuthorDropdownOpen.value = true;
    }
    const count = tools.actorSearchResults.length;
    if (!count)
        return;
    const next = highlightedAuthorIndex.value + step;
    if (next < 0) {
        highlightedAuthorIndex.value = count - 1;
        return;
    }
    if (next >= count) {
        highlightedAuthorIndex.value = 0;
        return;
    }
    highlightedAuthorIndex.value = next;
}
async function selectAuthor(actor) {
    author.value = actor.handle;
    isAuthorDropdownOpen.value = false;
}
async function selectHighlightedAuthor() {
    if (!showAuthorDropdown.value)
        return;
    const actor = tools.actorSearchResults[highlightedAuthorIndex.value];
    if (!actor)
        return;
    await selectAuthor(actor);
}
function onDocumentClick(event) {
    const container = authorSearchContainer.value;
    if (!container)
        return;
    if (!container.contains(event.target)) {
        closeAuthorDropdown();
    }
}
function onDeleteModalKeydown(event) {
    if (!showDeleteFeedModal.value)
        return;
    if (event.key === 'Escape') {
        event.preventDefault();
        cancelDeleteFeed();
        return;
    }
    if (event.key !== 'Tab')
        return;
    const focusables = [deleteCancelButton.value, deleteConfirmButton.value].filter((element) => Boolean(element));
    if (!focusables.length)
        return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
    }
    if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString();
}
function initials(name) {
    return name.trim().charAt(0).toUpperCase() || '?';
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {[typeof AppLayout, typeof AppLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AppLayout, new AppLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "space-y-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-xl font-semibold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-slate-600 dark:text-slate-400" },
});
if (__VLS_ctx.uiError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2 text-sm text-rose-600" },
    });
    (__VLS_ctx.uiError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-4 lg:grid-cols-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "font-semibold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (__VLS_ctx.createFeed) },
    ...{ class: "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" },
    placeholder: "New feed name",
});
(__VLS_ctx.newFeedName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createFeed) },
    ...{ class: "rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
for (const [feed] of __VLS_getVForSourceType((__VLS_ctx.tools.curatedFeeds))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.tools.setActiveFeed(feed.id);
            } },
        key: (feed.id),
        type: "button",
        ...{ class: "w-full rounded-md border px-3 py-2 text-left" },
        ...{ class: (feed.id === __VLS_ctx.tools.activeFeedId ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-700') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "truncate text-sm font-medium" },
    });
    (feed.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-slate-500" },
    });
    (feed.draftPosts.length);
    if (feed.isDirty) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-amber-600 dark:text-amber-400" },
        });
    }
}
if (__VLS_ctx.tools.activeFeed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onKeyup: (__VLS_ctx.renameActiveFeed) },
        ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" },
    });
    (__VLS_ctx.renameValue);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.renameActiveFeed) },
        ...{ class: "rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.promptDeleteActiveFeed) },
        ...{ class: "rounded-md border border-rose-400 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:text-rose-300" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "font-semibold" },
});
(__VLS_ctx.tools.activeFeed?.name || 'Selected Feed');
if (__VLS_ctx.tools.activeFeed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "font-medium" },
    });
    (__VLS_ctx.tools.activeFeed.isDirty ? 'Draft changes pending' : 'Published state up to date');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-slate-500" },
    });
    (__VLS_ctx.tools.activeFeed.lastPublishedAt ? __VLS_ctx.formatDateTime(__VLS_ctx.tools.activeFeed.lastPublishedAt) : 'Never');
    if (__VLS_ctx.tools.activeFeed.blueskyFeedUri) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-xs text-slate-500 break-all" },
        });
        (__VLS_ctx.tools.activeFeed.blueskyFeedUri);
    }
    if (__VLS_ctx.tools.activeFeed.lastPublishError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-xs text-rose-600" },
        });
        (__VLS_ctx.tools.activeFeed.lastPublishError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2 flex flex-wrap gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.publishActiveFeed) },
        ...{ class: "rounded-md border border-emerald-500 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700 dark:text-emerald-300" },
        disabled: (!__VLS_ctx.tools.activeFeed.isDirty || __VLS_ctx.isPublishingFeed),
    });
    (__VLS_ctx.isPublishingFeed ? 'Publishing...' : 'Publish');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.publishContentOnly) },
        ...{ class: "rounded-md border border-sky-500 px-3 py-2 text-xs text-sky-700 dark:border-sky-700 dark:text-sky-300" },
        disabled: (!__VLS_ctx.tools.activeFeed.blueskyFeedUri || __VLS_ctx.isPushingContent),
        title: "Push current post list to the feed generator without updating the Bluesky record",
    });
    (__VLS_ctx.isPushingContent ? 'Pushing...' : 'Publish Content-only');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.discardChanges) },
        ...{ class: "rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700" },
        disabled: (!__VLS_ctx.tools.activeFeed.isDirty || __VLS_ctx.isPublishingFeed || __VLS_ctx.isPushingContent),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-slate-200 dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tools.activeFeed))
                    return;
                __VLS_ctx.isDetailsOpen = !__VLS_ctx.isDetailsOpen;
            } },
        type: "button",
        ...{ class: "flex w-full items-center justify-between px-3 py-2 text-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm font-medium" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs text-slate-500" },
    });
    (__VLS_ctx.isDetailsOpen ? 'Hide' : 'Show');
    if (__VLS_ctx.isDetailsOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "border-t border-slate-200 px-3 py-3 dark:border-slate-700" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            ...{ onBlur: (__VLS_ctx.saveFeedDetails) },
            value: (__VLS_ctx.feedDescription),
            rows: "3",
            ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
            placeholder: "Describe what this feed is about",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 flex items-center gap-3" },
        });
        if (__VLS_ctx.feedIconPreview) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.feedIconPreview),
                alt: "Feed icon preview",
                ...{ class: "h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.onFeedIconSelected) },
            ...{ class: "hidden" },
            type: "file",
            accept: "image/*",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearFeedIcon) },
            ...{ class: "rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700" },
            type: "button",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-slate-200 dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tools.activeFeed))
                    return;
                __VLS_ctx.isAutomationOpen = !__VLS_ctx.isAutomationOpen;
            } },
        type: "button",
        ...{ class: "flex w-full items-center justify-between px-3 py-2 text-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm font-medium" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs text-slate-500" },
    });
    (__VLS_ctx.isAutomationOpen ? 'Hide' : 'Show');
    if (__VLS_ctx.isAutomationOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "border-t border-slate-200 px-3 py-3 dark:border-slate-700" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "inline-flex items-center gap-2 text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.saveAutomation) },
            type: "checkbox",
        });
        (__VLS_ctx.automation.enabled);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 grid gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.saveAutomation) },
            value: (__VLS_ctx.automation.mode),
            ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "words",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "regex",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-sm" },
        });
        (__VLS_ctx.automation.mode === 'words' ? 'Words (comma separated)' : 'Regex pattern');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onBlur: (__VLS_ctx.saveAutomation) },
            ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
            placeholder: (__VLS_ctx.automation.mode === 'words' ? 'vue, typescript, design' : '(vue|nuxt)\\s+3'),
        });
        (__VLS_ctx.automation.pattern);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "inline-flex items-center gap-2 text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.saveAutomation) },
            type: "checkbox",
        });
        (__VLS_ctx.automation.caseSensitive);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2 flex items-center justify-between gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm font-medium" },
    });
    (__VLS_ctx.tools.activeFeed.draftPosts.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearAllDraftPosts) },
        ...{ class: "text-xs text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400" },
        disabled: (!__VLS_ctx.tools.activeFeed.draftPosts.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    for (const [post] of __VLS_getVForSourceType((__VLS_ctx.tools.activeFeed.draftPosts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (post.uri),
            ...{ class: "rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center gap-3" },
        });
        if (post.authorAvatar) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (post.authorAvatar),
                alt: (post.authorDisplayName || post.authorHandle),
                ...{ class: "h-9 w-9 rounded-full object-cover" },
                loading: "lazy",
                referrerpolicy: "no-referrer",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100" },
            });
            (__VLS_ctx.initials(post.authorDisplayName || post.authorHandle));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "min-w-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "truncate font-medium" },
        });
        (post.authorDisplayName || post.authorHandle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "truncate text-xs text-slate-500" },
        });
        (post.authorHandle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 line-clamp-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300" },
        });
        (post.text);
        if (post.media?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 space-y-2" },
            });
            for (const [media, index] of __VLS_getVForSourceType((post.media))) {
                (`${post.uri}-${index}-${media.url}`);
                if (media.type === 'image') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                        src: (media.url),
                        alt: (media.alt || 'Post image'),
                        ...{ class: "max-h-72 w-full rounded-md border border-slate-200 object-cover dark:border-slate-700" },
                        loading: "lazy",
                        referrerpolicy: "no-referrer",
                    });
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                        ...{ class: "max-h-80 w-full rounded-md border border-slate-200 bg-black dark:border-slate-700" },
                        ref: ((element) => __VLS_ctx.bindVideoElement(element, media.url)),
                        controls: true,
                        playsinline: true,
                        poster: (media.thumb),
                        preload: "metadata",
                    });
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tools.activeFeed))
                        return;
                    __VLS_ctx.tools.removePostFromActiveFeed(post.uri);
                } },
            ...{ class: "mt-2 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "font-semibold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-3 md:grid-cols-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    placeholder: "keyword or phrase",
});
(__VLS_ctx.query);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "authorSearchContainer",
    ...{ class: "relative mt-1" },
});
/** @type {typeof __VLS_ctx.authorSearchContainer} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onFocus: (__VLS_ctx.openAuthorDropdown) },
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.moveAuthorHighlight(1);
        } },
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.moveAuthorHighlight(-1);
        } },
    ...{ onKeydown: (__VLS_ctx.selectHighlightedAuthor) },
    ...{ onKeydown: (__VLS_ctx.closeAuthorDropdown) },
    ...{ class: "w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    placeholder: "alice.bsky.social",
});
(__VLS_ctx.author);
if (__VLS_ctx.showAuthorDropdown) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900" },
    });
    if (__VLS_ctx.isSearchingAuthors) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "px-3 py-2 text-xs text-slate-500 dark:text-slate-400" },
        });
    }
    for (const [actor] of __VLS_getVForSourceType((__VLS_ctx.tools.actorSearchResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showAuthorDropdown))
                        return;
                    __VLS_ctx.selectAuthor(actor);
                } },
            ...{ onMouseenter: (...[$event]) => {
                    if (!(__VLS_ctx.showAuthorDropdown))
                        return;
                    __VLS_ctx.highlightedAuthorIndex = __VLS_ctx.tools.actorSearchResults.findIndex((item) => item.did === actor.did);
                } },
            key: (actor.did),
            type: "button",
            ...{ class: "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800" },
            ...{ class: ({ 'bg-slate-50 dark:bg-slate-800': actor.did === __VLS_ctx.highlightedAuthorDid }) },
        });
        if (actor.avatar) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (actor.avatar),
                alt: (actor.displayName || actor.handle),
                ...{ class: "h-8 w-8 rounded-full object-cover" },
                loading: "lazy",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100" },
            });
            (__VLS_ctx.initials(actor.displayName || actor.handle));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "min-w-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "truncate font-medium" },
        });
        (actor.displayName || actor.handle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "truncate text-xs text-slate-500" },
        });
        (actor.handle);
    }
    if (!__VLS_ctx.isSearchingAuthors && __VLS_ctx.author.trim().length >= 2 && !__VLS_ctx.tools.actorSearchResults.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "px-3 py-2 text-xs text-slate-500 dark:text-slate-400" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.search) },
    ...{ class: "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900" },
    disabled: (__VLS_ctx.isSearching),
});
(__VLS_ctx.isSearching ? 'Searching...' : 'Search');
if (__VLS_ctx.isSearching) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-slate-600 dark:text-slate-300" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onScroll: (__VLS_ctx.onSearchResultsScroll) },
    ...{ class: "max-h-[70vh] space-y-2 overflow-y-auto pr-1" },
});
for (const [post] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (post.uri),
        ...{ class: "rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center gap-3" },
    });
    if (post.authorAvatar) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (post.authorAvatar),
            alt: (post.authorDisplayName || post.authorHandle),
            ...{ class: "h-9 w-9 rounded-full object-cover" },
            loading: "lazy",
            referrerpolicy: "no-referrer",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100" },
        });
        (__VLS_ctx.initials(post.authorDisplayName || post.authorHandle));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "min-w-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "truncate font-medium" },
    });
    (post.authorDisplayName || post.authorHandle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "truncate text-xs text-slate-500" },
    });
    (post.authorHandle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300" },
    });
    (post.text || '(No text content)');
    if (post.media?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 space-y-2" },
        });
        for (const [media, index] of __VLS_getVForSourceType((post.media))) {
            (`${post.uri}-${index}-${media.url}`);
            if (media.type === 'image') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (media.url),
                    alt: (media.alt || 'Post image'),
                    ...{ class: "max-h-72 w-full rounded-md border border-slate-200 object-cover dark:border-slate-700" },
                    loading: "lazy",
                    referrerpolicy: "no-referrer",
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                    ...{ class: "max-h-80 w-full rounded-md border border-slate-200 bg-black dark:border-slate-700" },
                    ref: ((element) => __VLS_ctx.bindVideoElement(element, media.url)),
                    controls: true,
                    playsinline: true,
                    poster: (media.thumb),
                    preload: "metadata",
                });
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.togglePost(post);
            } },
        ...{ class: "mt-3 rounded border px-2 py-1 text-xs" },
        ...{ class: (__VLS_ctx.tools.isPostInActiveFeed(post.uri) ? 'border-rose-400 text-rose-700 dark:border-rose-700 dark:text-rose-300' : 'border-slate-300 dark:border-slate-700') },
    });
    (__VLS_ctx.tools.isPostInActiveFeed(post.uri) ? 'Remove from feed' : 'Add to feed');
}
if (__VLS_ctx.isLoadingMore) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "py-2 text-center text-xs text-slate-500" },
    });
}
else if (__VLS_ctx.searchResults.length && !__VLS_ctx.hasMoreSearchResults) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "py-2 text-center text-xs text-slate-500" },
    });
}
if (__VLS_ctx.showDeleteFeedModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.cancelDeleteFeed) },
        ...{ class: "fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4" },
        role: "presentation",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "delete-feed-title",
        'aria-describedby': "delete-feed-description",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        id: "delete-feed-title",
        ...{ class: "text-base font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        id: "delete-feed-description",
        ...{ class: "mt-2 text-sm text-slate-600 dark:text-slate-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "font-medium" },
    });
    (__VLS_ctx.tools.activeFeed?.name || 'this feed');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-4 flex justify-end gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelDeleteFeed) },
        ref: "deleteCancelButton",
        ...{ class: "rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" },
    });
    /** @type {typeof __VLS_ctx.deleteCancelButton} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmDeleteActiveFeed) },
        ref: "deleteConfirmButton",
        ...{ class: "rounded-md border border-rose-500 px-3 py-2 text-sm text-rose-700 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300" },
        disabled: (__VLS_ctx.isDeletingFeed),
    });
    /** @type {typeof __VLS_ctx.deleteConfirmButton} */ ;
    (__VLS_ctx.isDeletingFeed ? 'Deleting...' : 'Delete feed');
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-rose-600']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-span-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-rose-400']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-rose-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-rose-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-rose-300']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-span-5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['break-all']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-rose-600']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-sky-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-sky-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-rose-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-rose-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-9']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-9']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['line-clamp-4']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['z-20']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-slate-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[70vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['pr-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-9']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-9']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-rose-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-rose-700']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-rose-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-rose-300']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppLayout: AppLayout,
            tools: tools,
            query: query,
            author: author,
            searchResults: searchResults,
            hasMoreSearchResults: hasMoreSearchResults,
            isLoadingMore: isLoadingMore,
            authorSearchContainer: authorSearchContainer,
            isSearchingAuthors: isSearchingAuthors,
            highlightedAuthorIndex: highlightedAuthorIndex,
            newFeedName: newFeedName,
            renameValue: renameValue,
            automation: automation,
            feedDescription: feedDescription,
            feedIconPreview: feedIconPreview,
            isDetailsOpen: isDetailsOpen,
            isAutomationOpen: isAutomationOpen,
            isSearching: isSearching,
            showDeleteFeedModal: showDeleteFeedModal,
            isPublishingFeed: isPublishingFeed,
            isPushingContent: isPushingContent,
            isDeletingFeed: isDeletingFeed,
            uiError: uiError,
            deleteCancelButton: deleteCancelButton,
            deleteConfirmButton: deleteConfirmButton,
            showAuthorDropdown: showAuthorDropdown,
            highlightedAuthorDid: highlightedAuthorDid,
            search: search,
            onSearchResultsScroll: onSearchResultsScroll,
            createFeed: createFeed,
            renameActiveFeed: renameActiveFeed,
            promptDeleteActiveFeed: promptDeleteActiveFeed,
            cancelDeleteFeed: cancelDeleteFeed,
            confirmDeleteActiveFeed: confirmDeleteActiveFeed,
            clearAllDraftPosts: clearAllDraftPosts,
            saveAutomation: saveAutomation,
            saveFeedDetails: saveFeedDetails,
            togglePost: togglePost,
            publishActiveFeed: publishActiveFeed,
            publishContentOnly: publishContentOnly,
            discardChanges: discardChanges,
            onFeedIconSelected: onFeedIconSelected,
            clearFeedIcon: clearFeedIcon,
            bindVideoElement: bindVideoElement,
            openAuthorDropdown: openAuthorDropdown,
            closeAuthorDropdown: closeAuthorDropdown,
            moveAuthorHighlight: moveAuthorHighlight,
            selectAuthor: selectAuthor,
            selectHighlightedAuthor: selectHighlightedAuthor,
            formatDateTime: formatDateTime,
            initials: initials,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
