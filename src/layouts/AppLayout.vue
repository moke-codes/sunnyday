<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <h1 class="text-lg font-semibold">Sunnyday</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">Bluesky utility toolkit</p>
        </div>
        <div class="flex items-center gap-3">
          <ThemeToggle />
          <button
            class="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </div>
      <nav class="mx-auto flex max-w-7xl gap-4 px-4 pb-3 text-sm">
        <RouterLink class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" to="/tools/list-to-starter-pack">
          List -> Starter Pack
        </RouterLink>
        <RouterLink class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" to="/tools/starter-pack-to-list">
          Starter Pack -> List
        </RouterLink>
        <RouterLink class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" to="/tools/curated-feed">
          Curated Feed
        </RouterLink>
      </nav>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

async function logout() {
  await auth.logout();
  await router.push('/login');
}
</script>
