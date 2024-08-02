import type { Errorable } from "~socket.io-services/types";

export const namespaceEndpoint = "/upload";
export default abstract class {
  static namespaceEndpoint = namespaceEndpoint;

  abstract uploadFromBase64: (
    parameters: {
      data: string;
      issuecode: string;
    },
    callback: (
      value: Errorable<
        {
          fileName: string;
        },
        "Generic error"
      >,
    ) => void,
  ) => void;
}
