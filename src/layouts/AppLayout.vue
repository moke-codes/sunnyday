<template>
  <div class="min-h-screen">
    <header class="border-b border-amber-300 bg-gradient-to-r from-amber-100 via-orange-100 to-sky-100/90 backdrop-blur dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-sm shadow-sm">
            ☀
          </div>
          <div>
            <h1 class="text-lg font-semibold text-amber-950 dark:text-amber-200">Sunny Day</h1>
            <p class="text-xs text-amber-800 dark:text-amber-300/70">Bluesky utility toolkit</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <ThemeToggle />
          <button
            class="rounded-md border border-amber-400 bg-white/85 px-3 py-2 text-sm text-amber-950 hover:bg-amber-200 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-slate-700"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </div>
      <nav class="mx-auto flex max-w-7xl gap-2 px-4 pb-3 text-sm">
        <RouterLink v-slot="{ isActive }" to="/tools/list-to-starter-pack">
          <span
            class="inline-flex rounded-md px-3 py-1.5"
            :class="
              isActive
                ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                : 'text-amber-900 hover:bg-amber-200/70 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200'
            "
          >
            List → Starter Pack
          </span>
        </RouterLink>
        <RouterLink v-slot="{ isActive }" to="/tools/starter-pack-to-list">
          <span
            class="inline-flex rounded-md px-3 py-1.5"
            :class="
              isActive
                ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                : 'text-amber-900 hover:bg-amber-200/70 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200'
            "
          >
            Starter Pack → List
          </span>
        </RouterLink>
        <RouterLink v-slot="{ isActive }" to="/tools/curated-feed">
          <span
            class="inline-flex rounded-md px-3 py-1.5"
            :class="
              isActive
                ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                : 'text-amber-900 hover:bg-amber-200/70 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200'
            "
          >
            Curated Feed
          </span>
        </RouterLink>
      </nav>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-6">
      <slot />
    </main>
    <div class="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2">
      <div
        v-for="toast in ui.toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg"
        :class="
          toast.kind === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
            : toast.kind === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100'
              : 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100'
        "
      >
        <div class="flex items-start justify-between gap-2">
          <p class="leading-5">{{ toast.text }}</p>
          <button
            class="rounded px-1 text-xs opacity-80 hover:opacity-100"
            aria-label="Dismiss notification"
            @click="ui.dismissToast(toast.id)"
          >
            x
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();

async function logout() {
  await auth.logout();
  ui.notifyInfo('Logged out.');
  await router.push('/login');
}
</script>
