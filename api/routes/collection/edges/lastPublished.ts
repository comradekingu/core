import { Handler } from "express";

import { PrismaClient } from "../../../prisma/generated/client_dm";

const prisma = new PrismaClient();
export const get: Handler = async (req, res) => {
  const userId = req.user.id;
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const userIssues = (
    await prisma.issue.findMany({
      where: {
        userId,
      },
      select: {
        issuecode: true,
      },
    })
  ).map(({ issuecode }) => issuecode) as string[];
  res.writeHead(200);
  res.end(
    JSON.stringify(
      await prisma.edge.findMany({
        where: {
          creationDate: {
            gt: threeMonthsAgo,
          },
          issuecode: {
            in: userIssues,
          },
        },
        take: 5,
      })
    )
  );
};
