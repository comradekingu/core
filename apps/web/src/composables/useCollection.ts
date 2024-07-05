import { QuotedIssue } from "~dm-types/QuotedIssue";
import { issue_condition } from "~prisma-clients/extended/dm.extends";
import { issue } from "~prisma-clients/extended/dm.extends";

import { coa } from "../stores/coa";

export default (issues: Ref<issue[] | null>) => {
  const total = computed(() => issues.value?.length);
  const mostPossessedPublication = computed(
    () =>
      totalPerPublication.value &&
      Object.keys(totalPerPublication.value).reduce(
        (acc, publicationcode) =>
          acc &&
          totalPerPublication.value![acc] >
            totalPerPublication.value![publicationcode]
            ? acc
            : publicationcode,
        null as string | null,
      ),
  );

  const totalPerPublication = computed(
      () =>
        issues.value?.reduce(
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
    issuesByShortIssuecode = computed(() =>
      issues.value?.reduce<{ [shortIssuecode: string]: issue[] }>(
        (acc, issue) => ({
          ...acc,
          [issue.shortIssuecode]: [...(acc[issue.shortIssuecode] || []), issue],
        }),
        {},
      ),
    ),
    duplicateIssues = computed(
      (): {
        [shortIssuecode: string]: issue[];
      } =>
        (issuesByShortIssuecode.value &&
          Object.keys(issuesByShortIssuecode.value).reduce(
            (acc, shortIssuecode) =>
              issuesByShortIssuecode.value![shortIssuecode].length > 1
                ? {
                    ...acc,
                    [shortIssuecode]:
                      issuesByShortIssuecode.value![shortIssuecode],
                  }
                : acc,
            {},
          )) ||
        {},
    ),
    issuesInToReadStack = computed(() =>
      issues.value?.filter(({ isToRead }) => isToRead),
    ),
    issuesInOnSaleStack = computed(() =>
      issues.value?.filter(({ isOnSale }) => isOnSale),
    ),
    totalUniqueIssues = computed(
      () =>
        (duplicateIssues.value &&
          (!issues.value?.length
            ? 0
            : issues.value?.length -
              Object.values(duplicateIssues.value).reduce(
                (acc, duplicatedIssue) => acc + duplicatedIssue.length - 1,
                0,
              ))) ||
        0,
    ),
    totalPerCountry = computed(() =>
      issues.value?.reduce(
        (acc, issue) => ({
          ...acc,
          [issue.country]: (acc[issue.country] || 0) + 1,
        }),
        {} as { [countrycode: string]: number },
      ),
    ),
    numberPerCondition = computed(
      () =>
        issues.value?.reduce<Record<issue_condition, number>>(
          (acc, { condition }) => ({
            ...acc,
            [condition || "indefini"]: (acc[condition || "indefini"] || 0) + 1,
          }),
          {} as Record<issue_condition, number>,
        ) || ({} as Record<issue_condition, number>),
    ),
    findInCollection = (publicationcode: string, issuenumber: string) =>
      issues.value?.find(
        ({ country, magazine, issuenumber: collectionIssueNumber }) =>
          publicationcode === `${country}/${magazine}` &&
          collectionIssueNumber === issuenumber,
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
        issues.value
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
    );

  return {
    duplicateIssues,
    issuesInOnSaleStack,
    issuesInToReadStack,
    issuesByShortIssuecode,
    mostPossessedPublication,
    numberPerCondition,
    quotedIssues,
    quotationSum,
    total,
    totalPerCountry,
    totalPerPublication,
    totalUniqueIssues,
    findInCollection,
  };
};
