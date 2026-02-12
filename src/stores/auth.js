import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { blueskyClient } from '@/services/blueskyClient';
import { clearSession, loadSession, saveSession } from '@/services/sessionStorage';
export const useAuthStore = defineStore('auth', () => {
    const profile = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const isAuthenticated = computed(() => Boolean(profile.value?.did));
    async function login(identifier, password) {
        loading.value = true;
        error.value = null;
        try {
            const session = await blueskyClient.login({ identifier, password });
            saveSession(session);
            profile.value = await blueskyClient.getViewerProfile();
        }
        catch (e) {
            error.value = e.message || 'Unable to login';
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function restore() {
        const saved = loadSession();
        if (!saved)
            return;
        loading.value = true;
        error.value = null;
        try {
            await blueskyClient.resumeSession(saved);
            profile.value = await blueskyClient.getViewerProfile();
        }
        catch {
            clearSession();
            profile.value = null;
        }
        finally {
            loading.value = false;
        }
    }
    async function logout() {
        try {
            await blueskyClient.logout();
        }
        catch {
            // If remote logout fails, still clear local session.
        }
        clearSession();
        profile.value = null;
    }
    return { profile, loading, error, isAuthenticated, login, restore, logout };
});
