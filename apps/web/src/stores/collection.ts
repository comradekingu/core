import { AxiosInstance } from "axios";
import { AxiosError } from "axios";
import { defineStore } from "pinia";

import {
  DELETE__collection__purchases__$id,
  GET__collection__edges__lastPublished,
  GET__collection__issues,
  GET__collection__options__$optionName,
  GET__collection__popular,
  GET__collection__purchases,
  GET__collection__stats__suggestedissues__$countrycode__$sincePreviousVisit__$sort__$limit,
  GET__collection__subscriptions,
  GET__collection__user,
  POST__collection__issues__multiple,
  POST__collection__issues__single,
  POST__collection__lastvisit,
  POST__collection__options__$optionName,
  POST__login,
  PUT__collection__purchases,
  PUT__collection__user,
} from "~api-routes";
import { addUrlParamsRequestInterceptor, call } from "~axios-helper";
import {
  CollectionUpdateMultipleIssues,
  CollectionUpdateSingleIssue,
} from "~dm-types/CollectionUpdate";
import {
  authorUser,
  issue,
  issue_condition,
  purchase,
  subscription,
  user,
} from "~prisma-clients/client_dm";

import { bookcase } from "./bookcase";
import { coa } from "./coa";

export type IssueWithPublicationcode = issue & {
  publicationcode: string;
};

export type IssueWithPublicationcodeOptionalId = Omit<
  IssueWithPublicationcode,
  "id"
> & {
  id: number | null;
};

export type SubscriptionTransformed = Omit<
  subscription,
  "country" | "magazine"
> & {
  publicationcode: string;
};

type SubscriptionTransformedStringDates = Omit<
  SubscriptionTransformed,
  "startDate" | "endDate"
> & {
  startDate: string;
  endDate: string;
};

export type purchaseWithStringDate = Omit<purchase, "date"> & {
  date: string;
};

export type QuotedIssue = {
  publicationcode: string;
  issuenumber: string;
  condition: issue_condition;
  estimation: number;
  estimationGivenCondition: number;
};

let api: AxiosInstance,
  sessionExistsFn: () => Promise<boolean>,
  clearSessionFn: () => Promise<void>;

export const collection = defineStore("collection", () => {
  const collection = ref(null as IssueWithPublicationcode[] | null),
    watchedPublicationsWithSales = ref(null as string[] | null),
    purchases = ref(null as purchaseWithStringDate[] | null),
    watchedAuthors = ref(null as authorUser[] | null),
    marketplaceContactMethods = ref(null as string[] | null),
    suggestions = ref(
      null as
        | GET__collection__stats__suggestedissues__$countrycode__$sincePreviousVisit__$sort__$limit["resBody"]
        | null,
    ),
    subscriptions = ref(null as SubscriptionTransformed[] | null),
    popularIssuesInCollection = ref(
      null as { [issuecode: string]: number } | null,
    ),
    lastPublishedEdgesForCurrentUser = ref(
      null as GET__collection__edges__lastPublished["resBody"] | null,
    ),
    isLoadingUser = ref(false as boolean),
    isLoadingCollection = ref(false as boolean),
    isLoadingWatchedPublicationsWithSales = ref(false as boolean),
    isLoadingMarketplaceContactMethods = ref(false as boolean),
    isLoadingPurchases = ref(false as boolean),
    isLoadingSuggestions = ref(false as boolean),
    isLoadingSubscriptions = ref(false as boolean),
    user = ref(undefined as Omit<user, "password"> | undefined | null),
    previousVisit = ref(null as Date | null),
    total = computed(() => collection.value?.length),
    issuesByIssueCode = computed(
      () =>
        collection.value?.reduce(
          (acc, issue) => {
            const issuecode = `${issue.publicationcode} ${issue.issuenumber}`;
            return {
              ...acc,
              [issuecode]: [...(acc[issuecode] || []), issue],
            };
          },
          {} as { [issuecode: string]: IssueWithPublicationcode[] },
        ),
    ),
    duplicateIssues = computed(
      (): {
        [issuecode: string]: IssueWithPublicationcode[];
      } =>
        (issuesByIssueCode.value &&
          Object.keys(issuesByIssueCode.value).reduce(
            (acc, issuecode) =>
              issuesByIssueCode.value![issuecode].length > 1
                ? {
                    ...acc,
                    [issuecode]: issuesByIssueCode.value![issuecode],
                  }
                : acc,
            {},
          )) ||
        {},
    ),
    issuesInToReadStack = computed(
      () => collection.value?.filter(({ isToRead }) => isToRead),
    ),
    issuesInOnSaleStack = computed(
      () => collection.value?.filter(({ isOnSale }) => isOnSale),
    ),
    totalUniqueIssues = computed(
      () =>
        (duplicateIssues.value &&
          (!collection.value?.length
            ? 0
            : collection.value?.length -
              Object.values(duplicateIssues.value).reduce(
                (acc, duplicatedIssue) => acc + duplicatedIssue.length - 1,
                0,
              ))) ||
        0,
    ),
    totalPerCountry = computed(
      () =>
        collection.value?.reduce(
          (acc, issue) => ({
            ...acc,
            [issue.country]: (acc[issue.country] || 0) + 1,
          }),
          {} as { [countrycode: string]: number },
        ),
    ),
    totalPerPublication = computed(
      () =>
        collection.value?.reduce(
          (acc, issue) => {
            const publicationcode = `${issue.country}/${issue.magazine}`;
            return {
              ...acc,
              [publicationcode]: (acc[publicationcode] || 0) + 1,
            };
          },
          {} as { [publicationcode: string]: number },
        ) || null,
    ),
    numberPerCondition = computed(
      () =>
        collection.value?.reduce(
          (acc, { condition }) => ({
            ...acc,
            [condition || "indefini"]: (acc[condition || "indefini"] || 0) + 1,
          }),
          {} as { [condition: string]: number },
        ) || {},
    ),
    purchasesById = computed(
      () =>
        purchases.value?.reduce(
          (acc, purchase) => ({ ...acc, [purchase.id]: purchase }),
          {},
        ),
    ),
    hasSuggestions = computed(
      () =>
        suggestions.value?.issues &&
        Object.keys(suggestions.value.issues).length,
    ),
    issueNumbersPerPublication = computed(
      () =>
        collection.value?.reduce(
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
    popularIssuesInCollectionWithoutEdge = computed(
      () =>
        bookcase()
          .bookcaseWithPopularities?.filter(
            ({ edgeId, popularity }) => !edgeId && popularity && popularity > 0,
          )
          .sort(({ popularity: popularity1 }, { popularity: popularity2 }) =>
            popularity2 && popularity1 ? popularity2 - popularity1 : 0,
          ),
    ),
    quotedIssues = computed((): QuotedIssue[] | null => {
      const issueQuotations = coa().issueQuotations;
      if (issueQuotations === null) {
        return null;
      }
      const getEstimation = (publicationcode: string, issuenumber: string) => {
        const estimationData =
          issueQuotations[`${publicationcode} ${issuenumber}`];
        return (
          (estimationData &&
            (estimationData.max
              ? ((estimationData.min || 0) + estimationData.max) / 2
              : estimationData.min)) ||
          0
        );
      };
      const CONDITION_TO_ESTIMATION_PCT = {
        bon: 1,
        moyen: 0.7,
        mauvais: 0.3,
        indefini: 0.7,
        "": 0.7,
      };
      return (
        collection.value
          ?.filter(({ publicationcode, issuenumber }) =>
            getEstimation(publicationcode, issuenumber),
          )
          .map(({ publicationcode, issuenumber, condition }) => {
            const estimation = getEstimation(publicationcode, issuenumber);
            return {
              publicationcode,
              issuenumber,
              condition,
              estimation,
              estimationGivenCondition: parseFloat(
                (CONDITION_TO_ESTIMATION_PCT[condition] * estimation).toFixed(
                  1,
                ),
              ),
            };
          }) || null
      );
    }),
    quotationSum = computed(() =>
      quotedIssues.value
        ? Math.round(
            quotedIssues.value?.reduce(
              (acc, { estimationGivenCondition }) =>
                acc + estimationGivenCondition,
              0,
            ) || 0,
          )
        : null,
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
      await call(
        api,
        new POST__collection__issues__single({
          reqBody: data,
        }),
      );
      await loadCollection(true);
    },
    updateCollectionMultipleIssues = async (
      data: CollectionUpdateMultipleIssues,
    ) => {
      await call(
        api,
        new POST__collection__issues__multiple({
          reqBody: data,
        }),
      );
      await loadCollection(true);
    },
    createPurchase = async (date: string, description: string) => {
      await call(
        api,
        new PUT__collection__purchases({
          reqBody: { date, description },
        }),
      );
      await loadPurchases(true);
    },
    deletePurchase = async (id: number) => {
      await call(
        api,
        new DELETE__collection__purchases__$id({
          params: { id: String(id) },
        }),
      );
      await loadPurchases(true);
    },
    findInCollection = (publicationcode: string, issuenumber: string) =>
      collection.value?.find(
        ({ country, magazine, issuenumber: collectionIssueNumber }) =>
          publicationcode === `${country}/${magazine}` &&
          collectionIssueNumber === issuenumber,
      ),
    loadPreviousVisit = async () => {
      previousVisit.value = (await call(api, new POST__collection__lastvisit()))
        .data?.previousVisit;
    },
    loadCollection = async (afterUpdate = false) => {
      if (afterUpdate || (!isLoadingCollection.value && !collection.value)) {
        isLoadingCollection.value = true;
        collection.value = (
          await call(api, new GET__collection__issues())
        ).data.map((issue) => ({
          ...issue,
          publicationcode: `${issue.country}/${issue.magazine}`,
        }));
        isLoadingCollection.value = false;
      }
    },
    loadPurchases = async (afterUpdate = false) => {
      if (afterUpdate || (!isLoadingPurchases.value && !purchases.value)) {
        isLoadingPurchases.value = true;
        purchases.value = (
          await call(api, new GET__collection__purchases())
        ).data;
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
        watchedPublicationsWithSales.value = (
          await call(
            api,
            new GET__collection__options__$optionName({
              params: {
                optionName: "sales_notification_publications",
              },
            }),
          )
        ).data;
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
        marketplaceContactMethods.value = (
          await call(
            api,
            new GET__collection__options__$optionName({
              params: { optionName: "marketplace_contact_methods" },
            }),
          )
        ).data;
        isLoadingMarketplaceContactMethods.value = false;
      }
    },
    updateMarketplaceContactMethods = async () =>
      await call(
        api,
        new POST__collection__options__$optionName({
          reqBody: { values: marketplaceContactMethods.value! },
          params: {
            optionName: "marketplace_contact_methods",
          },
        }),
      ),
    updateWatchedPublicationsWithSales = async () =>
      await call(
        api,
        new POST__collection__options__$optionName({
          reqBody: {
            values: watchedPublicationsWithSales.value!,
          },
          params: {
            optionName: "sales_notification_publications",
          },
        }),
      ),
    loadSuggestions = async ({
      countryCode,
      sort,
      sinceLastVisit,
    }: {
      countryCode: string;
      sort: "score" | "oldestdate";
      sinceLastVisit: boolean;
    }) => {
      if (!isLoadingSuggestions.value) {
        isLoadingSuggestions.value = true;
        suggestions.value = (
          await call(
            api,
            new GET__collection__stats__suggestedissues__$countrycode__$sincePreviousVisit__$sort__$limit(
              {
                params: {
                  countrycode: countryCode || "ALL",
                  sincePreviousVisit: sinceLastVisit
                    ? "since_previous_visit"
                    : "_",
                  sort,
                  limit: sinceLastVisit ? "100" : "20",
                },
              },
            ),
          )
        ).data;
        isLoadingSuggestions.value = false;
      }
    },
    loadSubscriptions = async (afterUpdate = false) => {
      if (
        afterUpdate ||
        (!isLoadingSubscriptions.value && !subscriptions.value)
      ) {
        isLoadingSubscriptions.value = true;
        subscriptions.value = (
          await call(api, new GET__collection__subscriptions())
        ).data.map((subscription: SubscriptionTransformedStringDates) => ({
          ...subscription,
          startDate: new Date(Date.parse(subscription.startDate)),
          endDate: new Date(Date.parse(subscription.endDate)),
        }));
        isLoadingSubscriptions.value = false;
      }
    },
    loadPopularIssuesInCollection = async () => {
      if (!popularIssuesInCollection.value) {
        popularIssuesInCollection.value = (
          await call(api, new GET__collection__popular())
        ).data.reduce(
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
        lastPublishedEdgesForCurrentUser.value = (
          await call(api, new GET__collection__edges__lastPublished())
        ).data;
      }
    },
    login = async (
      username: string,
      password: string,
      onSuccess: (token: string) => void,
      onError: (e: AxiosError) => void,
    ) => {
      try {
        onSuccess(
          (
            await call(
              api,
              new POST__login({
                reqBody: {
                  username,
                  password,
                },
              }),
            )
          ).data.token,
        );
      } catch (e) {
        onError(e as AxiosError);
      }
    },
    signup = async (
      username: string,
      password: string,
      password2: string,
      email: string,
      onSuccess: (token: string) => void,
      onError: (e: AxiosError) => void,
    ) => {
      try {
        onSuccess(
          (
            await call(
              api,
              new PUT__collection__user({
                reqBody: {
                  username,
                  password,
                  password2,
                  email,
                },
              }),
            )
          ).data.token,
        );
      } catch (e) {
        onError(e as AxiosError);
      }
    },
    loadUser = async (afterUpdate = false) => {
      if (!isLoadingUser.value && (afterUpdate || !user.value)) {
        isLoadingUser.value = true;
        try {
          if (await sessionExistsFn()) {
            user.value = (await call(api, new GET__collection__user())).data;
          }
        } catch (e) {
          console.error(e);
          await clearSessionFn();
          user.value = null;
        } finally {
          isLoadingUser.value = false;
        }
      }
    };
  return {
    setApi: (params: {
      api: typeof api;
      sessionExistsFn: typeof sessionExistsFn;
      clearSessionFn: typeof clearSessionFn;
    }) => {
      api = addUrlParamsRequestInterceptor(params.api);
      sessionExistsFn = params.sessionExistsFn;
      clearSessionFn = params.clearSessionFn;
    },
    collection,
    createPurchase,
    deletePurchase,
    duplicateIssues,
    findInCollection,
    hasSuggestions,
    issueNumbersPerPublication,
    issuesByIssueCode,
    issuesInOnSaleStack,
    issuesInToReadStack,
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
    loadWatchedPublicationsWithSales,
    login,
    marketplaceContactMethods,
    numberPerCondition,
    popularIssuesInCollection,
    popularIssuesInCollectionWithoutEdge,
    previousVisit,
    purchases,
    purchasesById,
    quotationSum,
    quotedIssues,
    signup,
    subscriptions,
    suggestions,
    total,
    totalPerCountry,
    totalPerPublication,
    totalPerPublicationUniqueIssueNumbers,
    totalPerPublicationUniqueIssueNumbersSorted,
    totalUniqueIssues,
    updateCollectionMultipleIssues,
    updateCollectionSingleIssue,
    updateMarketplaceContactMethods,
    updateWatchedPublicationsWithSales,
    user,
    userForAccountForm,
    watchedAuthors,
    watchedPublicationsWithSales,
  };
});
