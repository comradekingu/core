import type { ShallowRef } from "vue";

import type { issue } from "~prisma-schemas/schemas/dm";

import useCollection from "../composables/useCollection";
import { dmSocketInjectionKey } from "../composables/useDmSocket";

export const publicCollection = defineStore("publicCollection", () => {
  const {
    publicCollection: { services: publicCollectionServices },
  } = inject(dmSocketInjectionKey)!;

  const issues = shallowRef<(issue & { issuecode: string })[] | null>(null),
    publicUsername = ref<string | null>(null),
    publicationUrlRoot = computed(
      () => `/collection/user/${publicUsername.value || ""}`,
    ),
    purchases = ref([]);

  const collectionUtils = useCollection(
      issues as ShallowRef<(issue & { issuecode: string })[]>,
    ),
    loadPublicCollection = async (username: string) => {
      publicUsername.value = username;
      const data = await publicCollectionServices.getPublicCollection(username);
      if (data.error) {
        console.error(data.error);
      }
    };
  return {
    ...collectionUtils,
    publicationUrlRoot,
    issues,
    purchases,
    loadPublicCollection,
    loadPurchases: () => {},
  };
});
