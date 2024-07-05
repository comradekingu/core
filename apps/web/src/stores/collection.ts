import CollectionServices from "~dm-services/collection/types";
import StatsServices from "~dm-services/stats/types";
import {
  CollectionUpdateMultipleIssues,
  CollectionUpdateSingleIssue,
} from "~dm-types/CollectionUpdate";
import {
  authorUser,
  issue,
  purchase,
  subscription,
} from "~prisma-clients/extended/dm.extends";
import { EventReturnType, ScopedError } from "~socket.io-services/types";

import useCollection from "../composables/useCollection";
import { dmSocketInjectionKey } from "../composables/useDmSocket";
import { bookcase } from "./bookcase";

export type IssueWithPublicationcodeOptionalId = Omit<issue, "id"> & {
  id: number | null;
};

export type SubscriptionTransformed = Omit<
  subscription,
  "country" | "magazine"
>;

export type SubscriptionTransformedStringDates = Omit<
  SubscriptionTransformed,
  "startDate" | "endDate"
> & {
  startDate: string;
  endDate: string;
};

export type purchaseWithStringDate = Omit<purchase, "date"> & {
  date: string;
};

export const collection = defineStore("collection", () => {
  const {
    collection: { services: collectionServices },
    stats: { services: statsServices },
    login: { services: loginServices },
    options: socketOptions,
  } = injectLocal(dmSocketInjectionKey)!;

  const { bookcaseWithPopularities } = storeToRefs(bookcase());

  const issues = ref(null as issue[] | null);

  const collectionUtils = useCollection(issues),
    watchedPublicationsWithSales = ref(null as string[] | null),
    purchases = ref(null as purchase[] | null),
    watchedAuthors = ref(null as authorUser[] | null),
    marketplaceContactMethods = ref(null as string[] | null),
    suggestions = ref(
      null as EventReturnType<StatsServices["getSuggestionsForCountry"]> | null,
    ),
    subscriptions = ref(null as SubscriptionTransformed[] | null),
    popularIssuesInCollection = ref(
      null as { [shortIssuecode: string]: number } | null,
    ),
    lastPublishedEdgesForCurrentUser = ref(
      null as EventReturnType<
        CollectionServices["getLastPublishedEdges"]
      > | null,
    ),
    isLoadingUser = ref(false as boolean),
    isLoadingCollection = ref(false as boolean),
    isLoadingWatchedPublicationsWithSales = ref(false as boolean),
    isLoadingMarketplaceContactMethods = ref(false as boolean),
    isLoadingPurchases = ref(false as boolean),
    isLoadingSuggestions = ref(false as boolean),
    isLoadingSubscriptions = ref(false as boolean),
    coaIssueCountsPerCountrycode = ref(
      null as EventReturnType<
        CollectionServices["getCoaCountByCountrycode"]
      > | null,
    ),
    coaIssueCountsByPublicationcode = ref(
      null as EventReturnType<
        CollectionServices["getCoaCountByPublicationcode"]
      > | null,
    ),
    user = ref(
      undefined as
        | EventReturnType<CollectionServices["getUser"]>
        | undefined
        | null,
    ),
    userPermissions = ref(
      undefined as
        | EventReturnType<CollectionServices["getUserPermissions"]>
        | undefined,
    ),
    previousVisit = ref(null as Date | null),
    publicationUrlRoot = computed(() => "/collection/show"),
    purchasesById = computed((): Record<string, purchase> | undefined =>
      purchases.value?.reduce(
        (acc, purchase) => ({ ...acc, [purchase.id as number]: purchase }),
        {},
      ),
    ),
    copiesPerIssuecode = computed(() =>
      issues.value?.reduce<Record<string, issue[]>>(
        (acc, issue) => ({
          ...acc,
          [issue.shortIssuecode]: [...acc[issue.shortIssuecode], issue],
        }),
        {},
      ),
    ),
    hasSuggestions = computed(
      () => Object.keys(suggestions.value?.oldestdate.issues || {}).length,
    ),
    issueNumbersPerPublication = computed(
      () =>
        issues.value?.reduce(
          (acc, { country, issuenumber, magazine }) => ({
            ...acc,
            [`${country}/${magazine}`]: [
              ...(acc[`${country}/${magazine}`] || []),
              issuenumber,
            ],
          }),
          {} as { [publicationcode: string]: string[] },
        ) || {},
    ),
    totalPerPublicationUniqueIssueNumbers = computed(
      (): {
        [publicationcode: string]: number;
      } =>
        issueNumbersPerPublication.value &&
        Object.keys(issueNumbersPerPublication.value).reduce(
          (acc, publicationcode) => ({
            ...acc,
            [publicationcode]: [
              ...new Set(issueNumbersPerPublication.value[publicationcode]),
            ].length,
          }),
          {},
        ),
    ),
    totalPerPublicationUniqueIssueNumbersSorted = computed(
      () =>
        totalPerPublicationUniqueIssueNumbers.value &&
        Object.entries(totalPerPublicationUniqueIssueNumbers.value).sort(
          ([publicationcode1], [publicationcode2]) =>
            Math.sign(
              totalPerPublicationUniqueIssueNumbers.value[publicationcode2]! -
                totalPerPublicationUniqueIssueNumbers.value[publicationcode1]!,
            ),
        ),
    ),
    popularIssuesInCollectionWithoutEdge = computed(() =>
      bookcaseWithPopularities.value
        ?.filter(
          ({ edgeId, popularity }) => !edgeId && popularity && popularity > 0,
        )
        .sort(({ popularity: popularity1 }, { popularity: popularity2 }) =>
          popularity2 && popularity1 ? popularity2 - popularity1 : 0,
        ),
    ),
    userForAccountForm = computed(() => {
      if (!user.value) {
        return null;
      }
      return {
        ...user.value,
        discordId: user.value.discordId
          ? String(user.value.discordId)
          : undefined,
        presentationText: user.value.presentationText || "",
        email: user.value.email!,
        okForExchanges: user.value.marketplaceAcceptsExchanges || false,
      };
    }),
    updateCollectionSingleIssue = async (data: CollectionUpdateSingleIssue) => {
      const results = await collectionServices.addOrChangeCopies(data);
      console.log(results);
      await loadCollection(true);
    },
    updateCollectionMultipleIssues = async (
      data: CollectionUpdateMultipleIssues,
    ) => {
      await collectionServices.addOrChangeIssues(data);
      await loadCollection(true);
    },
    createPurchase = async (date: string, description: string) => {
      await collectionServices.createPurchase(date, description);
      await loadPurchases(true);
    },
    deletePurchase = async (id: number) => {
      await collectionServices.deletePurchase(id);
      await loadPurchases(true);
    },
    fetchIssueCountsByCountrycode = async () => {
      if (!coaIssueCountsByPublicationcode.value)
        coaIssueCountsPerCountrycode.value =
          await collectionServices.getCoaCountByCountrycode();
    },
    fetchIssueCountsByPublicationcode = async () => {
      if (!coaIssueCountsByPublicationcode.value)
        coaIssueCountsByPublicationcode.value =
          await collectionServices.getCoaCountByPublicationcode();
    },
    fetchPublicationNames = () => collectionServices.getPublicationTitles(),
    loadPreviousVisit = async () => {
      const result = await collectionServices.getLastVisit();
      if (typeof result === "object" && result?.error) {
        console.error(result.error);
      } else if (result) {
        previousVisit.value = new Date(result as string);
      }
    },
    loadCollection = async (afterUpdate = false) => {
      if (afterUpdate || (!isLoadingCollection.value && !issues.value)) {
        isLoadingCollection.value = true;
        issues.value = await collectionServices.getIssues();
        isLoadingCollection.value = false;
      }
    },
    loadPurchases = async (afterUpdate = false) => {
      if (afterUpdate || (!isLoadingPurchases.value && !purchases.value)) {
        isLoadingPurchases.value = true;
        purchases.value = (await collectionServices.getPurchases()).map(
          (purchase) => ({
            ...purchase,
            date: new Date(purchase.date),
          }),
        );
        isLoadingPurchases.value = false;
      }
    },
    loadWatchedPublicationsWithSales = async (afterUpdate = false) => {
      if (
        afterUpdate ||
        (!isLoadingWatchedPublicationsWithSales.value &&
          !watchedPublicationsWithSales.value)
      ) {
        isLoadingWatchedPublicationsWithSales.value = true;
        watchedPublicationsWithSales.value = await collectionServices.getOption(
          "sales_notification_publications",
        );
        isLoadingWatchedPublicationsWithSales.value = false;
      }
    },
    loadMarketplaceContactMethods = async (afterUpdate = false) => {
      if (
        afterUpdate ||
        (!isLoadingMarketplaceContactMethods.value &&
          !marketplaceContactMethods.value)
      ) {
        isLoadingMarketplaceContactMethods.value = true;
        marketplaceContactMethods.value = await collectionServices.getOption(
          "marketplace_contact_methods",
        );
        isLoadingMarketplaceContactMethods.value = false;
      }
    },
    updateMarketplaceContactMethods = async () =>
      await collectionServices.getOption("marketplace_contact_methods"),
    updateWatchedPublicationsWithSales = async () =>
      await collectionServices.setOption(
        "sales_notification_publications",
        watchedPublicationsWithSales.value!,
      ),
    loadSuggestions = async ({
      countryCode,
      sinceLastVisit,
    }: {
      countryCode: string;
      sinceLastVisit: boolean;
    }) => {
      if (!isLoadingSuggestions.value) {
        isLoadingSuggestions.value = true;
        suggestions.value = await statsServices.getSuggestionsForCountry(
          countryCode || "ALL",
          sinceLastVisit ? "since_previous_visit" : "_",
          sinceLastVisit ? 100 : 20,
        );
        isLoadingSuggestions.value = false;
      }
    },
    loadSubscriptions = async (afterUpdate = false) => {
      if (
        afterUpdate ||
        (!isLoadingSubscriptions.value && !subscriptions.value)
      ) {
        isLoadingSubscriptions.value = true;
        subscriptions.value = (await collectionServices.getSubscriptions()).map(
          (subscription: SubscriptionTransformedStringDates) => ({
            ...subscription,
            startDate: new Date(Date.parse(subscription.startDate)),
            endDate: new Date(Date.parse(subscription.endDate)),
          }),
        );
        isLoadingSubscriptions.value = false;
      }
    },
    loadPopularIssuesInCollection = async () => {
      if (!popularIssuesInCollection.value) {
        popularIssuesInCollection.value = (
          await collectionServices.getCollectionPopularity()
        ).reduce(
          (acc, issue) => ({
            ...acc,
            [`${issue.country}/${issue.magazine} ${issue.issuenumber}`]:
              issue.popularity,
          }),
          {},
        );
      }
    },
    loadLastPublishedEdgesForCurrentUser = async () => {
      if (!lastPublishedEdgesForCurrentUser.value) {
        lastPublishedEdgesForCurrentUser.value =
          await collectionServices.getLastPublishedEdges();
      }
    },
    login = async (
      username: string,
      password: string,
      onSuccess: (token: string) => void,
      onError: (e: string) => void,
    ) => {
      const response = await loginServices.login({
        username,
        password,
      });
      if (typeof response !== "string" && "error" in response) {
        onError(response.error!);
      } else {
        onSuccess(response as string);
      }
    },
    signup = async (
      username: string,
      password: string,
      password2: string,
      email: string,
      onSuccess: (token: string) => void,
      onError: (e: ScopedError) => void,
    ) => {
      const response = await collectionServices.createUser({
        username,
        password,
        password2,
        email,
      });
      if (response.error) {
        if (response.selector) {
          onError(response);
        } else {
          console.error(response.error, response.errorDetails);
        }
      } else {
        onSuccess(response.token);
      }
    },
    loadUser = async (afterUpdate = false) => {
      if (!isLoadingUser.value && (afterUpdate || !user.value)) {
        isLoadingUser.value = true;
        const response = await collectionServices.getUser();
        if ("error" in response) {
          socketOptions.session.clearSession();
          user.value = null;
        } else {
          user.value = response;
        }
        isLoadingUser.value = false;
      }
    },
    loadUserPermissions = async () => {
      userPermissions.value = await collectionServices.getUserPermissions();
    },
    hasRole = (thisPrivilege: string) =>
      userPermissions.value?.some(
        ({ privilege, role }) =>
          role === "EdgeCreator" && privilege === thisPrivilege,
      ) || false;
  return {
    ...collectionUtils,
    loginServices,
    issues,
    publicationUrlRoot,
    createPurchase,
    deletePurchase,
    fetchIssueCountsByCountrycode,
    fetchIssueCountsByPublicationcode,
    fetchPublicationNames,
    hasRole,
    hasSuggestions,
    isLoadingUser,
    coaIssueCountsByPublicationcode,
    copiesPerIssuecode,
    coaIssueCountsPerCountrycode,
    issueNumbersPerPublication,
    lastPublishedEdgesForCurrentUser,
    loadCollection,
    loadLastPublishedEdgesForCurrentUser,
    loadMarketplaceContactMethods,
    loadPopularIssuesInCollection,
    loadPreviousVisit,
    loadPurchases,
    loadSubscriptions,
    loadSuggestions,
    loadUser,
    loadUserPermissions,
    loadWatchedPublicationsWithSales,
    login,
    marketplaceContactMethods,
    popularIssuesInCollection,
    popularIssuesInCollectionWithoutEdge,
    previousVisit,
    purchases,
    purchasesById,
    signup,
    subscriptions,
    suggestions,
    totalPerPublicationUniqueIssueNumbers,
    totalPerPublicationUniqueIssueNumbersSorted,
    updateCollectionMultipleIssues,
    updateCollectionSingleIssue,
    updateMarketplaceContactMethods,
    updateWatchedPublicationsWithSales,
    user,
    userForAccountForm,
    userPermissions,
    watchedAuthors,
    watchedPublicationsWithSales,
  };
});
