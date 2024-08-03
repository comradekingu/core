import type { AugmentedIssue } from "~dm-types/AugmentedIssue";
import type { CoverSearchResults } from "~dm-types/CoverSearchResults";
import type { IssueCoverDetails } from "~dm-types/IssueCoverDetails";
import type { SimpleEntry } from "~dm-types/SimpleEntry";
import type { IssueWithIssuecodeOnly, PartInfo } from "~dm-types/SimpleIssue";
import type { StorySearchResults } from "~dm-types/StorySearchResults";
import type {
  inducks_issue,
  inducks_issuequotation,
  inducks_story,
  inducks_storyjob,
  inducks_storyversion,
} from "~prisma-schemas/schemas/coa";
import type { Errorable } from "~socket.io-services/types";



export const namespaceEndpoint = "/coa";
export default abstract class {
  static namespaceEndpoint = namespaceEndpoint;
  abstract getAuthorList: (
    personcodes: string[],
    callback: (value: { [_personcode: string]: string }) => void,
  ) => void;
  abstract searchAuthor: (
    partialAuthorName: string,
    callback: (value: Record<string, inducks_issue>) => void,
  ) => void;

  abstract getCountryList: (
    locale: string,
    countryCodes: string[],
    callback: (value: Record<string, string>) => void,
  ) => void;

  abstract getIssuesWithTitles: (
    publicationcodes: string[],
    callback: (
      value: Record<
        string,
        {
          issuecode: string;
          publicationcode: string;
          issuenumber: string;
          title: string | null;
        }[]
      >,
    ) => void,
  ) => void;
  abstract getIssueDetails: (
    issuecode: string,
    callback: (value: { releaseDate?: string; entries: SimpleEntry[] }) => void,
  ) => void;
  abstract getIssueCoverDetailsByPublicationcode: (
    publicationcode: string,
    callback: (value: { covers: Record<string, IssueCoverDetails> }) => void,
  ) => void;
  abstract getIssueCoverDetails: (
    issuecodes: string[],
    callback: (
      value: Errorable<
        { covers: Record<string, IssueCoverDetails> },
        "Too many requests"
      >,
    ) => void,
  ) => void;
  abstract getIssuesByIssuecode: (
    issuecodes: string[],
    callback: (value: CoverSearchResults) => void,
  ) => void;
  abstract getIssues: (
    issuecodes: string[],
    callback: ( 
      value: Record<string, AugmentedIssue<{partInfo?:PartInfo}>>,
    ) => void,
  ) => void;

  abstract getIssuesByPublicationcodes:(
    publicationcodes: string[],
    callback: (
      value: Record<string, AugmentedIssue[]>,
    ) => void,
  ) => void;

  abstract getIssuesByStorycode: (
    storycode: string,
    callback: (value: IssueWithIssuecodeOnly[]) => void,
  ) => void;
  abstract getRecentIssues: (
    callback: (value: AugmentedIssue[]) => void,
  ) => void;
  abstract getIssuesByPublicationCodes: (
    publicationCodes: string[],
    callback: (
      value: Errorable<{ issues: IssueWithIssuecodeOnly[] }, "Too many requests">,
    ) => void,
  ) => void;

  abstract getFullPublicationList: (
    callback: (value: Record<string, string>) => void,
  ) => void;

  abstract getPublicationListFromCountrycodes: (
    countrycodes: string[],
    callback: (value: Record<string, string>) => void,
  ) => void;
  abstract getPublicationListFromPublicationcodeList: (
    publicationCodes: string[],
    callback: (value: Record<string, string>) => void,
  ) => void;

  abstract getQuotationsByIssuecodes: (
    issueCodes: string[],
    callback: (
      value: Errorable<
        {
          quotations: Record<string, inducks_issuequotation>;
        },
        "Bad request" | "Too many requests"
      >,
    ) => void,
  ) => void;

  abstract searchStory: <WithIssues extends boolean>(
    keywords: string[],
    withIssues: WithIssues,
    callback: (value: StorySearchResults<WithIssues>) => void,
  ) => void;

  abstract getStoryDetails: (
    storycode: string,
    callback: (value: Errorable<{ data: inducks_story }, "Error">) => void,
  ) => void;
  abstract getStoryversionDetails: (
    storyversioncode: string,
    callback: (
      value: Errorable<{ data: inducks_storyversion }, "Error">,
    ) => void,
  ) => void;
  abstract getStoryjobs: (
    storyversioncode: string,
    callback: (value: Errorable<{ data: inducks_storyjob[] }, "Error">) => void,
  ) => void;
}
