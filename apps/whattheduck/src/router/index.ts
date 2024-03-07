import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import OwnedIssueCopy from '~/components/OwnedIssueCopy.vue';
import AddFromCamera from '~/views/AddFromCamera.vue';
import Authors from '~/views/Authors.vue';
import CountryList from '~/views/CountryList.vue';
import Forgot from '~/views/Forgot.vue';
import IssueList from '~/views/IssueList.vue';
import Login from '~/views/Login.vue';
import Logout from '~/views/Logout.vue';
import OwnedIssueCopies from '~/views/OwnedIssueCopies.vue';
import PublicationList from '~/views/PublicationList.vue';
import Report from '~/views/Report.vue';
import Search from '~/views/Search.vue';
import Signup from '~/views/Signup.vue';
import Stats from '~/views/Stats.vue';

const routes: RouteRecordRaw[] = [
  {
    name: 'OwnedIssueCopies',
    path: '/collection/:countrycode/:magazinecode/:issuenumber',
    component: OwnedIssueCopies,
    children: [
      {
        path: 'copy/:copyIndex',
        component: OwnedIssueCopy,
      },
    ],
  },
  {
    name: 'IssueList',
    path: '/:type(collection|coa)/:countrycode/:magazinecode',
    component: IssueList,
  },
  {
    name: 'PublicationList',
    path: '/:type(collection|coa)/:countrycode',
    component: PublicationList,
  },
  {
    name: 'CountryList',
    path: '/:type(collection|coa)',
    component: CountryList,
  },
  {
    path: '/search',
    component: Search,
  },
  {
    path: '/add-from-camera',
    component: AddFromCamera,
  },
  {
    path: '/report',
    component: Report,
  },
  {
    path: '/authors',
    component: Authors,
  },
  {
    path: '/stats',
    component: Stats,
  },
  {
    path: '/signup',
    component: Signup,
  },
  {
    path: '/forgot',
    component: Forgot,
  },
  {
    path: '/logout',
    component: Logout,
  },
  {
    path: '/',
    component: Login,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
