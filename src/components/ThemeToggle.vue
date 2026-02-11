<template>
  <select
    class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
    :value="ui.theme"
    @change="onChange"
  >
    <option value="system">System</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  ui.setTheme(target.value as 'system' | 'light' | 'dark');
}
</script>
