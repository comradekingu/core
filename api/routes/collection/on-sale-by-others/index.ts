import { Handler } from "express";

import { issue, PrismaClient } from "~prisma_clients/client_dm";

const prisma = new PrismaClient();

export const get: Handler = async (req, res) => {
  const forSale = await prisma.$queryRaw<
    {
      id: number;
    }[]
  >`
      SELECT issue.ID AS id
      FROM numeros issue
               LEFT JOIN users_options ON Option_valeur IN (CONCAT(issue.Pays, '/', issue.Magazine),
                                                             CONCAT(issue.Pays, '/', issue.Magazine, ' ', issue.Numero))
      LEFT JOIN numeros_demandes requested_issue ON issue.ID = requested_issue.ID_Numero
      WHERE (users_options.Option_nom = 'sales_notification_publications' OR requested_issue.ID IS NOT NULL)
        AND AV = 1
        AND ID_Utilisateur != ${req.user.id}
        AND NOT EXISTS
          (SELECT 1
           FROM numeros user_collection
           WHERE user_collection.Pays = issue.Pays
             AND user_collection.Magazine = issue.Magazine
             AND user_collection.Numero = issue.Numero
             AND user_collection.ID_Utilisateur = ${req.user.id}
          )`;

  res.writeHead(200);
  res.end(
    JSON.stringify(
      (
        (await prisma.issue.findMany({
          where: { id: { in: forSale.map(({ id }) => id) } },
        })) as issue[]
      ).reduce(
        (acc, issue) => ({
          ...acc,
          [`${issue.country}/${issue.magazine}`]: [
            ...(acc[`${issue.country}/${issue.magazine}`] || []),
            issue,
          ],
        }),
        {} as { [key: string]: issue[] }
      )
    )
  );
};
