import { Handler } from "express";

import { PrismaClient } from "~prisma_clients/client_dm";

const prisma = new PrismaClient();
export const get: Handler = async (req, res) => {
  res.writeHead(200);
  res.end(
    JSON.stringify(
      (
        await prisma.purchase.findMany({
          where: {
            userId: req.user.id,
          },
        })
      ).map((purchase) => ({
        ...purchase,
        date: purchase.date.toISOString().split("T")[0],
      }))
    )
  );
};
