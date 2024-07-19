import CoaServices from "~dm-services/coa/types";
import CollectionServices from "~dm-services/collection/types";
import { authorUser } from "~prisma-clients/extended/dm.extends";
import { EventReturnType } from "~socket.io-services/types";

import { dmSocketInjectionKey } from "../composables/useDmSocket";

export const stats = defineStore("stats", () => {
  const {
    coa: { services: coaServices },
    collection: { services: collectionServices },
  } = injectLocal(dmSocketInjectionKey)!;

  const ratings = ref<
    EventReturnType<CollectionServices["getWatchedAuthors"]> | undefined
  >(undefined);
  const isSearching = ref(false);
  const isLoadingWatchedAuthors = ref(false);
  const authorSearchResults = ref<
    EventReturnType<CoaServices["searchAuthor"]> | undefined
  >(undefined);
  const pendingSearch = ref<string | null>(null);

  const isAuthorWatched = (personcode: string) =>
    ratings.value?.some(
      ({ personcode: watchedPersonCode }) => personcode === watchedPersonCode,
    );

  const loadRatings = async (afterUpdate = false) => {
    if (afterUpdate || (!isLoadingWatchedAuthors.value && !ratings.value)) {
      isLoadingWatchedAuthors.value = true;
      ratings.value = await collectionServices.getWatchedAuthors();
      isLoadingWatchedAuthors.value = false;
    }
  };

  const searchAuthors = async (value: string) => {
    pendingSearch.value = value;
    if (!isSearching.value) {
      try {
        isSearching.value = true;
        authorSearchResults.value = await coaServices.searchAuthor(value);
        console.log(authorSearchResults.value);
      } finally {
        isSearching.value = false;
        // The input value has changed since the beginning of the search, searching again
        if (value !== pendingSearch.value)
          await searchAuthors(pendingSearch.value!);
      }
    }
  };

  const createRating = async (personcode: string) => {
    await collectionServices.addWatchedAuthor(personcode);
    await loadRatings(true);
  };
  const updateRating = async (data: authorUser) => {
    await collectionServices.updateWatchedAuthor(data);
  };
  const deleteAuthor = async (personcode: string) => {
    await collectionServices.deleteWatchedAuthor(personcode);
    await loadRatings(true);
  };

  return {
    isAuthorWatched,
    isSearching,
    ratings,
    pendingSearch,
    searchAuthors,
    authorSearchResults,
    loadRatings,
    createRating,
    updateRating,
    deleteAuthor,
  };
});
