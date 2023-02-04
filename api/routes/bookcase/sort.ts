import bodyParser from "body-parser";

import { PrismaClient } from "~prisma_clients/client_dm";
import { authenticateToken } from "~routes/_auth";
import { ExpressCall } from "~routes/_express-call";

const prisma = new PrismaClient();
const parseForm = bodyParser.json();

export const post = [
  authenticateToken,
  parseForm,
  async (
    ...[req, res]: ExpressCall<
      { max: number } | undefined,
      undefined,
      { sorts: string[] }
    >
  ) => {
    const sorts = req.body.sorts;
    if (sorts.length) {
      const userId = req.user!.id;
      await prisma.bookcasePublicationOrder.deleteMany({
        where: { userId: userId },
      });
      let order = 0;
      const insertOperations = sorts.map((publicationcode: string) =>
        prisma.bookcasePublicationOrder.create({
          data: {
            publicationcode,
            order: order++,
            userId,
          },
        })
      );
      await prisma.$transaction(insertOperations);

      return res.json({ max: order - 1 });
    }
    res.statusCode = 400;
    res.end();
  },
];
