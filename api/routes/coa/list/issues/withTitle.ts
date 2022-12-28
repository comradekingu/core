import { Handler, Response } from "express";

import { PrismaClient } from "~prisma_clients/client_coa";

const prisma = new PrismaClient();

export type getType = {
  issuenumber: string;
  title: string | null;
}[];
export const get: Handler = async (req, res: Response<getType>) => {
  const { publicationcode } = req.query as { [key: string]: string };
  if (!publicationcode) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end();
    return;
  }
  const data = await prisma.inducks_issue.findMany({
    select: {
      issuenumber: true,
      title: true,
    },
    where: {
      publicationcode,
    },
  });
  return res.json(
    data.map(({ issuenumber, title }) => ({
      issuenumber: issuenumber!.replace(/ +/g, " "),
      title,
    }))
  );
};
