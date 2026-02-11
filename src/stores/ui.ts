import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { loadTheme, saveTheme, type SavedTheme } from '@/services/sessionStorage';

export const useUiStore = defineStore('ui', () => {
  const theme = ref<SavedTheme>(loadTheme());

  const resolvedTheme = computed(() => {
    if (theme.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme.value;
  });

  function applyTheme() {
    const root = document.documentElement;
    if (resolvedTheme.value === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  function setTheme(value: SavedTheme) {
    theme.value = value;
  }

  watch(theme, (value) => {
    saveTheme(value);
    applyTheme();
  }, { immediate: true });

  return { theme, resolvedTheme, setTheme, applyTheme };
});
