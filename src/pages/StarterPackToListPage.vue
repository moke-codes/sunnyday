<template>
  <AppLayout>
    <section class="space-y-6">
      <header>
        <h2 class="text-xl font-semibold">Starter Pack to List</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Search for a user, load their starter packs, choose one, then add selected members to a list.
        </p>
      </header>

      <div class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <label class="text-sm md:col-span-2">
          Search user
          <div class="mt-1 flex gap-2">
            <input
              v-model="actorQuery"
              class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              placeholder="name or handle"
              @keyup.enter="runActorSearch"
            />
            <button
              class="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
              :disabled="tools.loading"
              @click="runActorSearch"
            >
              Search
            </button>
          </div>
        </label>
      </div>

      <div v-if="tools.actorSearchResults.length" class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p class="text-sm font-medium">Matching users</p>
        <button
          v-for="actor in tools.actorSearchResults"
          :key="actor.did"
          type="button"
          class="flex w-full items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          @click="selectActor(actor)"
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
      </div>

      <div class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <label class="text-sm md:col-span-2">
          Starter pack
          <select
            v-model="selectedStarterPackUri"
            class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Select a starter pack</option>
            <option v-for="pack in tools.starterPacks" :key="pack.uri" :value="pack.uri">{{ pack.name }}</option>
          </select>
        </label>
        <button class="mt-6 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="loadMembers">
          Load Members
        </button>
      </div>

      <p v-if="referenceError" class="text-sm text-red-600">{{ referenceError }}</p>

      <MemberPicker v-if="tools.members.length" v-model="selectedMemberDids" :members="tools.members" />

      <div class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <label class="text-sm">
          Destination
          <select v-model="destinationMode" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <option value="existing">Existing list</option>
            <option value="new">New list</option>
          </select>
        </label>

        <label v-if="destinationMode === 'existing'" class="text-sm">
          Existing list
          <select v-model="existingListUri" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <option value="">Select list</option>
            <option v-for="list in tools.lists" :key="list.uri" :value="list.uri">{{ list.name }}</option>
          </select>
        </label>

        <template v-else>
          <label class="text-sm">
            New list name
            <input v-model="newListName" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label class="text-sm">
            New list description (optional)
            <input v-model="newListDescription" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label class="inline-flex items-center gap-2 text-sm md:col-span-2">
            <input v-model="isPrivate" type="checkbox" />
            Create as private list (planned support)
          </label>
        </template>

        <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900 md:col-span-2" :disabled="tools.loading || !selectedMemberDids.length" @click="applyMembers">
          {{ tools.loading ? 'Applying...' : 'Apply Members' }}
        </button>
      </div>

      <div v-if="tools.operationResult" class="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        Added: {{ tools.operationResult.added }} · Skipped: {{ tools.operationResult.skipped }} · Unresolved: {{ tools.operationResult.unresolved.length }}
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import MemberPicker from '@/components/MemberPicker.vue';
import { useToolsStore } from '@/stores/tools';
import type { ActorSearchResult } from '@/types/bluesky';

const tools = useToolsStore();

const actorQuery = ref('');
const selectedStarterPackUri = ref('');
const selectedMemberDids = ref<string[]>([]);
const referenceError = ref('');

const destinationMode = ref<'new' | 'existing'>('existing');
const existingListUri = ref('');
const newListName = ref('');
const newListDescription = ref('');
const isPrivate = ref(false);

const selectedMembers = computed(() => {
  const didSet = new Set(selectedMemberDids.value);
  return tools.members.filter((member) => didSet.has(member.did));
});

onMounted(async () => {
  if (!tools.lists.length) await tools.refreshLists();
});

async function runActorSearch() {
  referenceError.value = '';
  selectedStarterPackUri.value = '';
  tools.members = [];

  if (!actorQuery.value.trim()) {
    tools.actorSearchResults = [];
    tools.starterPacks = [];
    return;
  }

  try {
    await tools.searchActors(actorQuery.value);
    if (tools.actorSearchResults.length === 1) {
      await selectActor(tools.actorSearchResults[0]);
    }
  } catch (error) {
    referenceError.value = (error as Error).message || 'Could not search users.';
  }
}

async function selectActor(actor: ActorSearchResult) {
  referenceError.value = '';
  actorQuery.value = actor.handle;
  selectedStarterPackUri.value = '';
  selectedMemberDids.value = [];
  tools.members = [];

  try {
    await tools.loadStarterPacksForActor(actor.did);
    if (!tools.starterPacks.length) {
      referenceError.value = 'No starter packs found for this user.';
    }
  } catch (error) {
    referenceError.value = (error as Error).message || 'Could not load starter packs for this user.';
  }
}

async function loadMembers() {
  referenceError.value = '';
  const starterPack = tools.starterPacks.find((pack) => pack.uri === selectedStarterPackUri.value);
  if (!starterPack) return;
  await tools.loadStarterPackMembers(starterPack);
  selectedMemberDids.value = tools.members.map((member) => member.did);
}

async function applyMembers() {
  if (destinationMode.value === 'existing') {
    if (!existingListUri.value) return;
    await tools.addToExistingList(existingListUri.value, selectedMembers.value);
    return;
  }

  if (!newListName.value) return;
  await tools.createNewListAndAddMembers(
    newListName.value,
    selectedMembers.value,
    newListDescription.value || undefined,
    isPrivate.value,
  );
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}
</script>
