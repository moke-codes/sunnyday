<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-8">
    <div class="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-amber-100/60 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
      <aside class="relative hidden md:block">
        <div class="absolute inset-0 bg-gradient-to-br from-amber-300 via-orange-300 to-sky-300"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-amber-950/20 via-transparent to-white/30"></div>
        <div class="relative z-10 flex h-full flex-col justify-between p-6 text-amber-950">
          <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/75 text-xl shadow">
            ☀
          </div>
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">Sunny Day</h1>
            <p class="max-w-xs text-sm text-amber-950/85">
              Build lists, starter packs, and curated feeds for Bluesky in one workspace.
            </p>
          </div>
        </div>
      </aside>

      <form class="space-y-5 p-6 sm:p-8" @submit.prevent="submit">
        <div class="space-y-1">
          <h2 class="text-2xl font-semibold">Log in with Bluesky</h2>
          <p class="text-sm text-slate-600 dark:text-slate-400">Use your handle and app password.</p>
        </div>

        <label class="block text-sm">
          Handle
          <input
            v-model="identifier"
            class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            placeholder="you.bsky.social"
            required
          />
        </label>

        <label class="block text-sm">
          App password
          <input
            v-model="password"
            type="password"
            class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            required
          />
        </label>

        <p v-if="auth.error" class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {{ auth.error }}
        </p>

        <button :disabled="auth.loading" class="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
          {{ auth.loading ? 'Logging in...' : 'Log in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const identifier = ref('');
const password = ref('');

async function submit() {
  try {
    await auth.login(identifier.value.trim(), password.value);
    password.value = '';
    await router.push('/tools/list-to-starter-pack');
  } catch {
    // Error state is handled in the auth store.
  }
}
</script>
