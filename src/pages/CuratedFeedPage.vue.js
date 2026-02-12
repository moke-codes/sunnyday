import { ref, watch } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import { useToolsStore } from '@/stores/tools';
const tools = useToolsStore();
const query = ref('');
const author = ref('');
const searchResults = ref([]);
const newFeedName = ref('');
const renameValue = ref(tools.activeFeed?.name ?? '');
const automation = ref(cloneAutomation());
const feedDescription = ref(tools.activeFeed?.description ?? '');
const feedIconPreview = ref(tools.activeFeed?.iconDataUrl);
const uiError = ref('');
watch(() => tools.activeFeedId, () => {
    renameValue.value = tools.activeFeed?.name ?? '';
    feedDescription.value = tools.activeFeed?.description ?? '';
    feedIconPreview.value = tools.activeFeed?.iconDataUrl;
    automation.value = cloneAutomation();
}, { immediate: true });
async function search() {
    searchResults.value = await tools.searchPosts(query.value, author.value || undefined);
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
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const deleteFeedFn = tools.deleteFeed;
    if (typeof deleteFeedFn === 'function') {
        try {
            await deleteFeedFn(tools.activeFeed.id);
        }
        catch (error) {
            uiError.value = error.message || 'Failed to delete feed.';
            return;
        }
    }
    else {
        fallbackDeleteFeed(tools.activeFeed.id);
    }
    renameValue.value = tools.activeFeed?.name ?? '';
    automation.value = cloneAutomation();
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
function publishActiveFeed() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const publishFn = tools.publishActiveFeedToBluesky;
    if (typeof publishFn === 'function') {
        publishFn().catch((error) => {
            uiError.value = error.message || 'Failed to publish to Bluesky.';
        });
        return;
    }
    uiError.value = 'Publish is unavailable in this runtime. Refresh the page.';
}
async function publishContentOnly() {
    if (!tools.activeFeed)
        return;
    uiError.value = '';
    const pushFn = tools.pushActiveFeedContentsOnly;
    if (typeof pushFn !== 'function') {
        uiError.value = 'Publish Content-only is unavailable. Refresh the page.';
        return;
    }
    try {
        await pushFn();
    }
    catch (error) {
        uiError.value = error.message || 'Failed to push feed contents.';
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
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString();
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
        ...{ onClick: (__VLS_ctx.deleteActiveFeed) },
        ...{ class: "rounded-md border border-rose-400 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:text-rose-300" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    placeholder: "alice.bsky.social",
});
(__VLS_ctx.author);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.search) },
    ...{ class: "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
for (const [post] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (post.uri),
        ...{ class: "rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "font-medium" },
    });
    (post.authorHandle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300" },
    });
    (post.text || '(No text content)');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.togglePost(post);
            } },
        ...{ class: "mt-3 rounded border px-2 py-1 text-xs" },
        ...{ class: (__VLS_ctx.tools.isPostInActiveFeed(post.uri) ? 'border-rose-400 text-rose-700 dark:border-rose-700 dark:text-rose-300' : 'border-slate-300 dark:border-slate-700') },
    });
    (__VLS_ctx.tools.isPostInActiveFeed(post.uri) ? 'Remove from feed' : 'Add to feed');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "font-semibold" },
});
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
        disabled: (!__VLS_ctx.tools.activeFeed.isDirty || __VLS_ctx.tools.loading),
    });
    (__VLS_ctx.tools.loading ? 'Publishing...' : 'Publish');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.publishContentOnly) },
        ...{ class: "rounded-md border border-sky-500 px-3 py-2 text-xs text-sky-700 dark:border-sky-700 dark:text-sky-300" },
        disabled: (!__VLS_ctx.tools.activeFeed.blueskyFeedUri || __VLS_ctx.tools.loading),
        title: "Push current post list to the feed generator without updating the Bluesky record",
    });
    (__VLS_ctx.tools.loading ? 'Pushing...' : 'Publish Content-only');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.discardChanges) },
        ...{ class: "rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700" },
        disabled: (!__VLS_ctx.tools.activeFeed.isDirty || __VLS_ctx.tools.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-slate-200 p-3 dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm font-medium" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "mt-2 block text-sm" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-slate-200 p-3 dark:border-slate-700" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm font-medium" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "mt-2 inline-flex items-center gap-2 text-sm" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-2 text-sm font-medium" },
    });
    (__VLS_ctx.tools.activeFeed.draftPosts.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    for (const [post] of __VLS_getVForSourceType((__VLS_ctx.tools.activeFeed.draftPosts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (post.uri),
            ...{ class: "rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "font-medium" },
        });
        (post.authorHandle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 line-clamp-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300" },
        });
        (post.text);
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
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
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
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['line-clamp-4']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppLayout: AppLayout,
            tools: tools,
            query: query,
            author: author,
            searchResults: searchResults,
            newFeedName: newFeedName,
            renameValue: renameValue,
            automation: automation,
            feedDescription: feedDescription,
            feedIconPreview: feedIconPreview,
            uiError: uiError,
            search: search,
            createFeed: createFeed,
            renameActiveFeed: renameActiveFeed,
            deleteActiveFeed: deleteActiveFeed,
            saveAutomation: saveAutomation,
            saveFeedDetails: saveFeedDetails,
            togglePost: togglePost,
            publishActiveFeed: publishActiveFeed,
            publishContentOnly: publishContentOnly,
            discardChanges: discardChanges,
            onFeedIconSelected: onFeedIconSelected,
            clearFeedIcon: clearFeedIcon,
            formatDateTime: formatDateTime,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
