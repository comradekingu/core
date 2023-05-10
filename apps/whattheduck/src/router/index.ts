import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/collection',
    component: () => import('../views/Collection.vue'),
  },
  {
    path: '/search',
    component: () => import('../views/Search.vue'),
  },
  {
    path: '/edit/:issuecode+',
    component: () => import('../views/OwnedIssueCopies.vue'),

    children: [
      {
        path: 'copy0',
        component: () => import('../components/OwnedIssueCopy.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
