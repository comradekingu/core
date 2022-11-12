import { Handler } from "express";

import { PrismaClient } from "~/dist/prisma/client_dm";

const prisma = new PrismaClient();

export const get: Handler = async (req, res) => {
  const as = req.params.as;
  if (!["buyer", "seller"].includes(as)) {
    res.writeHead(400);
    res.end();
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    switch (as) {
      case "seller":
        const requestedIssuesOnSaleIds = (await prisma.$queryRaw`
            SELECT requestedIssue.ID AS id
            FROM numeros_demandes requestedIssue
                     INNER JOIN numeros issue ON requestedIssue.ID_Numero = issue.ID
            WHERE issue.ID_Utilisateur = ${req.user.id}
        `) as { id: number }[];
        res.end(
          JSON.stringify(
            await prisma.requestedIssue.findMany({
              where: {
                id: { in: requestedIssuesOnSaleIds.map(({ id }) => id) },
              },
            })
          )
        );
        break;
      case "buyer":
        res.end(
          JSON.stringify(
            await prisma.requestedIssue.findMany({
              where: {
                buyerId: req.user.id,
              },
            })
          )
        );
    }
  }
};
