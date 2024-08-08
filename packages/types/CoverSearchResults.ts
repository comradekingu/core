import type { inducks_issuequotation } from "~prisma-schemas/schemas/coa";

export interface SimilarImagesResult {
  image_ids: number[];
  scores: number[];
  tags: string[];
  type: string;
}

export interface CoverSearchResults {
  covers: ({
    issuecode: string;
    fullUrl: string | null;
    publicationcode: string;
    issuenumber: string;
    popularity: number;
  } & Pick<inducks_issuequotation, "estimationMin" | "estimationMax">)[];
  type?: string;
}
