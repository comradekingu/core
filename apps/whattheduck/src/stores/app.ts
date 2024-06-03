import { defineStore } from 'pinia';
import type { NotEmptyStorageValue } from '~socket.io-client-services';
import { dmSocketInjectionKey } from '~web/src/composables/useDmSocket';

import usePersistedData from '~/composables/usePersistedData';

export const NAVIGATION_ITEM_REGEX =
  /^(?:$|(?<countrycode>[^/]+)(?:$|(?:\/(?<magazinecode>[^ ]+)(?:$|(?: (?<issuenumber>.+))))))$/;

export const app = defineStore('app', () => {
  const {
    coa: { socket: coaSocket },
    collection: { socket: collectionSocket },
  } = injectLocal(dmSocketInjectionKey)!;

  const isOfflineMode = ref(false);
  setTimeout(() => {
    setInterval(() => {
      isOfflineMode.value = coaSocket && !coaSocket.connected;
    }, 1000);
  }, 1000);

  const route = useRoute();
  const lastSync = ref<Date>();
  const token = ref<string | null>(); // undefined === we haven't checked whether there is a token ; null === we have checked and there is no token
  const socketCache = ref<Record<string, NotEmptyStorageValue>>({});
  const isPersistedDataLoaded = ref(false);
  const filterText = ref('');

  watch(token, () => {
    collectionSocket.disconnect();
    collectionSocket.connect();
  });

  const issueViewModes = [
    { id: 'list', label: 'List', icon: { ios: '/icons/list.svg', md: '/icons/list.svg' } },
    { id: 'edges', label: 'Edges', icon: { ios: '/icons/edges.svg', md: '/icons/edges.svg' } },
    {
      id: 'covers-small',
      label: 'Covers (small)',
      icon: { ios: '/icons/grid-sharp-small.svg', md: '/icons/grid-sharp-small.svg' },
    },
    {
      id: 'covers-medium',
      label: 'Covers (medium)',
      icon: { ios: '/icons/grid-sharp-medium.svg', md: '/icons/grid-sharp-medium.svg' },
    },
    {
      id: 'covers-large',
      label: 'Covers (large)',
      icon: { ios: '/icons/grid-sharp-large.svg', md: '/icons/grid-sharp-large.svg' },
    },
  ] as const;

  const currentIssueViewMode = ref<(typeof issueViewModes)[number]>(issueViewModes[0]);

  usePersistedData({
    token,
    socketCache,
  }).then(() => {
    console.log('token: ', JSON.stringify({ token: token.value }));
    isPersistedDataLoaded.value = true;
  });

  const currentNavigationItem = ref<string>('');

  const navigationItemGroups = computed(
    () =>
      (NAVIGATION_ITEM_REGEX.exec(currentNavigationItem.value)?.groups || {}) as {
        countrycode?: string;
        magazinecode?: string;
        issuenumber?: string;
      },
  );

  const countrycode = computed(() => navigationItemGroups.value.countrycode);
  const magazinecode = computed(() => navigationItemGroups.value.magazinecode);
  const publicationcode = computed(() =>
    navigationItemGroups.value.magazinecode
      ? `${navigationItemGroups.value.countrycode}/${navigationItemGroups.value.magazinecode}`
      : null,
  );
  const issuenumber = computed(() => navigationItemGroups.value.issuenumber);

  return {
    coaSocket,
    filterText,
    isPersistedDataLoaded,
    socketCache,
    lastSync,
    currentNavigationItem,
    countrycode,
    magazinecode,
    publicationcode,
    issuenumber,
    navigationItemGroups,
    token,
    isOfflineMode,
    isCoaView: ref(route.query.coa === 'true'),
    isObsoleteSync: computed(
      () => !lastSync.value || new Date().getTime() - lastSync.value.getTime() > 12 * 60 * 60 * 1000,
    ),
    issueViewModes,
    currentIssueViewMode,
  };
});
