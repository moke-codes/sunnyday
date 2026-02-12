<template>
  <div class="min-h-screen">
    <header class="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-sky-50/80 backdrop-blur dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-sm shadow-sm">
            ☀
          </div>
          <div>
            <h1 class="text-lg font-semibold text-amber-900 dark:text-amber-200">Sunny Day</h1>
            <p class="text-xs text-amber-700/80 dark:text-amber-300/70">Bluesky utility toolkit</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <ThemeToggle />
          <button
            class="rounded-md border border-amber-300 bg-white/80 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-slate-700"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </div>
      <nav class="mx-auto flex max-w-7xl gap-4 px-4 pb-3 text-sm">
        <RouterLink class="text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" to="/tools/list-to-starter-pack">
          List -> Starter Pack
        </RouterLink>
        <RouterLink class="text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" to="/tools/starter-pack-to-list">
          Starter Pack -> List
        </RouterLink>
        <RouterLink class="text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" to="/tools/curated-feed">
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
