<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <form class="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" @submit.prevent="submit">
      <div>
        <h2 class="text-xl font-semibold">Log in with Bluesky</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Use your handle and app password.</p>
      </div>

      <label class="block text-sm">
        Handle
        <input v-model="identifier" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="you.bsky.social" required />
      </label>

      <label class="block text-sm">
        App password
        <input v-model="password" type="password" class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />
      </label>

      <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>

      <button :disabled="auth.loading" class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
        {{ auth.loading ? 'Logging in...' : 'Log in' }}
      </button>
    </form>
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
