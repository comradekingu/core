import bodyParser from "body-parser";
import { Handler, Response } from "express";

import { PrismaClient } from "~prisma_clients/client_dm";
import { authenticateToken } from "~routes/_auth";

const prisma = new PrismaClient();
const parseForm = bodyParser.json();

export type postType = { max: number } | void;
export const post = [
  authenticateToken,
  parseForm,
  (async (req, res: Response<postType>) => {
    const sorts = req.body.sorts;
    if (sorts.length) {
      const userId = req.user.id;
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
  }) as Handler,
];
