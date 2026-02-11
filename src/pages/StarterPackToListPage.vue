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
          <div ref="searchContainer" class="relative mt-1">
            <input
              v-model="actorQuery"
              class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              placeholder="name or handle"
              @focus="openDropdown"
              @keydown.down.prevent="moveHighlight(1)"
              @keydown.up.prevent="moveHighlight(-1)"
              @keydown.enter.prevent="selectHighlightedActor"
              @keydown.esc.prevent="closeDropdown"
            />

            <div
              v-if="showActorDropdown"
              class="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div v-if="isSearchingActors" class="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                Searching...
              </div>
              <button
                v-for="actor in tools.actorSearchResults"
                :key="actor.did"
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                :class="{
                  'bg-slate-50 dark:bg-slate-800': actor.did === highlightedActorDid,
                }"
                @click="selectActor(actor)"
                @mouseenter="highlightedIndex = tools.actorSearchResults.findIndex((item) => item.did === actor.did)"
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
                v-if="!isSearchingActors && actorQuery.trim().length >= 2 && !tools.actorSearchResults.length"
                class="px-3 py-2 text-xs text-slate-500 dark:text-slate-400"
              >
                No users found.
              </div>
            </div>
          </div>
        </label>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import MemberPicker from '@/components/MemberPicker.vue';
import { useToolsStore } from '@/stores/tools';
import type { ActorSearchResult } from '@/types/bluesky';

const tools = useToolsStore();

const actorQuery = ref('');
const isActorDropdownOpen = ref(false);
const isSearchingActors = ref(false);
const highlightedIndex = ref(-1);
const searchContainer = ref<HTMLElement | null>(null);
const selectedStarterPackUri = ref('');
const selectedMemberDids = ref<string[]>([]);
const referenceError = ref('');
let actorSearchTimer: number | undefined;

const destinationMode = ref<'new' | 'existing'>('existing');
const existingListUri = ref('');
const newListName = ref('');
const newListDescription = ref('');
const isPrivate = ref(false);

const selectedMembers = computed(() => {
  const didSet = new Set(selectedMemberDids.value);
  return tools.members.filter((member) => didSet.has(member.did));
});
const showActorDropdown = computed(() => {
  if (!isActorDropdownOpen.value) return false;
  if (isSearchingActors.value) return true;
  return actorQuery.value.trim().length >= 2;
});
const highlightedActorDid = computed(() => {
  const actor = tools.actorSearchResults[highlightedIndex.value];
  return actor?.did;
});

onMounted(async () => {
  if (!tools.lists.length) await tools.refreshLists();
  document.addEventListener('click', onDocumentClick);
});
onBeforeUnmount(() => {
  if (actorSearchTimer) window.clearTimeout(actorSearchTimer);
  document.removeEventListener('click', onDocumentClick);
});

watch(actorQuery, (value) => {
  const query = value.trim();
  referenceError.value = '';

  if (actorSearchTimer) window.clearTimeout(actorSearchTimer);
  if (query.length < 2) {
    tools.actorSearchResults = [];
    isSearchingActors.value = false;
    highlightedIndex.value = -1;
    return;
  }

  isSearchingActors.value = true;
  actorSearchTimer = window.setTimeout(async () => {
    try {
      await tools.searchActors(query);
      highlightedIndex.value = tools.actorSearchResults.length ? 0 : -1;
    } catch (error) {
      referenceError.value = (error as Error).message || 'Could not search users.';
    } finally {
      isSearchingActors.value = false;
    }
  }, 300);
});

async function selectActor(actor: ActorSearchResult) {
  referenceError.value = '';
  actorQuery.value = actor.handle;
  isActorDropdownOpen.value = false;
  selectedStarterPackUri.value = '';
  selectedMemberDids.value = [];
  tools.members = [];
  highlightedIndex.value = -1;

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

function openDropdown() {
  isActorDropdownOpen.value = true;
}

function closeDropdown() {
  isActorDropdownOpen.value = false;
}

function moveHighlight(step: number) {
  if (!isActorDropdownOpen.value) {
    isActorDropdownOpen.value = true;
  }
  const count = tools.actorSearchResults.length;
  if (!count) return;

  const next = highlightedIndex.value + step;
  if (next < 0) {
    highlightedIndex.value = count - 1;
    return;
  }
  if (next >= count) {
    highlightedIndex.value = 0;
    return;
  }
  highlightedIndex.value = next;
}

async function selectHighlightedActor() {
  if (!showActorDropdown.value) return;
  const actor = tools.actorSearchResults[highlightedIndex.value];
  if (!actor) return;
  await selectActor(actor);
}

function onDocumentClick(event: MouseEvent) {
  const container = searchContainer.value;
  if (!container) return;
  if (!container.contains(event.target as Node)) {
    closeDropdown();
  }
}
</script>
