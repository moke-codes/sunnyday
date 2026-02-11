<template>
  <AppLayout>
    <section class="space-y-5">
      <header>
        <h2 class="text-xl font-semibold">Curated Feed Workspace</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Search posts and add them into your selected bucket. Enable moderation mode only when automation is needed.</p>
      </header>

      <div class="grid gap-4 md:grid-cols-5">
        <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:col-span-3">
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Query
              <input v-model="query" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="keyword or phrase" />
            </label>
            <label class="text-sm">
              Author handle (optional)
              <input v-model="author" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="alice.bsky.social" />
            </label>
          </div>

          <div class="flex items-center gap-3">
            <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900" @click="search">
              Search
            </button>
            <label class="inline-flex items-center gap-2 text-sm">
              <input :checked="tools.moderationMode" type="checkbox" @change="toggleModeration" />
              Automation mode (approve/reject queue)
            </label>
          </div>

          <div class="space-y-2">
            <article v-for="post in searchResults" :key="post.uri" class="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <p class="font-medium">@{{ post.authorHandle }}</p>
              <p class="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{{ post.text || '(No text content)' }}</p>
              <button class="mt-3 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="tools.togglePostSelection(post)">
                Add to {{ tools.moderationMode ? 'queue' : 'selected posts' }}
              </button>
            </article>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <h3 class="font-semibold">Selected posts ({{ tools.selectedPosts.length }})</h3>
          <article v-for="post in tools.selectedPosts" :key="post.uri" class="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <p class="font-medium">@{{ post.authorHandle }}</p>
            <p class="mt-1 line-clamp-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{{ post.text }}</p>
            <label class="mt-2 block text-xs">
              Expires in days (optional)
              <input type="number" min="1" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800" @change="setExpiration(post.uri, $event)" />
            </label>
            <button class="mt-2 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="tools.removeSelected(post.uri)">
              Remove
            </button>
          </article>

          <template v-if="tools.moderationMode">
            <h3 class="pt-2 font-semibold">Pending queue ({{ tools.pendingPosts.length }})</h3>
            <article v-for="post in tools.pendingPosts" :key="post.uri" class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/50">
              <p class="font-medium">@{{ post.authorHandle }}</p>
              <p class="mt-1 line-clamp-4 whitespace-pre-wrap">{{ post.text }}</p>
              <div class="mt-2 flex gap-2">
                <button class="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300" @click="tools.approvePending(post.uri)">Approve</button>
                <button class="rounded border border-rose-600 px-2 py-1 text-xs text-rose-700 dark:text-rose-300" @click="tools.rejectPending(post.uri)">Reject</button>
              </div>
            </article>
          </template>
        </section>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import { useToolsStore } from '@/stores/tools';
import type { CuratedPost } from '@/types/bluesky';

const tools = useToolsStore();
const query = ref('');
const author = ref('');
const searchResults = ref<CuratedPost[]>([]);

async function search() {
  searchResults.value = await tools.searchPosts(query.value, author.value || undefined);
}

function toggleModeration(event: Event) {
  const target = event.target as HTMLInputElement;
  tools.setModerationMode(target.checked);
}

function setExpiration(uri: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value);
  const post = tools.selectedPosts.find((item) => item.uri === uri);
  if (!post) return;
  if (!Number.isFinite(value) || value <= 0) {
    post.expiresAt = undefined;
    return;
  }
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + value);
  post.expiresAt = expiresAt.toISOString();
}
</script>
