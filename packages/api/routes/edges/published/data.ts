import { prismaDm } from "prisma-clients";
import { edge } from "prisma-clients/client_dm";

import { ExpressCall } from "~routes/_express-call";

export const get = async (
  ...[, res]: ExpressCall<{
    resBody: Pick<edge, "publicationcode" | "issuenumber">[];
  }>
) =>
  res.json(
    await prismaDm.edge.findMany({
      select: { publicationcode: true, issuenumber: true },
    })
  );
