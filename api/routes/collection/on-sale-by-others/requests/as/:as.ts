import { PrismaClient, requestedIssue } from "~prisma_clients/client_dm";
import { ExpressCall } from "~routes/_express-call";

const prisma = new PrismaClient();

export const get = async (
  ...[req, res]: ExpressCall<requestedIssue[], { as: string }>
) => {
  const as = req.params.as;
  if (!["buyer", "seller"].includes(as)) {
    res.writeHead(400);
    res.end();
  } else {
    switch (as) {
      case "seller":
        const requestedIssuesOnSaleIds = (await prisma.$queryRaw`
            SELECT requestedIssue.ID AS id
            FROM numeros_demandes requestedIssue
            INNER JOIN numeros issue ON requestedIssue.ID_Numero = issue.ID
            WHERE issue.ID_Utilisateur = ${req.user!.id}
        `) as { id: number }[];
        return res.json(
          await prisma.requestedIssue.findMany({
            where: {
              id: { in: requestedIssuesOnSaleIds.map(({ id }) => id) },
            },
          })
        );
      case "buyer":
        return res.json(
          await prisma.requestedIssue.findMany({
            where: {
              buyerId: req.user!.id,
            },
          })
        );
    }
  }
};
