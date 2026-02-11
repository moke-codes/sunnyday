<template>
  <AppLayout>
    <section class="space-y-6">
      <header>
        <h2 class="text-xl font-semibold">List to Starter Pack</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Load one of your lists, select members, and create a starter pack.</p>
      </header>

      <div class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <label class="text-sm md:col-span-2">
          Source list
          <select v-model="selectedListUri" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <option value="">Select a list</option>
            <option v-for="list in tools.lists" :key="list.uri" :value="list.uri">{{ list.name }}</option>
          </select>
        </label>
        <button class="mt-6 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="loadMembers">
          Load Members
        </button>
      </div>

      <MemberPicker v-if="tools.members.length" v-model="selectedMemberDids" :members="tools.members" />

      <form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2" @submit.prevent="createStarterPack">
        <label class="text-sm">
          Starter pack name
          <input v-model="starterPackName" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />
        </label>
        <label class="text-sm">
          Description (optional)
          <input v-model="starterPackDescription" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
        </label>
        <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900 md:col-span-2" :disabled="tools.loading || !selectedMemberDids.length">
          {{ tools.loading ? 'Creating...' : 'Create Starter Pack' }}
        </button>
      </form>

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

const tools = useToolsStore();

const selectedListUri = ref('');
const selectedMemberDids = ref<string[]>([]);
const starterPackName = ref('');
const starterPackDescription = ref('');

const selectedMembers = computed(() => {
  const didSet = new Set(selectedMemberDids.value);
  return tools.members.filter((member) => didSet.has(member.did));
});

onMounted(async () => {
  if (!tools.lists.length) {
    await tools.refreshLists();
  }
});

async function loadMembers() {
  if (!selectedListUri.value) return;
  await tools.loadListMembers(selectedListUri.value);
  selectedMemberDids.value = tools.members.map((member) => member.did);
}

async function createStarterPack() {
  await tools.convertListToStarterPack({
    name: starterPackName.value,
    description: starterPackDescription.value || undefined,
    selectedMembers: selectedMembers.value,
  });
}
</script>
