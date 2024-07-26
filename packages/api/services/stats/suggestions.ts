import type { Socket } from "socket.io";

import type { IssueSuggestion } from "~dm-types/IssueSuggestion";
import { IssueSuggestionList } from "~dm-types/IssueSuggestionList";
import type { StoryDetail } from "~dm-types/StoryDetail";
import type { SuggestionList } from "~dm-types/SuggestionList";
import { prismaCoa, prismaDm, prismaDmStats } from "~prisma-clients";
import { Prisma as PrismaDmStats } from "~prisma-clients/client_dm_stats";
import { userOptionType } from "~prisma-clients/extended/dm.extends";

import { getPublicationTitles } from "../coa/publications";

export enum COUNTRY_CODE_OPTION {
  ALL = "ALL",
  countries_to_notify = "countries_to_notify",
}

import type Events from "./types";
export default (socket: Socket<Events>) => {
  socket.on(
    "getSuggestionsForCountry",
    async (countrycode, sincePreviousVisit, limit, callback) => {
      const user = socket.data.user;
      const since =
        sincePreviousVisit === "since_previous_visit"
          ? (await prismaDm.user.findUnique({ where: { id: user!.id } }))!
            .previousAccess
          : null;

      const results: Partial<Parameters<typeof callback>[0]> = {};

      for (const sort of ['oldestdate', 'score'] as const) {
        const { suggestionsPerUser, authors, storyDetails, publicationTitles } =
          await getSuggestions(since, countrycode, sort, user!.id, limit, true);

        const suggestionsForUser =
          suggestionsPerUser[user!.id] || new IssueSuggestionList();

        results[sort] = {
          issues: suggestionsForUser.issues,
          minScore: suggestionsForUser.minScore,
          maxScore: suggestionsForUser.maxScore,
          authors,
          storyDetails,
          publicationTitles
        };
      }

      callback(results as Parameters<typeof callback>[0])
    })
}

const suggestedPublications =
  PrismaDmStats.validator<PrismaDmStats.suggestedIssueForUserArgs>()({
    select: {
      userId: true,
      score: true,
      publicationcode: true,
      shortIssuenumber: true,
      oldestdate: true,
    },
  });

const missingPublications =
  PrismaDmStats.validator<PrismaDmStats.utilisateurs_publications_manquantesArgs>()(
    {
      select: { personcode: true, storycode: true },
    },
  );

interface Suggestion
  extends PrismaDmStats.utilisateurs_publications_manquantesGetPayload<
    typeof missingPublications
  >,
  PrismaDmStats.suggestedIssueForUserGetPayload<
    typeof suggestedPublications
  > { }

const getStoryDetails = async (
  storyCodes: string[],
  associatedPublicationCodes: string[],
  associatedShortIssueNumbers: string[],
) => {
  if (!storyCodes.length) {
    return {};
  }

  const stories = (
    await prismaCoa.$queryRawUnsafe<StoryDetail[]>(`
      SELECT story.storycode,
             story.storycomment,
             COALESCE(entry.title, story.title) as title,
             null as personcode
      FROM inducks_story as story
          INNER JOIN inducks_storyversion USING (storycode)
          INNER JOIN inducks_entry entry USING (storyversioncode)
          INNER JOIN inducks_issue issue USING (short_issuecode)
          WHERE ${storyCodes
        .map(
          (storyCode, idx) =>
            `story.storycode = '${storyCode}' AND issue.publicationcode = '${associatedPublicationCodes[idx]}' AND issue.short_issuenumber = '${associatedShortIssueNumbers[idx]}'`,
        )
        .join(" OR ")}
      ORDER BY story.storycode
  `)
  ).reduce((acc, story) => ({ ...acc, [story.storycode]: story }), {}) as {
    [storycode: string]: StoryDetail;
  };

  for (const storycode of storyCodes) {
    if (!stories[storycode]) {
      stories[storycode] = {
        storycode,
        storycomment: "",
        title: "?",
        personcode: null,
      };
    }
  }

  return stories;
};

export const getSuggestions = async (
  since: Date | null,
  countrycode: string,
  sort: "score" | "oldestdate",
  singleUserId: number | null,
  limit: number | null,
  withStoryDetails: boolean,
): Promise<SuggestionList> => {
  const emptySuggestionList = {
    storyDetails: {},
    suggestionsPerUser: {},
    publicationTitles: {},
    authors: {},
  } as SuggestionList;
  if (!["score", "oldestdate"].includes(sort)) {
    return emptySuggestionList;
  }
  const singleCountry = Object.values(COUNTRY_CODE_OPTION).includes(
    countrycode as COUNTRY_CODE_OPTION,
  )
    ? null
    : countrycode;
  const suggestions = await prismaDmStats.$queryRawUnsafe<Suggestion[]>(`
      SELECT suggested.ID_User AS userId,
             suggested.Score   AS score,
             suggested.publicationcode,
             suggested.short_issuenumber AS shortIssuenumber,
             replace(suggested.oldestdate,'-00', '-01') AS oldestdate,
             missing.personcode,
             missing.storycode
      FROM utilisateurs_publications_suggerees as suggested
               INNER JOIN utilisateurs_publications_manquantes as missing
                          USING (ID_User, publicationcode, short_issuenumber)
      WHERE suggested.oldestdate <= '${new Date().toISOString().split("T")[0]}'
        AND (${since
      ? `suggested.oldestdate > '${since.toISOString().split("T")[0]}'`
      : "1=1"
    })
        AND (${singleUserId ? `suggested.ID_User = ${singleUserId}` : "1=1"})
        AND (${singleCountry
      ? `suggested.publicationcode LIKE '${singleCountry}/%'`
      : "1=1"
    })
      ORDER BY ID_User, ${sort} DESC, publicationcode, short_issuenumber
      LIMIT 50
  `);

  if (!suggestions.length) {
    return emptySuggestionList;
  }

  const countriesToNotifyPerUser =
    countrycode === COUNTRY_CODE_OPTION.countries_to_notify
      ? await getOptionValueAllUsers(
        userOptionType.suggestion_notification_country,
      )
      : null;

  const suggestionsPerUser: { [userId: number]: IssueSuggestionList } = {};
  const referencedIssues = [];
  const referencedStories: Suggestion[] = [];
  for (const suggestedStory of suggestions) {
    const { userId } = suggestedStory;

    if (
      isSuggestionInCountriesToNotify(
        countriesToNotifyPerUser,
        userId,
        suggestedStory,
      )
    ) {
      if (!suggestionsPerUser[userId]) {
        suggestionsPerUser[userId] = new IssueSuggestionList();
      }

      const shortIssuecode = [
        suggestedStory.publicationcode,
        suggestedStory.shortIssuenumber,
      ].join(" ");
      if (
        limit &&
        !suggestionsPerUser[userId].issues[shortIssuecode] &&
        Object.keys(suggestionsPerUser[userId].issues).length >= limit
      ) {
        continue;
      }
      let issue = suggestionsPerUser[userId].issues[shortIssuecode];
      if (!issue) {
        issue = {
          shortIssuenumber: suggestedStory.shortIssuenumber,
          personcode: suggestedStory.personcode,
          score: suggestedStory.score,
          publicationcode: suggestedStory.publicationcode,
          oldestdate:
            (typeof suggestedStory.oldestdate === "string"
              ? suggestedStory.oldestdate
              : suggestedStory.oldestdate?.toISOString().split("T")[0]) || "",
              shortIssuecode,
          stories: {},
        } as IssueSuggestion;
      }
      if (!issue.stories[suggestedStory.personcode]) {
        issue.stories[suggestedStory.personcode] = [];
      }
      issue.stories[suggestedStory.personcode].push(suggestedStory.storycode);
      suggestionsPerUser[userId].issues[issue.shortIssuecode] = issue;
      referencedIssues.push(issue);
      referencedStories.push(suggestedStory);
    }
  }

  for (const userId in suggestionsPerUser) {
    const scores = Object.values(suggestionsPerUser[userId].issues).map(
      ({ score }) => score,
    );
    suggestionsPerUser[userId].minScore = Math.min(...scores);
    suggestionsPerUser[userId].maxScore = Math.max(...scores);
  }

  const authors = (
    await prismaCoa.inducks_person.findMany({
      where: {
        personcode: {
          in: [
            ...new Set(referencedStories.map(({ personcode }) => personcode)),
          ],
        },
      },
    })
  ).reduce(
    (acc, value) => ({ ...acc, [value.personcode]: value.fullname }),
    {},
  ) as { [personcode: string]: string };

  let storyDetails: { [storycode: string]: StoryDetail } = {};
  if (withStoryDetails) {
    storyDetails = await getStoryDetails(
      referencedStories.map(({ storycode }) => storycode),
      referencedStories.map(({ publicationcode }) => publicationcode),
      referencedStories.map(({ shortIssuenumber }) => shortIssuenumber),
    );

    for (const referencedStory of referencedStories) {
      storyDetails[referencedStory.storycode].personcode =
        referencedStory.personcode;
    }
  }

  const publicationTitles = await getPublicationTitles({
    publicationcode: {
      in: [
        ...new Set(
          referencedIssues.map(({ publicationcode }) => publicationcode),
        ),
      ],
    },
  });

  return { suggestionsPerUser, authors, storyDetails, publicationTitles };
};

const isSuggestionInCountriesToNotify = (
  countriesToNotify: { [userId: number]: string[] } | null,
  userId: number,
  suggestion: Suggestion,
): boolean =>
  !countriesToNotify
    ? true
    : !countriesToNotify[userId]
      ? false
      : countriesToNotify[userId].some(
        (countryToNotify) =>
          suggestion.publicationcode.indexOf(`${countryToNotify}/`) === 0,
      );

const getOptionValueAllUsers = async (optionName: userOptionType) =>
  (
    await prismaDm.userOption.findMany({
      where: {
        optionName,
      },
    })
  ).reduce(
    (acc, value) => ({
      ...acc,
      [value.userId]: [...(acc[value.userId] || []), value],
    }),
    {} as { [userId: string]: string[] },
  );
