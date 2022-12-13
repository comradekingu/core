import axios from "axios";
import { defineStore } from "pinia";

import { inducks_publication } from "~prisma_clients/client_coa";
import {
  authorUser,
  edge,
  issue,
  issue_condition,
  purchase,
  subscription,
  user,
} from "~prisma_clients/client_dm";
import { CollectionUpdate } from "~types/CollectionUpdate";
import { IssueSuggestion } from "~types/IssueSuggestion";
import { PopularIssue } from "~types/PopularIssue";
import { StoryDetail } from "~types/StoryDetail";

import { bookcase } from "./bookcase";
import { coa } from "./coa";

type IssueWithPublicationcode = issue & {
  publicationCode: string;
};

export type SubscriptionTransformed = Omit<
  subscription,
  "country" | "magazine"
> & {
  publicationCode: string;
};

type SubscriptionTransformedStringDates = Omit<
  SubscriptionTransformed,
  "startDate" | "endDate"
> & {
  startDate: string;
  endDate: string;
};

export const collection = defineStore("collection", {
  state: () => ({
    collection: null as IssueWithPublicationcode[] | null,
    watchedPublicationsWithSales: null as string[] | null,
    purchases: null as (purchase & { date: string })[] | null,
    watchedAuthors: null as authorUser[] | null,
    marketplaceContactMethods: null as string[] | null,

    suggestions: null as {
      issues: { [issuecode: string]: IssueSuggestion };
      minScore: number;
      maxScore: number;
      authors: { [personcode: string]: string };
      storyDetails: { [storycode: string]: StoryDetail } | undefined;
      publicationTitles: { [publicationcode: string]: inducks_publication };
    } | null,
    subscriptions: null as SubscriptionTransformed[] | null,

    popularIssuesInCollection: null as { [issuecode: string]: number } | null,
    lastPublishedEdgesForCurrentUser: null as edge[] | null,

    isLoadingUser: false as boolean,
    isLoadingCollection: false as boolean,
    isLoadingWatchedPublicationsWithSales: false as boolean,
    isLoadingMarketplaceContactMethods: false as boolean,
    isLoadingPurchases: false as boolean,
    isLoadingWatchedAuthors: false as boolean,
    isLoadingSuggestions: false as boolean,
    isLoadingSubscriptions: false as boolean,

    user: undefined as user | undefined | null,
    previousVisit: null as Date | null,
  }),

  getters: {
    total: ({ collection }): number | undefined => collection?.length,

    issuesByIssueCode: ({ collection }) =>
      collection?.reduce((acc, issue) => {
        const issuecode = `${issue.publicationCode} ${issue.issueNumber}`;
        if (!acc[issuecode]) {
          acc[issuecode] = [];
        }
        return {
          ...acc,
          [issuecode]: [...acc[issuecode], issue],
        };
      }, {} as { [issuecode: string]: issue[] }),

    duplicateIssues(): {
      [issuecode: string]: IssueWithPublicationcode[];
    } {
      const issuesByIssueCode = this.issuesByIssueCode;
      return (
        (issuesByIssueCode &&
          Object.keys(issuesByIssueCode).reduce(
            (acc, issuecode) =>
              issuesByIssueCode[issuecode].length > 1
                ? {
                    ...acc,
                    [issuecode]: issuesByIssueCode[issuecode],
                  }
                : acc,
            {}
          )) ||
        {}
      );
    },

    issuesInToReadStack: ({ collection }) =>
      collection && collection.filter(({ isToRead }) => isToRead),

    issuesInOnSaleStack: ({ collection }) =>
      collection && collection.filter(({ isOnSale }) => isOnSale),

    totalUniqueIssues(): number {
      return (
        (this.duplicateIssues &&
          (!this.collection?.length
            ? 0
            : this.collection?.length -
              Object.values(this.duplicateIssues).reduce(
                (acc, duplicatedIssue) => acc + duplicatedIssue.length - 1,
                0
              ))) ||
        0
      );
    },

    totalPerCountry: ({ collection }) =>
      collection?.reduce(
        (acc, issue) => ({
          ...acc,
          [issue.country]: (acc[issue.country] || 0) + 1,
        }),
        {} as { [countrycode: string]: number }
      ),

    totalPerPublication: ({ collection }) =>
      collection?.reduce((acc, issue) => {
        const publicationcode = `${issue.country}/${issue.magazine}`;
        return { ...acc, [publicationcode]: (acc[publicationcode] || 0) + 1 };
      }, {} as { [publicationcode: string]: number }) || null,

    hasSuggestions: ({ suggestions }) =>
      suggestions?.issues && Object.keys(suggestions.issues).length,

    issueNumbersPerPublication(): { [publicationcode: string]: string[] } {
      return (
        this.collection?.reduce(
          (acc, { country, issueNumber, magazine }) => ({
            ...acc,
            [`${country}/${magazine}`]: [
              ...(acc[`${country}/${magazine}`] || []),
              issueNumber,
            ],
          }),
          {} as { [publicationcode: string]: string[] }
        ) || {}
      );
    },

    totalPerPublicationUniqueIssueNumbers() {
      const issueNumbersPerPublication: {
        [publicationcode: string]: string[];
      } = this.issueNumbersPerPublication;
      return (
        issueNumbersPerPublication &&
        Object.keys(issueNumbersPerPublication).reduce(
          (acc, publicationCode) => ({
            ...acc,
            [publicationCode]: [
              ...new Set(issueNumbersPerPublication[publicationCode]),
            ].length,
          }),
          {}
        )
      );
    },

    popularIssuesInCollectionWithoutEdge: () =>
      bookcase()
        .bookcaseWithPopularities?.filter(
          ({ edgeId, popularity }) => !edgeId && popularity && popularity > 0
        )
        .sort(({ popularity: popularity1 }, { popularity: popularity2 }) =>
          popularity2 && popularity1 ? popularity2 - popularity1 : 0
        ),

    quotedIssues():
      | {
          publicationCode: string;
          issueNumber: string;
          condition: issue_condition;
          estimation: number;
          estimationGivenCondition: number;
        }[]
      | null {
      const issueQuotations = coa().issueQuotations;
      if (issueQuotations === null) {
        return null;
      }
      const getEstimation = (publicationCode: string, issueNumber: string) => {
        const estimationData =
          issueQuotations[`${publicationCode} ${issueNumber}`];
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
        this.collection
          ?.filter(({ publicationCode, issueNumber }) =>
            getEstimation(publicationCode, issueNumber)
          )
          .map(({ publicationCode, issueNumber, condition }) => {
            const estimation = getEstimation(publicationCode, issueNumber);
            return {
              publicationCode,
              issueNumber,
              condition,
              estimation,
              estimationGivenCondition: parseFloat(
                (CONDITION_TO_ESTIMATION_PCT[condition] * estimation).toFixed(1)
              ),
            };
          }) || null
      );
    },

    quotationSum() {
      return (
        this.quotedIssues &&
        Math.round(
          this.quotedIssues()?.reduce(
            (acc, { estimationGivenCondition }) =>
              acc + estimationGivenCondition,
            0
          ) || 0
        )
      );
    },
  },

  actions: {
    async updateCollection(data: CollectionUpdate) {
      await axios.post("/collection/issues", data);
      await this.loadCollection(true);
    },

    async createPurchase(date: string, description: string) {
      await axios.put("/collection/purchases", {
        date,
        description,
      });
      await this.loadPurchases(true);
    },

    async deletePurchase(id: number) {
      await axios.delete(`/collection/purchases/${id}`);
      await this.loadPurchases(true);
    },

    findInCollection(publicationCode: string, issueNumber: string) {
      return this.collection?.find(
        ({ country, magazine, issueNumber: collectionIssueNumber }) =>
          publicationCode === `${country}/${magazine}` &&
          collectionIssueNumber === issueNumber
      );
    },
    async loadPreviousVisit() {
      this.previousVisit = (await axios.post("/collection/lastvisit")).data;
    },
    async loadCollection(afterUpdate = false) {
      if (afterUpdate || (!this.isLoadingCollection && !this.collection)) {
        this.isLoadingCollection = true;
        this.collection = (
          (await axios.get("/collection/issues")).data as issue[]
        ).map((issue) => ({
          ...issue,
          publicationCode: `${issue.country}/${issue.magazine}`,
        }));
        this.isLoadingCollection = false;
      }
    },
    async loadPurchases(afterUpdate = false) {
      if (afterUpdate || (!this.isLoadingPurchases && !this.purchases)) {
        this.isLoadingPurchases = true;
        this.purchases = (await axios.get("/collection/purchases")).data;
        this.isLoadingPurchases = false;
      }
    },
    async loadWatchedAuthors(afterUpdate = false) {
      if (
        afterUpdate ||
        (!this.isLoadingWatchedAuthors && !this.watchedAuthors)
      ) {
        this.isLoadingWatchedAuthors = true;
        this.watchedAuthors = (
          await axios.get("/collection/authors/watched")
        ).data;
        this.isLoadingWatchedAuthors = false;
      }
    },
    async loadWatchedPublicationsWithSales(afterUpdate = false) {
      if (
        afterUpdate ||
        (!this.isLoadingWatchedPublicationsWithSales &&
          !this.watchedPublicationsWithSales)
      ) {
        this.isLoadingWatchedPublicationsWithSales = true;
        this.watchedPublicationsWithSales = (
          await axios.get("/collection/options/sales_notification_publications")
        ).data;
        this.isLoadingWatchedPublicationsWithSales = false;
      }
    },
    async loadMarketplaceContactMethods(afterUpdate = false) {
      if (
        afterUpdate ||
        (!this.isLoadingMarketplaceContactMethods &&
          !this.marketplaceContactMethods)
      ) {
        this.isLoadingMarketplaceContactMethods = true;
        this.marketplaceContactMethods = (
          await axios.get("/collection/options/marketplace_contact_methods")
        ).data;
        this.isLoadingMarketplaceContactMethods = false;
      }
    },
    async updateMarketplaceContactMethods() {
      await axios.post("/collection/options/marketplace_contact_methods", {
        values: this.marketplaceContactMethods,
      });
    },
    async updateWatchedPublicationsWithSales() {
      await axios.post("/collection/options/sales_notification_publications", {
        values: this.watchedPublicationsWithSales,
      });
    },
    async loadSuggestions({
      countryCode,
      sort,
      sinceLastVisit,
    }: {
      countryCode: string;
      sort: string;
      sinceLastVisit: boolean;
    }) {
      if (!this.isLoadingSuggestions) {
        this.isLoadingSuggestions = true;
        this.suggestions = (
          await axios.get(
            `/collection/stats/suggestedissues/${[
              countryCode || "ALL",
              sinceLastVisit ? "since_previous_visit" : "_",
              sort,
              sinceLastVisit ? 100 : 20,
            ].join("/")}`
          )
        ).data;
        this.isLoadingSuggestions = false;
      }
    },
    async loadSubscriptions(afterUpdate = false) {
      if (
        afterUpdate ||
        (!this.isLoadingSubscriptions && !this.subscriptions)
      ) {
        this.isLoadingSubscriptions = true;
        this.subscriptions = (
          await axios.get("/collection/subscriptions")
        ).data.map((subscription: SubscriptionTransformedStringDates) => ({
          ...subscription,
          startDate: new Date(Date.parse(subscription.startDate)),
          endDate: new Date(Date.parse(subscription.endDate)),
        }));
        this.isLoadingSubscriptions = false;
      }
    },
    async loadPopularIssuesInCollection() {
      if (!this.popularIssuesInCollection) {
        this.popularIssuesInCollection = (
          (await axios.get("/collection/popular")).data as PopularIssue[]
        ).reduce(
          (acc, issue) => ({
            ...acc,
            [`${issue.country}/${issue.magazine} ${issue.issueNumber}`]:
              issue.popularity,
          }),
          {}
        );
      }
    },
    async loadLastPublishedEdgesForCurrentUser() {
      if (!this.lastPublishedEdgesForCurrentUser) {
        this.lastPublishedEdgesForCurrentUser = (
          (await axios.get("/collection/edges/lastPublished")).data as edge[]
        ).map((edge) => ({
          ...edge,
          issuecode: `${edge.publicationcode} ${edge.issuenumber}`,
          timestamp: edge.creationDate.getTime() / 1000,
        }));
      }
    },

    async loadUser(afterUpdate = false) {
      if (!this.isLoadingUser && (afterUpdate || !this.user)) {
        this.isLoadingUser = true;
        try {
          this.user = (await axios.get(`/collection/user`)).data;
        } catch (e) {
          this.user = null;
        } finally {
          this.isLoadingUser = false;
        }
      }
    },
  },
});
