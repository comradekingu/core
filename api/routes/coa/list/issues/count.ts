import { PrismaClient } from "~prisma_clients/client_coa";
import { ExpressCall } from "~routes/_express-call";

const prisma = new PrismaClient();

export const get = async (
  ...[, res]: ExpressCall<{ [_publicationcode: string]: number }>
) =>
  res.json(
    (
      await prisma.inducks_issue.groupBy({
        _count: {
          issuenumber: true,
        },
        by: ["publicationcode"],
      })
    ).reduce(
      (acc, { publicationcode, _count }) => ({
        ...acc,
        [publicationcode!]: _count.issuenumber,
      }),
      {} as { [publicationcode: string]: number }
    )
  );
