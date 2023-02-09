import { PrismaClient } from "~prisma_clients/client_dm";

import { computeTimestamp } from "./dm.edge.timestamp";
import { computePublicationcode } from "./dm.publicationcode";

export default new PrismaClient().$extends({
  result: {
    issue: computePublicationcode,
    subscription: computePublicationcode,
    edge: computeTimestamp,
  },
});
