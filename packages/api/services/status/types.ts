import { Errorable } from "../types";

export interface Services {
  getDbStatus: (
    callback: (
      value: Errorable<
        void,
        "Some DB checks have failed" | "Some COA tables are empty"
      >
    ) => void
  ) => void;
  getPastecStatus: (
    callback: (
      value: Errorable<
        { numberOfImages: number },
        "Pastec /imageIds response is invalid" | "Pastec is unreachable"
      >
    ) => void
  ) => void;
  getPastecSearchStatus: (
    callback: (
      value: Errorable<
        { numberOfImages: number },
        | "Pastec search returned no image"
        | "Pastec /searcher response is invalid"
        | "Pastec is unreachable"
      >
    ) => void
  ) => void;
}

export const NamespaceEndpoint = "/status";
