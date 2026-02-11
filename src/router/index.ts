import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginPage from '@/pages/LoginPage.vue';
import ListToStarterPackPage from '@/pages/ListToStarterPackPage.vue';
import StarterPackToListPage from '@/pages/StarterPackToListPage.vue';
import CuratedFeedPage from '@/pages/CuratedFeedPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/tools/list-to-starter-pack' },
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/tools/list-to-starter-pack',
      name: 'list-to-starter-pack',
      component: ListToStarterPackPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/tools/starter-pack-to-list',
      name: 'starter-pack-to-list',
      component: StarterPackToListPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/tools/curated-feed',
      name: 'curated-feed',
      component: CuratedFeedPage,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.isAuthenticated && to.meta.requiresAuth) {
    await auth.restore();
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'list-to-starter-pack' };
  }

  return true;
});

export default router;
