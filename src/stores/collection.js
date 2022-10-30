import axios from "axios";
import { defineStore } from "pinia";

import { bookcase } from "./bookcase";
import { coa } from "./coa";

export const collection = defineStore("collection", {
  state: () => ({
    collection: null,
    watchedPublicationsWithSales: null,
    purchases: null,
    watchedAuthors: null,

    suggestions: null,
    issuesOnSaleByOthers: null,

    subscriptions: null,

    popularIssuesInCollection: null,
    lastPublishedEdgesForCurrentUser: null,

    isLoadingUser: false,
    isLoadingCollection: false,
    isLoadingWatchedPublicationsWithSales: false,
    isLoadingPurchases: false,
    isLoadingWatchedAuthors: false,
    isLoadingSuggestions: false,
    isLoadingSubscriptions: false,

    user: undefined,
    previousVisit: null,
  }),

  getters: {
    total: ({ collection }) => collection?.length,

    duplicateIssues: ({ collection }) => {
      if (collection) {
        const issuesByIssueCode = collection.reduce((acc, issue) => {
          const issuecode = `${issue.publicationCode} ${issue.issueNumber}`;
          if (!acc[issuecode]) {
            acc[issuecode] = [];
          }
          return {
            ...acc,
            [issuecode]: [...acc[issuecode], issue],
          };
        }, {});
        return Object.keys(issuesByIssueCode).reduce((acc, issuecode) => {
          let issues = issuesByIssueCode[issuecode];
          return issues.length > 1 ? { ...acc, [issuecode]: issues } : acc;
        }, {});
      }
    },

    issuesInToReadStack: ({ collection }) =>
      collection && collection.filter(({ isToRead }) => isToRead),

    issuesInOnSaleStack: ({ collection }) =>
      collection && collection.filter(({ isOnSale }) => isOnSale),

    totalUniqueIssues: ({ collection, duplicateIssues }) =>
      duplicateIssues &&
      collection?.length -
        Object.values(duplicateIssues).reduce(
          (acc, duplicatedIssue) => acc + duplicatedIssue.length - 1,
          0
        ),

    totalPerCountry: ({ collection }) =>
      collection?.reduce(
        (acc, issue) => ({
          ...acc,
          [issue.country]: (acc[issue.country] || 0) + 1,
        }),
        {}
      ),

    totalPerPublication: ({ collection }) =>
      collection?.reduce((acc, issue) => {
        const publicationCode = `${issue.country}/${issue.magazine}`;
        return { ...acc, [publicationCode]: (acc[publicationCode] || 0) + 1 };
      }, {}),

    hasSuggestions: ({ suggestions }) =>
      suggestions?.issues && Object.keys(suggestions.issues).length,

    issueNumbersPerPublication: ({ collection }) =>
      collection?.reduce(
        (acc, { country, issueNumber, magazine }) => ({
          ...acc,
          [`${country}/${magazine}`]: [
            ...(acc[`${country}/${magazine}`] || []),
            issueNumber,
          ],
        }),
        {}
      ),

    totalPerPublicationUniqueIssueNumbers: ({ issueNumbersPerPublication }) =>
      issueNumbersPerPublication &&
      Object.keys(issueNumbersPerPublication).reduce(
        (acc, publicationCode) => ({
          ...acc,
          [publicationCode]: [
            ...new Set(issueNumbersPerPublication[publicationCode]),
          ].length,
        }),
        {}
      ),

    popularIssuesInCollectionWithoutEdge: () =>
      bookcase().bookcaseWithPopularities &&
      bookcase()
        .bookcaseWithPopularities.filter(
          ({ edgeId, popularity }) => !edgeId && popularity > 0
        )
        .sort(
          ({ popularity: popularity1 }, { popularity: popularity2 }) =>
            popularity2 - popularity1
        ),

    quotedIssues: ({ collection }) => {
      const issueQuotations = coa().issueQuotations;
      if (issueQuotations === null) {
        return null;
      }
      const getEstimation = (publicationCode, issueNumber) => {
        const estimationData =
          issueQuotations[`${publicationCode} ${issueNumber}`];
        return (
          estimationData &&
          (estimationData.max
            ? (estimationData.min + estimationData.max) / 2
            : estimationData.min)
        );
      };
      const CONDITION_TO_ESTIMATION_PCT = {
        bon: 1,
        moyen: 0.7,
        mauvais: 0.3,
        indefini: 0.7,
        "": 0.7,
      };
      return collection
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
        });
    },

    quotationSum: ({ quotedIssues }) =>
      quotedIssues &&
      Math.round(
        quotedIssues.reduce(
          (acc, { estimationGivenCondition }) => acc + estimationGivenCondition,
          0
        )
      ),
  },

  actions: {
    async updateCollection(data) {
      await axios.post("/collection/issues", data);
      await this.loadCollection(true);
    },

    async createPurchase(date, description) {
      await axios.put("/collection/purchases", {
        date,
        description,
      });
      await this.loadPurchases(true);
    },

    async deletePurchase(id) {
      await axios.delete(`/collection/purchases/${id}`);
      await this.loadPurchases(true);
    },

    findInCollection(publicationCode, issueNumber) {
      return this.collection?.find(
        ({ country, magazine, issueNumber: collectionIssueNumber }) =>
          publicationCode === `${country}/${magazine}` &&
          collectionIssueNumber === issueNumber
      );
    },
    setPreviousVisit(previousVisit) {
      this.previousVisit = previousVisit;
    },
    async loadCollection(afterUpdate = false) {
      if (afterUpdate || (!this.isLoadingCollection && !this.collection)) {
        this.isLoadingCollection = true;
        this.collection = (await axios.get("/collection/issues")).data.map(
          (issue) => ({
            ...issue,
            publicationCode: `${issue.country}/${issue.magazine}`,
          })
        );
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
    async loadIssuesOnSaleByOthers() {
      this.issuesOnSaleByOthers = (
        await axios.get("/collection/on-sale-by-others")
      ).data;
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
    async updateWatchedPublicationsWithSales() {
      await axios.post("/collection/options/sales_notification_publications", {
        values: this.watchedPublicationsWithSales,
      });
    },
    async loadSuggestions({ countryCode, sort, sinceLastVisit }) {
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
        ).data.map((subscription) => ({
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
          await axios.get("/collection/popular")
        ).data.reduce(
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
          await axios.get("/collection/edges/lastPublished")
        ).data.map((edge) => ({
          ...edge,
          issuecode: `${edge.country}/${edge.magazine} ${edge.issueNumber}`,
          timestamp: Date.parse(edge.creationDate) / 1000,
        }));
      }
    },

    async loadUser(afterUpdate = false) {
      if (!this.isLoadingUser && (afterUpdate || !this.user)) {
        this.isLoadingUser = true;
        try {
          this.user = Object.entries(
            (await axios.get(`/collection/user`)).data
          ).reduce((acc, [key, value]) => {
            switch (key) {
              case "accepterpartage":
                acc.isShareEnabled = value;
                break;
              case "affichervideo":
                acc.isVideoShown = value;
                break;
              case "presentationSentence":
                acc.presentationSentence = value;
                break;
              default:
                acc[key] = value;
                break;
            }
            return acc;
          }, {});
        } catch (e) {
          this.user = null;
        } finally {
          this.isLoadingUser = false;
        }
      }
    },
  },
});
