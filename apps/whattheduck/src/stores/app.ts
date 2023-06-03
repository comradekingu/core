import { defineStore } from 'pinia';
import type { DataSource } from 'typeorm';
import { inject, ref } from 'vue';

import { Sync } from '~/persistence/models/internal/Sync';

export const app = defineStore('app', () => ({
  currentNavigationItem: ref(undefined as string | undefined),
  dbInstance: inject('dbInstance') as DataSource,
  isOfflineMode: ref(false),
  isObsoleteSync: async () => {
    const lastSync = await app().dbInstance.getRepository(Sync).find();
    return !lastSync.length ? false : new Date().getTime() - lastSync[0].timestamp.getTime() > 12 * 60 * 60 * 1000;
  },
}));
