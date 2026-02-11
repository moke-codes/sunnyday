<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-600 dark:text-slate-400">{{ selectedCount }} selected / {{ members.length }} total</p>
      <div class="flex gap-2">
        <button class="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="selectAll">All</button>
        <button class="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="clearAll">None</button>
      </div>
    </div>

    <label class="block text-sm">
      Filter members
      <div class="relative mt-1">
        <input
          ref="filterInput"
          v-model="filterQuery"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 dark:border-slate-700 dark:bg-slate-800"
          placeholder="Search by name or handle"
        />
        <button
          v-if="filterQuery"
          type="button"
          class="absolute inset-y-0 right-1 my-auto h-7 w-7 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label="Clear filter"
          @click="clearFilter"
        >
          x
        </button>
      </div>
    </label>

    <div class="max-h-80 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <label
        v-for="member in filteredMembers"
        :key="member.did"
        class="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 dark:border-slate-800"
      >
        <input
          type="checkbox"
          :checked="modelValueSet.has(member.did)"
          @change="toggle(member.did)"
        />
        <img
          v-if="member.avatar"
          :src="member.avatar"
          :alt="member.displayName || member.handle"
          class="h-7 w-7 rounded-full object-cover"
          loading="lazy"
        />
        <div
          v-else
          class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
        >
          {{ initials(member.displayName || member.handle) }}
        </div>
        <div class="min-w-0">
          <p class="truncate font-medium">{{ member.displayName || member.handle }}</p>
          <p class="truncate text-xs text-slate-500">@{{ member.handle }}</p>
        </div>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ListMember } from '@/types/bluesky';

const props = defineProps<{
  members: ListMember[];
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const filterQuery = ref('');
const filterInput = ref<HTMLInputElement | null>(null);
const modelValueSet = computed(() => new Set(props.modelValue));
const selectedCount = computed(() => props.modelValue.length);
const filteredMembers = computed(() => {
  const query = filterQuery.value.trim().toLowerCase();
  if (!query) return props.members;
  return props.members.filter((member) => {
    const displayName = (member.displayName || '').toLowerCase();
    const handle = member.handle.toLowerCase();
    return displayName.includes(query) || handle.includes(query);
  });
});

function toggle(did: string) {
  const set = new Set(props.modelValue);
  if (set.has(did)) set.delete(did);
  else set.add(did);
  emit('update:modelValue', [...set]);
}

function selectAll() {
  emit('update:modelValue', props.members.map((member) => member.did));
}

function clearAll() {
  emit('update:modelValue', []);
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function clearFilter() {
  filterQuery.value = '';
  filterInput.value?.focus();
}
</script>
