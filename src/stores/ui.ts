import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { loadTheme, saveTheme, type SavedTheme } from '@/services/sessionStorage';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  kind: ToastKind;
  text: string;
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<SavedTheme>(loadTheme());
  const toasts = ref<ToastMessage[]>([]);

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

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function pushToast(kind: ToastKind, text: string, durationMs = 3500) {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `toast-${Math.random().toString(36).slice(2, 10)}`;
    toasts.value = [...toasts.value, { id, kind, text }];
    if (durationMs > 0) {
      window.setTimeout(() => dismissToast(id), durationMs);
    }
    return id;
  }

  function notifySuccess(text: string, durationMs?: number) {
    return pushToast('success', text, durationMs);
  }

  function notifyError(text: string, durationMs?: number) {
    return pushToast('error', text, durationMs);
  }

  function notifyInfo(text: string, durationMs?: number) {
    return pushToast('info', text, durationMs);
  }

  watch(theme, (value) => {
    saveTheme(value);
    applyTheme();
  }, { immediate: true });

  return {
    theme,
    resolvedTheme,
    toasts,
    setTheme,
    applyTheme,
    dismissToast,
    notifySuccess,
    notifyError,
    notifyInfo,
  };
});
