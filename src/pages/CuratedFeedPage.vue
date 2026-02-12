<template>
  <AppLayout>
    <section class="space-y-5">
      <header>
        <h2 class="text-xl font-semibold">Curated Feed Workspace</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Manage multiple feeds, configure automation rules, and curate posts from search.
        </p>
        <p v-if="uiError" class="mt-2 text-sm text-rose-600">{{ uiError }}</p>
      </header>

      <div class="grid gap-4 lg:grid-cols-12">
        <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <h3 class="font-semibold">Feeds</h3>
          <div class="flex gap-2">
            <input
              v-model="newFeedName"
              class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              placeholder="New feed name"
              @keyup.enter="createFeed"
            />
            <button class="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="createFeed">
              Add
            </button>
          </div>

          <div class="space-y-2">
            <button
              v-for="feed in tools.curatedFeeds"
              :key="feed.id"
              type="button"
              class="w-full rounded-md border px-3 py-2 text-left"
              :class="feed.id === tools.activeFeedId ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-700'"
              @click="tools.setActiveFeed(feed.id)"
            >
              <p class="truncate text-sm font-medium">{{ feed.name }}</p>
              <p class="text-xs text-slate-500">{{ feed.draftPosts.length }} draft posts</p>
              <p v-if="feed.isDirty" class="text-xs text-amber-600 dark:text-amber-400">Unpublished changes</p>
            </button>
          </div>

          <div v-if="tools.activeFeed" class="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <label class="block text-sm">
              Rename active feed
              <input
                v-model="renameValue"
                class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                @keyup.enter="renameActiveFeed"
              />
            </label>
            <div class="flex gap-2">
              <button class="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="renameActiveFeed">Rename</button>
              <button class="rounded-md border border-rose-400 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:text-rose-300" @click="promptDeleteActiveFeed">Delete</button>
            </div>
          </div>
        </aside>

        <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <h3 class="font-semibold">{{ tools.activeFeed?.name || 'Selected Feed' }}</h3>

          <div v-if="tools.activeFeed" class="space-y-3">
            <div class="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p class="font-medium">{{ tools.activeFeed.isDirty ? 'Draft changes pending' : 'Published state up to date' }}</p>
              <p class="text-xs text-slate-500">
                Last published:
                {{ tools.activeFeed.lastPublishedAt ? formatDateTime(tools.activeFeed.lastPublishedAt) : 'Never' }}
              </p>
              <p v-if="tools.activeFeed.blueskyFeedUri" class="mt-1 text-xs text-slate-500 break-all">
                Bluesky URI: {{ tools.activeFeed.blueskyFeedUri }}
              </p>
              <p v-if="tools.activeFeed.lastPublishError" class="mt-1 text-xs text-rose-600">
                {{ tools.activeFeed.lastPublishError }}
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  class="rounded-md border border-emerald-500 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                  :disabled="!tools.activeFeed.isDirty || tools.loading"
                  @click="publishActiveFeed"
                >
                  {{ tools.loading ? 'Publishing...' : 'Publish' }}
                </button>
                <button
                  class="rounded-md border border-sky-500 px-3 py-2 text-xs text-sky-700 dark:border-sky-700 dark:text-sky-300"
                  :disabled="!tools.activeFeed.blueskyFeedUri || tools.loading"
                  title="Push current post list to the feed generator without updating the Bluesky record"
                  @click="publishContentOnly"
                >
                  {{ tools.loading ? 'Pushing...' : 'Publish Content-only' }}
                </button>
                <button
                  class="rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700"
                  :disabled="!tools.activeFeed.isDirty || tools.loading"
                  @click="discardChanges"
                >
                  Discard changes
                </button>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left"
                @click="isDetailsOpen = !isDetailsOpen"
              >
                <p class="text-sm font-medium">Feed details</p>
                <span class="text-xs text-slate-500">{{ isDetailsOpen ? 'Hide' : 'Show' }}</span>
              </button>
              <div v-if="isDetailsOpen" class="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                <label class="block text-sm">
                  Description (optional)
                  <textarea
                    v-model="feedDescription"
                    rows="3"
                    class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Describe what this feed is about"
                    @blur="saveFeedDetails"
                  />
                </label>

                <div class="mt-2 flex items-center gap-3">
                  <img
                    v-if="feedIconPreview"
                    :src="feedIconPreview"
                    alt="Feed icon preview"
                    class="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <div
                    v-else
                    class="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    No icon
                  </div>
                  <div class="flex gap-2">
                    <label class="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700">
                      Select icon
                      <input
                        class="hidden"
                        type="file"
                        accept="image/*"
                        @change="onFeedIconSelected"
                      />
                    </label>
                    <button
                      class="rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700"
                      type="button"
                      @click="clearFeedIcon"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left"
                @click="isAutomationOpen = !isAutomationOpen"
              >
                <p class="text-sm font-medium">Automation</p>
                <span class="text-xs text-slate-500">{{ isAutomationOpen ? 'Hide' : 'Show' }}</span>
              </button>
              <div v-if="isAutomationOpen" class="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                <label class="inline-flex items-center gap-2 text-sm">
                  <input v-model="automation.enabled" type="checkbox" @change="saveAutomation" />
                  Enable automation
                </label>

                <div class="mt-2 grid gap-2">
                  <label class="text-sm">
                    Mode
                    <select v-model="automation.mode" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" @change="saveAutomation">
                      <option value="words">Words</option>
                      <option value="regex">Regular expression</option>
                    </select>
                  </label>

                  <label class="text-sm">
                    {{ automation.mode === 'words' ? 'Words (comma separated)' : 'Regex pattern' }}
                    <input
                      v-model="automation.pattern"
                      class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                      :placeholder="automation.mode === 'words' ? 'vue, typescript, design' : '(vue|nuxt)\\s+3'"
                      @blur="saveAutomation"
                    />
                  </label>

                  <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="automation.caseSensitive" type="checkbox" @change="saveAutomation" />
                    Case sensitive
                  </label>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="text-sm font-medium">
                  Draft curated posts ({{ tools.activeFeed.draftPosts.length }})
                </p>
                <button
                  class="text-xs text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400"
                  :disabled="!tools.activeFeed.draftPosts.length"
                  @click="clearAllDraftPosts"
                >
                  Remove all
                </button>
              </div>
              <div class="space-y-2">
                <article v-for="post in tools.activeFeed.draftPosts" :key="post.uri" class="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="post.authorAvatar"
                      :src="post.authorAvatar"
                      :alt="post.authorDisplayName || post.authorHandle"
                      class="h-9 w-9 rounded-full object-cover"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <div
                      v-else
                      class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {{ initials(post.authorDisplayName || post.authorHandle) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium">{{ post.authorDisplayName || post.authorHandle }}</p>
                      <p class="truncate text-xs text-slate-500">@{{ post.authorHandle }}</p>
                    </div>
                  </div>
                  <p class="mt-1 line-clamp-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{{ post.text }}</p>

                  <div v-if="post.media?.length" class="mt-2 space-y-2">
                    <template v-for="(media, index) in post.media" :key="`${post.uri}-${index}-${media.url}`">
                      <img
                        v-if="media.type === 'image'"
                        :src="media.url"
                        :alt="media.alt || 'Post image'"
                        class="max-h-72 w-full rounded-md border border-slate-200 object-cover dark:border-slate-700"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />
                      <video
                        v-else
                        class="max-h-80 w-full rounded-md border border-slate-200 bg-black dark:border-slate-700"
                        :ref="(element) => bindVideoElement(element, media.url)"
                        controls
                        playsinline
                        :poster="media.thumb"
                        preload="metadata"
                      ></video>
                    </template>
                  </div>

                  <button class="mt-2 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="tools.removePostFromActiveFeed(post.uri)">
                    Remove
                  </button>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <h3 class="font-semibold">Search Posts</h3>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Query
              <input v-model="query" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="keyword or phrase" />
            </label>
            <label class="text-sm">
              Author handle (optional)
              <div ref="authorSearchContainer" class="relative mt-1">
                <input
                  v-model="author"
                  class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="alice.bsky.social"
                  @focus="openAuthorDropdown"
                  @keydown.down.prevent="moveAuthorHighlight(1)"
                  @keydown.up.prevent="moveAuthorHighlight(-1)"
                  @keydown.enter.prevent="selectHighlightedAuthor"
                  @keydown.esc.prevent="closeAuthorDropdown"
                />

                <div
                  v-if="showAuthorDropdown"
                  class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                >
                  <div v-if="isSearchingAuthors" class="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                    Searching...
                  </div>
                  <button
                    v-for="actor in tools.actorSearchResults"
                    :key="actor.did"
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    :class="{ 'bg-slate-50 dark:bg-slate-800': actor.did === highlightedAuthorDid }"
                    @click="selectAuthor(actor)"
                    @mouseenter="highlightedAuthorIndex = tools.actorSearchResults.findIndex((item) => item.did === actor.did)"
                  >
                    <img
                      v-if="actor.avatar"
                      :src="actor.avatar"
                      :alt="actor.displayName || actor.handle"
                      class="h-8 w-8 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {{ initials(actor.displayName || actor.handle) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium">{{ actor.displayName || actor.handle }}</p>
                      <p class="truncate text-xs text-slate-500">@{{ actor.handle }}</p>
                    </div>
                  </button>
                  <div
                    v-if="!isSearchingAuthors && author.trim().length >= 2 && !tools.actorSearchResults.length"
                    class="px-3 py-2 text-xs text-slate-500 dark:text-slate-400"
                  >
                    No users found.
                  </div>
                </div>
              </div>
            </label>
          </div>

          <button
            class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900"
            :disabled="isSearching"
            @click="search"
          >
            {{ isSearching ? 'Searching...' : 'Search' }}
          </button>
          <p v-if="isSearching" class="text-sm text-slate-600 dark:text-slate-300">Loading posts...</p>
          <div
            class="max-h-[70vh] space-y-2 overflow-y-auto pr-1"
            @scroll.passive="onSearchResultsScroll"
          >
            <article v-for="post in searchResults" :key="post.uri" class="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div class="flex items-center gap-3">
                <img
                  v-if="post.authorAvatar"
                  :src="post.authorAvatar"
                  :alt="post.authorDisplayName || post.authorHandle"
                  class="h-9 w-9 rounded-full object-cover"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <div
                  v-else
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                >
                  {{ initials(post.authorDisplayName || post.authorHandle) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ post.authorDisplayName || post.authorHandle }}</p>
                  <p class="truncate text-xs text-slate-500">@{{ post.authorHandle }}</p>
                </div>
              </div>
              <p class="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{{ post.text || '(No text content)' }}</p>

              <div v-if="post.media?.length" class="mt-2 space-y-2">
                <template v-for="(media, index) in post.media" :key="`${post.uri}-${index}-${media.url}`">
                  <img
                    v-if="media.type === 'image'"
                    :src="media.url"
                    :alt="media.alt || 'Post image'"
                    class="max-h-72 w-full rounded-md border border-slate-200 object-cover dark:border-slate-700"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <video
                    v-else
                    class="max-h-80 w-full rounded-md border border-slate-200 bg-black dark:border-slate-700"
                    :ref="(element) => bindVideoElement(element, media.url)"
                    controls
                    playsinline
                    :poster="media.thumb"
                    preload="metadata"
                  ></video>
                </template>
              </div>

              <button
                class="mt-3 rounded border px-2 py-1 text-xs"
                :class="tools.isPostInActiveFeed(post.uri) ? 'border-rose-400 text-rose-700 dark:border-rose-700 dark:text-rose-300' : 'border-slate-300 dark:border-slate-700'"
                @click="togglePost(post)"
              >
                {{ tools.isPostInActiveFeed(post.uri) ? 'Remove from feed' : 'Add to feed' }}
              </button>
            </article>
            <p v-if="isLoadingMore" class="py-2 text-center text-xs text-slate-500">
              Loading more posts...
            </p>
            <p
              v-else-if="searchResults.length && !hasMoreSearchResults"
              class="py-2 text-center text-xs text-slate-500"
            >
              End of results
            </p>
          </div>
        </section>
      </div>

      <div
        v-if="showDeleteFeedModal"
        class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
        @click.self="cancelDeleteFeed"
      >
        <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <h4 class="text-base font-semibold">Delete Feed?</h4>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This will delete <span class="font-medium">{{ tools.activeFeed?.name || 'this feed' }}</span>.
            If published, we will also attempt to remove it from Bluesky.
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="cancelDeleteFeed">
              Cancel
            </button>
            <button
              class="rounded-md border border-rose-500 px-3 py-2 text-sm text-rose-700 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300"
              :disabled="tools.loading"
              @click="confirmDeleteActiveFeed"
            >
              {{ tools.loading ? 'Deleting...' : 'Delete feed' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import { useToolsStore } from '@/stores/tools';
import type { ActorSearchResult, CuratedPost, FeedAutomationConfig } from '@/types/bluesky';

const tools = useToolsStore();
const query = ref('');
const author = ref('');
const searchResults = ref<CuratedPost[]>([]);
const searchCursor = ref<string | null>(null);
const hasMoreSearchResults = ref(false);
const isLoadingMore = ref(false);
const authorSearchContainer = ref<HTMLElement | null>(null);
const isAuthorDropdownOpen = ref(false);
const isSearchingAuthors = ref(false);
const highlightedAuthorIndex = ref(-1);
let authorSearchTimer: number | undefined;
const newFeedName = ref('');
const renameValue = ref(tools.activeFeed?.name ?? '');
const automation = ref<FeedAutomationConfig>(cloneAutomation());
const feedDescription = ref(tools.activeFeed?.description ?? '');
const feedIconPreview = ref<string | undefined>(tools.activeFeed?.iconDataUrl);
const isDetailsOpen = ref(false);
const isAutomationOpen = ref(false);
const isSearching = ref(false);
const showDeleteFeedModal = ref(false);
const uiError = ref('');
let hlsLoaderPromise: Promise<any | null> | null = null;
const hlsInstances = new Map<HTMLVideoElement, { destroy: () => void }>();
const boundVideoUrls = new WeakMap<HTMLVideoElement, string>();
const showAuthorDropdown = computed(() => {
  if (!isAuthorDropdownOpen.value) return false;
  if (isSearchingAuthors.value) return true;
  return author.value.trim().length >= 2;
});
const highlightedAuthorDid = computed(() => {
  const actor = tools.actorSearchResults[highlightedAuthorIndex.value];
  return actor?.did;
});

watch(
  () => tools.activeFeedId,
  () => {
    renameValue.value = tools.activeFeed?.name ?? '';
    feedDescription.value = tools.activeFeed?.description ?? '';
    feedIconPreview.value = tools.activeFeed?.iconDataUrl;
    automation.value = cloneAutomation();
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  if (authorSearchTimer) window.clearTimeout(authorSearchTimer);
  document.removeEventListener('click', onDocumentClick);
  hlsInstances.forEach((instance) => instance.destroy());
  hlsInstances.clear();
});

watch(author, (value) => {
  const queryValue = value.trim();
  if (authorSearchTimer) window.clearTimeout(authorSearchTimer);

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
    } catch {
      tools.actorSearchResults = [];
      highlightedAuthorIndex.value = -1;
    } finally {
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
  } finally {
    isSearching.value = false;
  }
}

async function loadMoreSearchResults() {
  if (!hasMoreSearchResults.value || !searchCursor.value) return;
  if (isSearching.value || isLoadingMore.value) return;
  isLoadingMore.value = true;
  try {
    const page = await tools.searchPosts(query.value, author.value || undefined, searchCursor.value);
    const seen = new Set(searchResults.value.map((post) => post.uri));
    const next = page.posts.filter((post) => !seen.has(post.uri));
    searchResults.value = [...searchResults.value, ...next];
    searchCursor.value = page.cursor;
    hasMoreSearchResults.value = Boolean(page.cursor);
  } finally {
    isLoadingMore.value = false;
  }
}

function onSearchResultsScroll(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
  if (remaining < 180) {
    void loadMoreSearchResults();
  }
}

function createFeed() {
  uiError.value = '';
  const createFeedFn = (tools as any).createFeed as ((name: string) => any) | undefined;
  const feed =
    typeof createFeedFn === 'function'
      ? createFeedFn(newFeedName.value)
      : fallbackCreateFeed(newFeedName.value);
  if (!feed) return;
  newFeedName.value = '';
  renameValue.value = feed.name;
  automation.value = cloneAutomation();
}

function renameActiveFeed() {
  if (!tools.activeFeed) return;
  uiError.value = '';
  const renameFeedFn = (tools as any).renameFeed as
    | ((feedId: string, name: string) => void)
    | undefined;
  if (typeof renameFeedFn === 'function') {
    renameFeedFn(tools.activeFeed.id, renameValue.value);
  } else {
    fallbackRenameFeed(tools.activeFeed.id, renameValue.value);
  }
  renameValue.value = tools.activeFeed.name;
}

async function deleteActiveFeed() {
  showDeleteFeedModal.value = false;
  if (!tools.activeFeed) return;
  uiError.value = '';
  const deleteFeedFn = (tools as any).deleteFeed as ((feedId: string) => Promise<void> | void) | undefined;
  if (typeof deleteFeedFn === 'function') {
    try {
      await deleteFeedFn(tools.activeFeed.id);
    } catch (error) {
      uiError.value = (error as Error).message || 'Failed to delete feed.';
      return;
    }
  } else {
    fallbackDeleteFeed(tools.activeFeed.id);
  }
  renameValue.value = tools.activeFeed?.name ?? '';
  automation.value = cloneAutomation();
}

function promptDeleteActiveFeed() {
  if (!tools.activeFeed) return;
  showDeleteFeedModal.value = true;
}

function cancelDeleteFeed() {
  showDeleteFeedModal.value = false;
}

async function confirmDeleteActiveFeed() {
  await deleteActiveFeed();
}

function clearAllDraftPosts() {
  if (!tools.activeFeed?.draftPosts.length) return;
  uiError.value = '';
  const clearDraftFn = (tools as any).clearActiveFeedDraftPosts as (() => void) | undefined;
  if (typeof clearDraftFn === 'function') {
    clearDraftFn();
    return;
  }
  fallbackClearAllDraftPosts();
}

function saveAutomation() {
  if (!tools.activeFeed) return;
  uiError.value = '';
  const updateAutomationFn = (tools as any).updateFeedAutomation as
    | ((feedId: string, automation: FeedAutomationConfig) => void)
    | undefined;
  if (typeof updateAutomationFn === 'function') {
    updateAutomationFn(tools.activeFeed.id, { ...automation.value });
    return;
  }
  fallbackUpdateAutomation(tools.activeFeed.id, { ...automation.value });
}

function saveFeedDetails() {
  if (!tools.activeFeed) return;
  uiError.value = '';
  const updateDetailsFn = (tools as any).updateFeedDetails as
    | ((feedId: string, details: { description?: string; iconDataUrl?: string }) => void)
    | undefined;
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

function togglePost(post: CuratedPost) {
  uiError.value = '';
  const isPostInActiveFeedFn = (tools as any).isPostInActiveFeed as
    | ((uri: string) => boolean)
    | undefined;
  const removePostFn = (tools as any).removePostFromActiveFeed as
    | ((uri: string) => void)
    | undefined;
  const addPostFn = (tools as any).addPostToActiveFeed as ((post: CuratedPost) => void) | undefined;

  const inFeed =
    typeof isPostInActiveFeedFn === 'function'
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

function cloneAutomation(): FeedAutomationConfig {
  return {
    enabled: tools.activeFeed?.automation.enabled ?? false,
    mode: tools.activeFeed?.automation.mode ?? 'words',
    pattern: tools.activeFeed?.automation.pattern ?? '',
    caseSensitive: tools.activeFeed?.automation.caseSensitive ?? false,
  };
}

function fallbackCreateFeed(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const now = new Date().toISOString();
  const feed = {
    id: `feed-${Math.random().toString(36).slice(2, 10)}`,
    name: trimmed,
    description: '',
    publishedDescription: '',
    iconDataUrl: undefined as string | undefined,
    publishedIconDataUrl: undefined as string | undefined,
    automation: { enabled: false, mode: 'words', pattern: '', caseSensitive: false } as FeedAutomationConfig,
    publishedAutomation: {
      enabled: false,
      mode: 'words',
      pattern: '',
      caseSensitive: false,
    } as FeedAutomationConfig,
    draftPosts: [] as CuratedPost[],
    publishedPosts: [] as CuratedPost[],
    isDirty: false,
    lastPublishedAt: undefined as string | undefined,
    blueskyFeedUri: undefined as string | undefined,
    blueskyFeedRkey: undefined as string | undefined,
    lastPublishError: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  if (!Array.isArray((tools as any).curatedFeeds)) {
    uiError.value = 'Feed store is outdated. Refresh the page to continue.';
    return null;
  }
  (tools as any).curatedFeeds = [feed, ...(tools as any).curatedFeeds];
  (tools as any).activeFeedId = feed.id;
  return feed;
}

function fallbackRenameFeed(feedId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed || !Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) =>
    feed.id === feedId ? { ...feed, name: trimmed, updatedAt: new Date().toISOString() } : feed,
  );
}

function fallbackDeleteFeed(feedId: string) {
  if (!Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.filter((feed: any) => feed.id !== feedId);
  if ((tools as any).activeFeedId === feedId) {
    (tools as any).activeFeedId = (tools as any).curatedFeeds[0]?.id ?? null;
  }
}

function fallbackUpdateAutomation(feedId: string, nextAutomation: FeedAutomationConfig) {
  if (!Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) =>
    feed.id === feedId
      ? {
          ...feed,
          automation: { ...nextAutomation },
          isDirty: true,
          updatedAt: new Date().toISOString(),
        }
      : feed,
  );
}

function fallbackUpdateDetails(
  feedId: string,
  details: { description?: string; iconDataUrl?: string; clearIcon?: boolean },
) {
  if (!Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) => {
    if (feed.id !== feedId) return feed;
    const hasIconField = Object.prototype.hasOwnProperty.call(details, 'iconDataUrl');
    const description = details.description ?? feed.description ?? '';
    const iconDataUrl = details.clearIcon
      ? undefined
      : hasIconField
        ? details.iconDataUrl
        : feed.iconDataUrl;
    const isDirty =
      description !== (feed.publishedDescription ?? '') ||
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

function fallbackAddPost(post: CuratedPost) {
  if (!tools.activeFeed || !Array.isArray((tools as any).curatedFeeds)) return;
  if (tools.activeFeed.draftPosts.some((item) => item.uri === post.uri)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) =>
    feed.id === tools.activeFeed?.id
      ? {
          ...feed,
          draftPosts: [post, ...feed.draftPosts],
          isDirty: true,
          updatedAt: new Date().toISOString(),
        }
      : feed,
  );
}

function fallbackRemovePost(uri: string) {
  if (!tools.activeFeed || !Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) =>
    feed.id === tools.activeFeed?.id
      ? {
          ...feed,
          draftPosts: feed.draftPosts.filter((post: CuratedPost) => post.uri !== uri),
          isDirty: true,
          updatedAt: new Date().toISOString(),
        }
      : feed,
  );
}

function fallbackClearAllDraftPosts() {
  if (!tools.activeFeed || !Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) =>
    feed.id === tools.activeFeed?.id
      ? {
          ...feed,
          draftPosts: [],
          isDirty: true,
          updatedAt: new Date().toISOString(),
        }
      : feed,
  );
}

function publishActiveFeed() {
  if (!tools.activeFeed) return;
  uiError.value = '';
  const publishFn = (tools as any).publishActiveFeedToBluesky as
    | (() => Promise<void>)
    | undefined;
  if (typeof publishFn === 'function') {
    publishFn().catch((error) => {
      uiError.value = (error as Error).message || 'Failed to publish to Bluesky.';
    });
    return;
  }
  uiError.value = 'Publish is unavailable in this runtime. Refresh the page.';
}

async function publishContentOnly() {
  if (!tools.activeFeed) return;
  uiError.value = '';
  const pushFn = (tools as any).pushActiveFeedContentsOnly as
    | (() => Promise<void>)
    | undefined;
  if (typeof pushFn !== 'function') {
    uiError.value = 'Publish Content-only is unavailable. Refresh the page.';
    return;
  }
  try {
    await pushFn();
  } catch (error) {
    uiError.value = (error as Error).message || 'Failed to push feed contents.';
  }
}

function discardChanges() {
  if (!tools.activeFeed) return;
  uiError.value = '';
  const discardFn = (tools as any).discardActiveFeedChanges as (() => void) | undefined;
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
  if (!tools.activeFeed || !Array.isArray((tools as any).curatedFeeds)) return;
  (tools as any).curatedFeeds = (tools as any).curatedFeeds.map((feed: any) =>
    feed.id === tools.activeFeed?.id
      ? {
          ...feed,
          draftPosts: [...feed.publishedPosts],
          automation: { ...feed.publishedAutomation },
          description: feed.publishedDescription ?? '',
          iconDataUrl: feed.publishedIconDataUrl,
          isDirty: false,
          updatedAt: new Date().toISOString(),
        }
      : feed,
  );
}

function onFeedIconSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
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

function isHlsPlaylist(url: string) {
  return /\.m3u8($|\?)/i.test(url);
}

function cleanupVideoElement(element: HTMLVideoElement) {
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

async function attachVideoSource(element: HTMLVideoElement, url: string) {
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

function bindVideoElement(element: Element | ComponentPublicInstance | null, url: string) {
  if (!(element instanceof HTMLVideoElement)) return;
  const currentUrl = boundVideoUrls.get(element);
  if (currentUrl === url) return;
  void attachVideoSource(element, url);
}

function loadHlsFromCdn(): Promise<any | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).Hls) return Promise.resolve((window as any).Hls);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).Hls ?? null);
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

function moveAuthorHighlight(step: number) {
  if (!isAuthorDropdownOpen.value) {
    isAuthorDropdownOpen.value = true;
  }
  const count = tools.actorSearchResults.length;
  if (!count) return;

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

async function selectAuthor(actor: ActorSearchResult) {
  author.value = actor.handle;
  isAuthorDropdownOpen.value = false;
}

async function selectHighlightedAuthor() {
  if (!showAuthorDropdown.value) return;
  const actor = tools.actorSearchResults[highlightedAuthorIndex.value];
  if (!actor) return;
  await selectAuthor(actor);
}

function onDocumentClick(event: MouseEvent) {
  const container = authorSearchContainer.value;
  if (!container) return;
  if (!container.contains(event.target as Node)) {
    closeAuthorDropdown();
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

</script>
